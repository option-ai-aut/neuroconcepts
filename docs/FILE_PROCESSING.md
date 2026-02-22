# Datei-Verarbeitung in Mivo

## Übersicht

Mivo kann **alle gängigen Dateiformate** direkt im Chat verarbeiten. Die Verarbeitung erfolgt **server-seitig** im Orchestrator — der Text/Inhalt wird extrahiert und als Kontext an das LLM übergeben. So kann Mivo Dokumente lesen, analysieren, Daten importieren und auf Bilder reagieren.

---

## Unterstützte Formate

| Format | Erweiterung | Parser | Verwendung |
|--------|-------------|--------|------------|
| Word | `.docx` | `mammoth` | Verträge, Exposés, Berichte lesen |
| Excel | `.xlsx`, `.xls` | `SheetJS (xlsx)` | Leads/Objekte massenimportieren |
| CSV | `.csv` | `SheetJS (xlsx)` | Tabellen importieren |
| PDF | `.pdf` | `pdf-parse` | Verträge, Dokumente lesen |
| PowerPoint | `.pptx` | `jszip` + XML | Präsentationen lesen |
| Text | `.txt` | native UTF-8 | Plain-text lesen |
| JSON | `.json` | native JSON.parse | Strukturierte Daten lesen |
| Bilder | `.jpg`, `.png`, `.gif`, `.webp` | OpenAI Vision | Fotos analysieren, Virtual Staging |

> **`.xls` (altes Excel-Format)** wird ebenfalls unterstützt — SheetJS wandelt es automatisch um.

---

## Wie es funktioniert

### 1. Upload → Server-seitiges Parsing

```
User lädt Datei hoch
       ↓
Orchestrator empfängt Datei als Buffer
       ↓
Parser extrahiert Text/Struktur (mammoth / xlsx / pdf-parse / jszip)
       ↓
Inhalt wird als [DOKUMENT "..." — INHALT: ...] in den Message-Kontext eingebettet
       ↓
Mivo (GPT-5) liest den Inhalt und antwortet
```

### 2. Intelligentes Routing (AgentRouter)

Der AgentRouter erkennt automatisch die Intention:

| Datei + Nachricht | Routing | Verhalten |
|---|---|---|
| `.xlsx` + "importiere alle Leads" | `crm` | CRM-Tools aktiv, Mivo legt Zeile für Zeile an |
| `.docx` + "fass das zusammen" | `smalltalk` | Kein Tool-Call, Mivo antwortet direkt aus Kontext |
| `.pdf` + "erstelle einen Lead daraus" | `crm` | CRM-Tools aktiv |
| Bild + "möbliere das" | `expose/crm` | Virtual Staging Tool |

### 3. Bilder: Vision-Input

Hochgeladene Bilder werden als echte **OpenAI Vision-Inputs** (image_url content blocks) an GPT-5 gesendet — Mivo kann das Bild wirklich *sehen*, nicht nur die URL kennen.

### 4. Persistenz über mehrere Nachrichten

Bild-URLs und Dateiinhalte werden in der Chat-History gespeichert. Mivo kann also 2 Nachrichten später noch auf ein zuvor hochgeladenes Bild oder Dokument referenzieren:

```
User: [lädt Foto hoch] Hier ein Foto der Wohnung
Mivo: Ich sehe ein modernes Wohnzimmer mit Parkettboden...

User: (2 Nachrichten später) Mach daraus ein Virtual Staging
Mivo: [virtual_staging mit URL aus History] → zeigt Ergebnis
```

---

## Limits & Performance

| Parameter | Wert |
|-----------|------|
| Max. Dateien pro Upload | 10 |
| Dokument-Inhalt Cap | 8.000 Zeichen |
| Tabellen-Inhalt Cap | 40.000 Zeichen (≈500 Zeilen) |
| Max. Excel-Zeilen pro Batch | 500 (danach wird gekürzt + Hinweis) |

> Bei sehr großen Excel-Dateien fragt Mivo vor dem Import nach Bestätigung (>50 Einträge).

---

## Massen-Import (Excel/CSV)

### Workflow

```
User: [lädt Objektliste.xlsx hoch]
      Importiere alle Objekte

Mivo: Tabelle "Objektliste.xlsx" gelesen: 45 Zeilen
        Lege Objekt 1/45 an: Friedrichstraße 1, Wien, 450.000€ ✓
        Lege Objekt 2/45 an: Maximilianstraße 8, München, 890.000€ ✓
        ...
        ✅ 43 Objekte angelegt, 2 übersprungen (fehlende Pflichtfelder)
```

### Empfohlene Spaltenbezeichnungen

**Leads:**
| Spalte | Feld |
|--------|------|
| email / E-Mail | email (Pflicht) |
| vorname / firstName | firstName |
| nachname / lastName | lastName |
| telefon / phone | phone |
| status | status (NEW/CONTACTED/etc.) |

**Objekte/Properties:**
| Spalte | Feld |
|--------|------|
| titel / title | title (Pflicht) |
| adresse / address | address |
| preis / price | price |
| zimmer / rooms | rooms |
| fläche / area | livingArea |
| stadt / city | city |

> Mivo erkennt auch abweichende Spaltenbezeichnungen (z.B. "Wohnfläche" → livingArea) durch das LLM-Mapping.

---

## Dokument-Analyse

### Verträge, Berichte, Exposés

```
User: [lädt Mietvertrag.pdf hoch]
      Extrahiere alle relevanten Daten

Mivo: Vertrag analysiert:
        - Mieter: Max Mustermann (max@test.de)
        - Objekt: Friedrichstraße 123, 1010 Wien
        - Miete: 1.200€ kalt
        - Laufzeit: 01.03.2026 – 28.02.2028

        Soll ich Lead und Property anlegen?
```

### PowerPoint-Präsentationen

```
User: [lädt Objektpräsentation.pptx hoch]
      Was steht auf den Folien?

Mivo: Folie 1: Luxuswohnung Wien-Innere Stadt
        Folie 2: 3 Zimmer, 95m², Baujahr 1910 saniert...
        Folie 3: Preis: 1.200.000 €
```

---

## Technische Details

### Parser-Bibliotheken

| Bibliothek | Version | Einsatz |
|---|---|---|
| `mammoth` | latest | `.docx` Text-Extraktion |
| `xlsx` (SheetJS) | latest | `.xlsx/.xls/.csv` |
| `pdf-parse` | latest | `.pdf` Text-Extraktion |
| `jszip` | (bereits im Projekt) | `.pptx` ZIP-Parsing + XML |

> **Lambda-Hinweis:** `xlsx`, `pdf-parse` und `sharp` werden **lazy geladen** (erst bei Bedarf per `require()`) um `DOMMatrix is not defined`- und native-Binary-Crashes auf Lambda-Startup zu vermeiden. `xlsx`, `mammoth`, `pdf-parse`, `jszip` und `sharp` sind in `externalModules` der CDK-Bundling-Config eingetragen und werden separat in `afterBundling` installiert.

### Speicherung

Hochgeladene Dateien werden in S3 gespeichert:
```
s3://[media-bucket]/chat-uploads/{tenantId}/{userId}/{timestamp}-{random}.{ext}
```

Der extrahierte Text wird **nicht** persistent gespeichert — er existiert nur im Message-Kontext der aktuellen Anfrage + in der Chat-History (als Teil der gespeicherten User-Nachricht).
