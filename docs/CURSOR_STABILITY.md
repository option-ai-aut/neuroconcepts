# Cursor IDE — Stabilitäts-Konfiguration

## Problem

Cursor (Electron-basiert) stürzt wiederholt ab mit `Code 5` (renderer process crashed).

**Drei Ursachen identifiziert:**

1. `OTLPExporterError: Bad Request` — OpenTelemetry SDK flutet den Extension Host
2. **Renderer-Prozess Memory Explosion** — Renderer wächst auf 1.8+ GB RAM, macOS killt den Prozess
3. **Extension Host Node-Prozess V8 OOM** — AI-Agent-Operationen verursachen rapide Speicher-Allokationen in den Extension Host Child-Prozessen (node), die ohne explizites `--max-old-space-size` das Standard-Limit erreichen und mit `SIGABRT` / `FatalProcessOutOfMemory` crashen

> **Ursache #3 war der Hauptgrund für 11+ Crashes an einem Tag.** Die `argv.json`-Flags betreffen NUR den Electron-Hauptprozess/Renderer, NICHT die Extension Host Node-Prozesse.

## Lösung (Stand: Februar 2026, Cursor 2.4.31)

### 1. Node Binary Wrapper + Extension Host Patch (KRITISCH!)

> **`NODE_OPTIONS` funktioniert NICHT!** Electron strippt die Variable aus Child-Prozessen. Die einzige zuverlässige Lösung sind direkte Patches im App-Bundle.

#### a) Node Binary Wrapper (für standalone node-Prozesse)

Die Node-Binary bei `Contents/Resources/app/resources/helpers/node` wird durch einen Wrapper ersetzt:

```bash
# Original sichern
cp "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node" \
   "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node.real"

# Wrapper erstellen
cat > "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node" << 'WRAPPER'
#!/bin/sh
exec "$(dirname "$0")/node.real" --max-old-space-size=8192 "$@"
WRAPPER

chmod +x "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node"
```

**Verifizieren:**

```bash
"/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node" -e \
  "console.log('Heap:', Math.round(require('v8').getHeapStatistics().heap_size_limit/1024/1024), 'MB')"
# Erwartete Ausgabe: Heap: 8240 MB
```

#### b) Extension Host execArgv Patch (für Electron Helper Prozesse)

In `workbench.desktop.main.js` wird `--max-old-space-size=8192` zu den Extension Host execArgv hinzugefügt:

```bash
WORKBENCH="/Applications/Cursor.app/Contents/Resources/app/out/vs/workbench/workbench.desktop.main.js"

sed -i '' 's/s.execArgv.unshift("--dns-result-order=ipv4first","--experimental-network-inspection")/s.execArgv.unshift("--max-old-space-size=8192","--dns-result-order=ipv4first","--experimental-network-inspection")/' "$WORKBENCH"
```

**Verifizieren:**

```bash
grep -o 'max-old-space-size=8192.*experimental-network-inspection' "$WORKBENCH" | head -1
```

### 2. Cursor argv.json (Renderer Memory-Begrenzung)

**Datei:** `~/Library/Application Support/Cursor/argv.json`

```json
{
    "disable-hardware-acceleration": true,
    "js-flags": "--max-old-space-size=2048 --optimize-for-size --gc-interval=100",
    "disable-gpu-compositing": true
}
```

| Flag | Betrifft | Beschreibung |
|------|----------|-------------|
| `disable-hardware-acceleration` | Electron | Verhindert GPU-bezogene Crashes |
| `max-old-space-size=2048` | **NUR Renderer** | Begrenzt Renderer V8 Heap auf 2 GB |
| `optimize-for-size` | **NUR Renderer** | V8 optimiert für weniger Speicherverbrauch |
| `gc-interval=100` | **NUR Renderer** | GC läuft häufiger |
| `disable-gpu-compositing` | Electron | Deaktiviert GPU-Compositing |

> **Wichtig:** `argv.json js-flags` betreffen NUR den Electron-Prozess (Renderer). Extension Host Node-Prozesse werden davon NICHT beeinflusst! Dafür braucht man `NODE_OPTIONS`.

### 3. Cursor settings.json (Memory-Reduktion)

**Datei:** `~/Library/Application Support/Cursor/User/settings.json`

Schlüssel-Settings zur Memory-Reduktion:

| Setting | Spart | Beschreibung |
|---------|-------|-------------|
| `typescript.tsserver.maxTsServerMemory: 1024` | ~500 MB | tsserver auf 1024 MB begrenzt |
| `typescript.disableAutomaticTypeAcquisition: true` | ~50-100 MB | Keine automatischen @types Downloads |
| `editor.minimap.enabled: false` | ~50-100 MB | Minimap rendert gesamte Datei als Bild |
| `editor.semanticHighlighting.enabled: false` | ~30-80 MB | Spart Language Server Kommunikation |
| `editor.codeLens: false` | ~20-50 MB | Keine Code-Annotationen |
| `editor.folding: false` | ~10-20 MB | Kein Code-Folding |
| `editor.stickyScroll.enabled: false` | ~10-20 MB | Kein Sticky Scroll |
| `workbench.editor.limit.value: 5` | ~50-200 MB | Max 5 Tabs offen |
| `files.exclude` | ~30-50 MB | node_modules, .next, cdk.out unsichtbar |
| `git.decorations.enabled: false` | ~10-30 MB | Keine Git-Dekorationen |

### 4. OTEL-Umgebungsvariablen

Deaktivieren das OpenTelemetry SDK komplett (verhindert `OTLPExporterError`):

```bash
launchctl setenv OTEL_SDK_DISABLED true
launchctl setenv OTEL_TRACES_EXPORTER none
launchctl setenv OTEL_METRICS_EXPORTER none
launchctl setenv OTEL_LOGS_EXPORTER none
launchctl setenv OTEL_EXPORTER_OTLP_ENDPOINT "http://localhost:1"
```

### 5. OTEL-Transport direkt neutralisieren

Die `sendWithHttp`-Funktion in der Cursor-App direkt gepatcht (3 Build-Varianten):

```
/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js
/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/esm/transport/http-transport-utils.js
/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/esnext/transport/http-transport-utils.js
```

## Diagnose

### Crash-Typ identifizieren

```bash
# macOS Diagnostic Reports — zeigt OOM-Crashes in node-Prozessen
python3 -c "
import json, glob
for f in sorted(glob.glob('/Users/dennis/Library/Logs/DiagnosticReports/node-*.ips'), reverse=True)[:5]:
    with open(f) as fh:
        fh.readline()
        body = json.loads(fh.read())
        frames = body.get('threads', [{}])[0].get('frames', [])
        oom = any('OOM' in fr.get('symbol','') or 'OutOfMemory' in fr.get('symbol','') for fr in frames[:6])
        print(f\"{f.split('/')[-1]:40s} Parent: {body.get('parentProc','?'):30s} OOM: {oom}\")
"
```

### Cursor-Logs prüfen

```bash
# Main-Log auf Crashes prüfen
tail -50 ~/Library/Application\ Support/Cursor/logs/$(ls -t ~/Library/Application\ Support/Cursor/logs/ | head -1)/main.log | grep -i "crash\|error\|code 5"
```

### Memory-Verbrauch prüfen

```bash
# Alle Cursor-Prozesse mit Memory
ps aux | grep -i "[C]ursor" | awk '{printf "%6s MB  %5.1f%%CPU  %s\n", int($6/1024), $4, $11}' | sort -rn | head -10

# Extension Host spezifisch
ps -eo pid,rss,command | grep "[C]ursor.*extension-host"
```

### Verify NODE_OPTIONS

```bash
# Prüfen ob NODE_OPTIONS gesetzt ist
launchctl getenv NODE_OPTIONS
# Erwartete Ausgabe: --max-old-space-size=4096
```

### Cache zurücksetzen

```bash
rm -rf ~/Library/Application\ Support/Cursor/GPUCache/
rm -rf ~/Library/Application\ Support/Cursor/Cache/
rm -rf ~/Library/Application\ Support/Cursor/CachedData/
rm -rf ~/Library/Application\ Support/Cursor/Code\ Cache/
```

## Nach Cursor-Update

1. `argv.json` prüfen und ggf. erneut setzen
2. OTEL-Patches prüfen: `grep -l "PATCHED" "/Applications/Cursor.app/Contents/Resources/app/node_modules/@opentelemetry/otlp-exporter-base/build/src/transport/http-transport-utils.js"`
3. `NODE_OPTIONS` in `~/.zshenv` bleibt bestehen (kein Update-Problem)
4. Launch Agent bleibt bestehen (kein Update-Problem)

## Zusammenfassung der Prozess-Architektur

```
Cursor (Electron Main Process)
├── Renderer (argv.json js-flags → max-old-space-size=2048)
├── Cursor Helper (Plugin) — Extension Host
│   ├── node (AI Agent Tools) ← NODE_OPTIONS=--max-old-space-size=4096
│   ├── node (TypeScript LSP) ← NODE_OPTIONS + tsserver.maxTsServerMemory
│   ├── node (CSS LSP)
│   ├── node (JSON LSP)
│   └── node (Git Worker)
└── Cursor Helper (GPU, etc.)
```
