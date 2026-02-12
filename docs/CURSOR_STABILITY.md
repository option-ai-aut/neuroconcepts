# Cursor IDE — Stabilitäts-Konfiguration

## Problem

Cursor (Electron-basiert) stürzt wiederholt ab mit `Code 5` (renderer process crashed). Ursache sind `OTLPExporterError: Bad Request`-Fehler aus dem internen OpenTelemetry SDK, die den Extension Host fluten und den Renderer-Prozess zum Absturz bringen.

## Lösung (Stand: Februar 2026, Cursor 2.4.31)

### 1. OTEL-Umgebungsvariablen (wichtigster Fix)

Fünf Umgebungsvariablen deaktivieren das OpenTelemetry SDK und alle Exporter komplett:

```bash
launchctl setenv OTEL_SDK_DISABLED true
launchctl setenv OTEL_TRACES_EXPORTER none
launchctl setenv OTEL_METRICS_EXPORTER none
launchctl setenv OTEL_LOGS_EXPORTER none
launchctl setenv OTEL_EXPORTER_OTLP_ENDPOINT "http://localhost:1"
```

Diese sind über einen **macOS Launch Agent** persistent gesetzt:

**Datei:** `~/Library/LaunchAgents/com.cursor.env.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cursor.env</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/sh</string>
        <string>-c</string>
        <string>launchctl setenv OTEL_SDK_DISABLED true; launchctl setenv OTEL_TRACES_EXPORTER none; launchctl setenv OTEL_METRICS_EXPORTER none; launchctl setenv OTEL_LOGS_EXPORTER none; launchctl setenv OTEL_EXPORTER_OTLP_ENDPOINT http://localhost:1</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

Laden/Neuladen:

```bash
launchctl unload ~/Library/LaunchAgents/com.cursor.env.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.cursor.env.plist
```

### 2. Cursor argv.json

**Datei:** `~/Library/Application Support/Cursor/argv.json`

```json
{
    "disable-hardware-acceleration": true,
    "js-flags": "--max-old-space-size=4096"
}
```

- `disable-hardware-acceleration` — Verhindert GPU-bezogene Crashes
- `max-old-space-size=4096` — Gibt dem Electron-Prozess mehr Heap-Speicher

### 3. Cursor settings.json

**Datei:** `~/Library/Application Support/Cursor/User/settings.json`

Relevante Einstellungen:

```json
{
    "telemetry.telemetryLevel": "off",
    "gpu_compositing": "disabled",
    "cursor.general.disableHttp2": true,
    "files.watcherExclude": {
        "**/node_modules/**": true,
        "**/.git/objects/**": true,
        "**/.git/subtree-cache/**": true,
        "**/dist/**": true,
        "**/.next/**": true,
        "**/cdk.out/**": true
    },
    "search.exclude": {
        "**/node_modules": true,
        "**/dist": true,
        "**/.next": true,
        "**/cdk.out": true,
        "**/package-lock.json": true
    },
    "typescript.tsserver.maxTsServerMemory": 2048
}
```

### 4. Launcher-Script (Garantie-Variante)

Falls die `launchctl`-Variablen nicht bis zum Extension Host durchkommen, kann Cursor direkt mit den Variablen gestartet werden:

**Datei:** `~/launch-cursor.sh`

```bash
#!/bin/bash
export OTEL_SDK_DISABLED=true
export OTEL_TRACES_EXPORTER=none
export OTEL_METRICS_EXPORTER=none
export OTEL_LOGS_EXPORTER=none
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:1"

/Applications/Cursor.app/Contents/MacOS/Cursor "$@" &
disown
```

Ausführbar machen: `chmod +x ~/launch-cursor.sh`

## Diagnose

### Crash-Logs prüfen

```bash
# Neueste Log-Session finden
ls -lt ~/Library/Application\ Support/Cursor/logs/ | head -5

# Main-Log auf Crashes prüfen
tail -50 ~/Library/Application\ Support/Cursor/logs/<SESSION>/main.log

# Renderer-Log auf OTEL-Fehler prüfen
cat ~/Library/Application\ Support/Cursor/logs/<SESSION>/window*/renderer.log

# Extension-Host-Log
tail -50 ~/Library/Application\ Support/Cursor/logs/<SESSION>/window*/exthost/exthost.log
```

### Umgebungsvariablen verifizieren

```bash
launchctl getenv OTEL_SDK_DISABLED          # → true
launchctl getenv OTEL_TRACES_EXPORTER       # → none
launchctl getenv OTEL_METRICS_EXPORTER      # → none
launchctl getenv OTEL_LOGS_EXPORTER         # → none
launchctl getenv OTEL_EXPORTER_OTLP_ENDPOINT # → http://localhost:1
```

### Cache zurücksetzen (bei Bedarf)

```bash
rm -rf ~/Library/Application\ Support/Cursor/GPUCache/
rm -rf ~/Library/Application\ Support/Cursor/Cache/
rm -rf ~/Library/Application\ Support/Cursor/CachedData/
```

## 5. OTEL-Transport direkt neutralisieren (effektivster Fix)

Da die Umgebungsvariablen vom Extension Host nicht zuverlässig geerbt werden, wurde die `sendWithHttp`-Funktion in der Cursor-App direkt gepatcht. Alle 3 Build-Varianten:

```
/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js
/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/esm/transport/http-transport-utils.js
/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/esnext/transport/http-transport-utils.js
```

Die Funktion `sendWithHttp` wurde durch einen No-Op ersetzt:

```js
function sendWithHttp(request, url, headers, compression, userAgent, agent, data, onDone, timeoutMillis) {
    // PATCHED: Silently succeed without sending telemetry (prevents OTLPExporterError crashes)
    onDone({ status: 'success', data: Buffer.from('') });
}
```

Ein Backup der Originaldatei liegt unter:
```
.../http-transport-utils.js.backup
```

### Nach einem Cursor-Update erneut patchen

```bash
# Prüfen ob Patch noch aktiv ist
grep -l "PATCHED" "/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js"

# Falls nicht: alle 3 Dateien erneut patchen (gleicher Inhalt)
for f in src esm esnext; do
  FILE="/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/$f/transport/http-transport-utils.js"
  # Nur die sendWithHttp-Funktion ersetzen
done
```

## Hinweise

- Die `launchctl setenv`-Variablen gelten systemweit für alle GUI-Apps. `OTEL_*`-Variablen sind aber nur für OpenTelemetry-SDKs relevant und haben keine Auswirkung auf andere Apps.
- Nach einem macOS-Neustart werden die Variablen automatisch vom Launch Agent gesetzt.
- Bei einem **Cursor-Update** werden `argv.json` und die OTEL-Patches überschrieben — erneut anwenden!
- Der OTEL-Patch (Punkt 5) ist der zuverlässigste Fix, da er direkt an der Fehlerquelle ansetzt.
