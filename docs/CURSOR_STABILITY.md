# Cursor IDE — Stabilitäts-Konfiguration

## Problem

Cursor (Electron-basiert) stürzt wiederholt ab mit `Code 5` (renderer process crashed).

**Zwei Ursachen identifiziert:**

1. `OTLPExporterError: Bad Request` — OpenTelemetry SDK flutet den Extension Host
2. **Renderer-Prozess Memory Explosion** — Renderer wächst auf 1.8+ GB RAM bei 139% CPU, macOS killt den Prozess (jetsam/OOM)

## Lösung (Stand: Februar 2026, Cursor 2.4.31)

### 1. OTEL-Umgebungsvariablen

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

### 2. Cursor argv.json (Memory-Begrenzung — kritisch!)

**Datei:** `~/Library/Application Support/Cursor/argv.json`

```json
{
    "disable-hardware-acceleration": true,
    "js-flags": "--max-old-space-size=2048 --optimize-for-size --gc-interval=100",
    "disable-gpu-compositing": true
}
```

| Flag | Beschreibung |
|------|-------------|
| `disable-hardware-acceleration` | Verhindert GPU-bezogene Crashes |
| `max-old-space-size=2048` | **Begrenzt V8 Heap auf 2 GB** (vorher 4096 — erlaubte unkontrolliertes Wachstum bis zum Crash!) |
| `optimize-for-size` | V8 optimiert für weniger Speicherverbrauch statt Geschwindigkeit |
| `gc-interval=100` | Garbage Collector läuft häufiger (alle 100 Allokationen) |
| `disable-gpu-compositing` | Deaktiviert GPU-basiertes Compositing komplett |

> **Wichtig:** `max-old-space-size=4096` war die FALSCHE Einstellung — sie ließ den Renderer auf 1.8+ GB wachsen bis macOS ihn killte. Der Wert 2048 erzwingt früheres GC.

### 3. Cursor settings.json (Memory-Reduktion)

**Datei:** `~/Library/Application Support/Cursor/User/settings.json`

```json
{
    "window.commandCenter": true,
    "telemetry.telemetryLevel": "off",
    "gpu_compositing": "disabled",
    "cursor.general.disableHttp2": true,

    "files.watcherExclude": {
        "**/node_modules/**": true,
        "**/.git/objects/**": true,
        "**/.git/subtree-cache/**": true,
        "**/.git/lfs/**": true,
        "**/dist/**": true,
        "**/.next/**": true,
        "**/cdk.out/**": true,
        "**/package-lock.json": true,
        "**/.prisma/**": true,
        "**/infra/cdk.out/**": true
    },
    "files.maxMemoryForLargeFilesMB": 128,
    "search.exclude": {
        "**/node_modules": true,
        "**/dist": true,
        "**/.next": true,
        "**/cdk.out": true,
        "**/package-lock.json": true
    },

    "extensions.autoUpdate": false,
    "git.autorefresh": false,
    "git.autofetch": false,
    "update.mode": "manual",

    "typescript.tsserver.maxTsServerMemory": 1536,

    "editor.minimap.enabled": false,
    "editor.bracketPairColorization.enabled": false,
    "editor.semanticHighlighting.enabled": false,
    "editor.suggest.preview": false,
    "editor.hover.delay": 500,
    "editor.quickSuggestions": { "other": false, "comments": false, "strings": false },
    "editor.parameterHints.enabled": false,
    "editor.codeLens": false,
    "editor.occurrencesHighlight": "off",
    "editor.renderWhitespace": "none",
    "editor.cursorBlinking": "solid",
    "editor.smoothScrolling": false,
    "editor.cursorSmoothCaretAnimation": "off",

    "workbench.editor.limit.enabled": true,
    "workbench.editor.limit.value": 5,
    "workbench.editor.enablePreview": true,
    "workbench.list.smoothScrolling": false,
    "workbench.tree.renderIndentGuides": "none",

    "terminal.integrated.gpuAcceleration": "off",
    "terminal.integrated.scrollback": 500,

    "debug.console.wordWrap": false
}
```

**Memory-Reduktions-Einstellungen im Detail:**

| Setting | Spart | Beschreibung |
|---------|-------|-------------|
| `editor.minimap.enabled: false` | ~50-100 MB | Minimap rendert gesamte Datei als Bild |
| `editor.semanticHighlighting.enabled: false` | ~30-80 MB | Spart Language Server Kommunikation |
| `editor.bracketPairColorization.enabled: false` | ~10-20 MB | Spart AST-Parsing |
| `editor.codeLens: false` | ~20-50 MB | Keine Code-Annotationen über Funktionen |
| `editor.quickSuggestions: false` | ~30-50 MB | Keine Live-Autocomplete |
| `workbench.editor.limit.value: 5` | ~50-200 MB | Max 5 Tabs offen (jeder Tab = Renderer-Memory) |
| `terminal.integrated.scrollback: 500` | ~10-30 MB | Weniger Terminal-Buffer |
| `typescript.tsserver.maxTsServerMemory: 1536` | ~500 MB | tsserver von 2048 auf 1536 MB begrenzt |

### 4. Launcher-Script (Garantie-Variante)

Falls die `launchctl`-Variablen nicht bis zum Extension Host durchkommen:

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

### 5. OTEL-Transport direkt neutralisieren

Die `sendWithHttp`-Funktion in der Cursor-App direkt gepatcht. Alle 3 Build-Varianten:

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

### Nach einem Cursor-Update erneut patchen

```bash
# Prüfen ob Patch noch aktiv ist
grep -l "PATCHED" "/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js"
```

## Diagnose

### Crash-Logs prüfen

```bash
# Neueste Log-Session finden
ls -lt ~/Library/Application\ Support/Cursor/logs/ | head -5

# Main-Log auf Crashes prüfen
tail -50 ~/Library/Application\ Support/Cursor/logs/<SESSION>/main.log

# Renderer-Log
cat ~/Library/Application\ Support/Cursor/logs/<SESSION>/window*/renderer.log
```

### Memory-Verbrauch der Cursor-Prozesse prüfen

```bash
# Alle Cursor-Prozesse mit Memory-Verbrauch anzeigen
ps aux | grep -i "[C]ursor" | awk '{printf "%6s MB  %s\n", int($6/1024), $11}'

# WARNUNG wenn Renderer > 1 GB: Cursor neustarten!
```

### Cache zurücksetzen

```bash
rm -rf ~/Library/Application\ Support/Cursor/GPUCache/
rm -rf ~/Library/Application\ Support/Cursor/Cache/
rm -rf ~/Library/Application\ Support/Cursor/CachedData/
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache/
rm -rf ~/Library/Application\ Support/Cursor/blob_storage/
```

## Hinweise

- `max-old-space-size=4096` war **kontraproduktiv** — es erlaubte dem Renderer auf 1.8+ GB zu wachsen. Der Wert 2048 mit `--optimize-for-size` erzwingt aggressiveres GC.
- Die `launchctl setenv`-Variablen gelten systemweit. `OTEL_*`-Variablen betreffen nur OpenTelemetry.
- Nach einem macOS-Neustart setzt der Launch Agent die Variablen automatisch.
- Bei einem **Cursor-Update** werden `argv.json` und OTEL-Patches überschrieben — erneut anwenden!
- **Max 5 offene Tabs** ist der effektivste einzelne Memory-Fix (jeder Tab belegt 50-200 MB im Renderer).
