# Datei-Import für Leads & Properties

## Übersicht

Jarvis kann **alle gängigen Dateiformate** nativ verarbeiten - keine speziellen Import-Tools nötig! Perfekt für Onboarding neuer Kunden, die von anderen Systemen migrieren.

## Unterstützte Formate

- 📄 **CSV** - Komma-getrennte Werte
- 📊 **Excel (.xlsx)** - Microsoft Excel
- 📄 **PDF** - Extrahiert Text und Tabellen
- 📄 **Word (.docx)** - Microsoft Word
- 🖼️ **Bilder** (JPG, PNG) - Analysiert Immobilienfotos
- 📄 **Text, JSON, XML** - Strukturierte Daten

## Wie es funktioniert

### 1. User kopiert CSV-Inhalt in den Chat

```
User: Ich habe hier eine CSV mit meinen Leads:

email,firstName,lastName,phone,notes,status
max@test.de,Max,Mustermann,+49123456,Interessiert an Wohnung,NEW
anna@test.de,Anna,Schmidt,+49234567,Sucht Haus in München,CONTACTED
```

### 2. Jarvis erkennt Format automatisch

Jarvis analysiert den Inhalt und erkennt:
- ✅ Dateiformat (CSV, Excel, PDF, etc.)
- ✅ Spalten-Header und Struktur
- ✅ Datentyp (Leads oder Properties)

### 3. Jarvis importiert intelligent

```
Jarvis: Ich sehe eine CSV mit 2 Leads. Importiere...
        [create_lead: max@test.de, Max, Mustermann]
        Lead 1/2 angelegt ✓
        [create_lead: anna@test.de, Anna, Schmidt]
        Lead 2/2 angelegt ✓
        
        ✅ Alle 2 Leads erfolgreich importiert!
```

## CSV-Formate

### Leads CSV

**Pflichtfelder:**
- `email` - E-Mail-Adresse (muss @ enthalten)

**Optionale Felder:**
- `firstName` - Vorname
- `lastName` - Nachname
- `phone` - Telefonnummer
- `notes` - Notizen
- `status` - Status (NEW, CONTACTED, CONVERSATION, BOOKED, LOST)

**Beispiel:**

```csv
email,firstName,lastName,phone,notes,status
max@test.de,Max,Mustermann,+49123456,Interessiert an Wohnung,NEW
anna@test.de,Anna,Schmidt,+49234567,Sucht Haus in München,CONTACTED
peter@test.de,Peter,Müller,,Callback morgen,NEW
```

### Properties CSV

**Pflichtfelder:**
- `title` - Titel der Immobilie

**Optionale Felder:**
- `address` - Adresse
- `price` - Preis (Zahl)
- `rooms` - Anzahl Zimmer (Zahl)
- `area` - Fläche in m² (Zahl)
- `description` - Beschreibung
- `notes` - Notizen (werden zu aiFacts)

**Beispiel:**

```csv
title,address,price,rooms,area,description
Moderne Wohnung in Berlin-Mitte,Friedrichstraße 123,450000,3,85.5,Neubau mit Balkon
Einfamilienhaus München,Maximilianstraße 45,890000,5,150,Altbau saniert
Penthouse Hamburg,Elbchaussee 78,1200000,4,180,Luxus mit Elbblick
```

## Features

### ✅ Native Datei-Verarbeitung

Jarvis nutzt Gemini's native Fähigkeiten:
- **Keine Parser nötig** - Gemini versteht Dateien direkt
- **Intelligente Erkennung** - Spalten werden automatisch gemappt
- **Flexibel** - Funktioniert mit verschiedenen Formaten

### ✅ Intelligente Verarbeitung

- **Zeile für Zeile** - Jeder Eintrag wird einzeln verarbeitet
- **Fortschritts-Updates** - "Lead 5/50 angelegt..."
- **Fehlertoleranz** - Bei Fehler wird weitergemacht
- **Duplikat-Erkennung** - Existierende Einträge werden erkannt

### ✅ Transparente Fehlerbehandlung

Jarvis meldet jeden Schritt:

```
Lead 1/50: max@test.de ✓
Lead 2/50: anna@test.de ✓
Lead 3/50: invalid-email ✗ (Ungültige E-Mail)
Lead 4/50: peter@test.de ✗ (Existiert bereits)
Lead 5/50: lisa@test.de ✓
...
✅ 46 Leads importiert, 4 übersprungen
```

## Verwendung

### Methode 1: Direkt in den Chat kopieren

```
User: Hier sind meine Leads:

email,firstName,lastName
max@test.de,Max,Mustermann
anna@test.de,Anna,Schmidt

Jarvis: Ich sehe 2 Leads. Soll ich diese importieren?
```

### Methode 2: Datei-Upload

```
User: [Lädt leads.xlsx hoch]

Jarvis: Excel-Datei erkannt mit 150 Leads. Importiere...
        Lead 1/150: max@test.de ✓
        Lead 2/150: anna@test.de ✓
        ...
        ✅ 148 Leads importiert, 2 übersprungen
```

### Methode 3: PDF-Extraktion

```
User: [Lädt Vertrag.pdf hoch]
      Erstelle einen Lead aus diesem Vertrag

Jarvis: PDF analysiert. Ich habe folgende Daten gefunden:
        - Name: Max Mustermann
        - E-Mail: max@mustermann.de
        - Telefon: +49 123 456789
        
        Soll ich einen Lead anlegen?

User: Ja

Jarvis: [create_lead]
        ✅ Lead Max Mustermann angelegt
```

### Methode 4: Bild-Analyse

```
User: [Lädt Immobilienfoto hoch]
      Was siehst du auf diesem Bild?

Jarvis: Ich sehe ein modernes Wohnzimmer mit:
        - Großem Fenster mit Stadtblick
        - Parkettboden
        - Offener Küche
        - Ca. 30-35m² Fläche
        
        Soll ich diese Infos zu einem Property hinzufügen?
```

## Was Jarvis alles kann

### 📄 Dokument-Analyse

**Verträge, Exposés, Angebote:**
```
User: [Lädt Mietvertrag.pdf hoch]
      Extrahiere alle relevanten Daten

Jarvis: Vertrag analysiert:
        - Mieter: Max Mustermann (max@test.de)
        - Objekt: Friedrichstraße 123, Berlin
        - Miete: 1.200€/Monat
        - Laufzeit: 01.01.2026 - 31.12.2027
        
        Soll ich einen Lead und Property anlegen?
```

### 🖼️ Bild-Analyse

**Immobilienfotos:**
```
User: [Lädt 5 Fotos hoch]
      Beschreibe diese Wohnung

Jarvis: Basierend auf den Fotos:
        - Moderne 3-Zimmer-Wohnung
        - Offene Küche mit Kochinsel
        - Parkettboden durchgehend
        - Balkon mit Südausrichtung
        - Hochwertige Ausstattung
        - Geschätzte Fläche: 80-90m²
```

### 📊 Excel-Verarbeitung

**Komplexe Tabellen:**
```
User: [Lädt Objektliste.xlsx hoch]
      Importiere alle Objekte aus Tabelle "Verkauf"

Jarvis: Excel analysiert:
        - Tabelle "Verkauf" hat 45 Objekte
        - Spalten: Adresse, Preis, Zimmer, Fläche
        
        Importiere Objekt 1/45...
        [create_property: Friedrichstr. 1, 450.000€, 3 Zi, 85m²]
        ...
```

## Roadmap

### Q1 2026
- ✅ CSV-Import für Leads
- ✅ CSV-Import für Properties
- 🚧 Datei-Upload (Drag & Drop)

### Q2 2026
- 🔮 Excel-Import (.xlsx)
- 🔮 Bilder-Import (ZIP mit Bildern)
- 🔮 Lead-Property-Verknüpfung beim Import

### Q3 2026
- 🔮 Import aus anderen CRMs (Salesforce, HubSpot)
- 🔮 Automatisches Mapping (KI erkennt Spalten)
- 🔮 Preview vor Import

## Beispiel-Konversation

```
User: Wir steigen von unserem alten System um. Ich habe hier 200 Leads als CSV.

Jarvis: Super! Kopiere einfach den CSV-Inhalt hier rein, ich importiere sie dann.

User: [Kopiert CSV]

email,firstName,lastName,phone,status
max@test.de,Max,Mustermann,+49123,NEW
anna@test.de,Anna,Schmidt,+49234,CONTACTED
...

Jarvis: Ich sehe eine CSV mit 200 Leads. Soll ich diese importieren?

User: Ja

Jarvis: [import_leads_from_csv]
        ✅ 198 Leads importiert, 2 fehlgeschlagen
        
        Fehler:
        - Lead max@test.de existiert bereits
        - Zeile 45: Ungültige E-Mail
        
        Möchtest du auch deine Properties importieren?
```

## Technische Details

### Wie es funktioniert

Jarvis nutzt **Gemini's native Multimodal-Fähigkeiten**:

1. **Datei-Upload** → User lädt Datei hoch
2. **Gemini analysiert** → Erkennt Format und Inhalt automatisch
3. **Intelligentes Mapping** → Spalten werden zu Feldern gemappt
4. **Tool-Calls** → Für jeden Eintrag wird `create_lead`/`create_property` aufgerufen
5. **Fehlerbehandlung** → Bei Fehler wird weitergemacht

### Vorteile gegenüber klassischem Parsing

✅ **Flexibler**: Funktioniert mit verschiedenen Formaten
✅ **Intelligenter**: KI versteht Kontext (z.B. "Vorname" = "firstName")
✅ **Robuster**: Kommas in Werten sind kein Problem
✅ **Transparenter**: User sieht jeden einzelnen Schritt
✅ **Fehlertoleranz**: Bei Fehler wird nicht abgebrochen

### Performance

- **Sequenziell**: Einträge werden nacheinander verarbeitet
- **Transparent**: Fortschritts-Updates nach jedem Eintrag
- **Empfohlen**: Max. 200 Einträge pro Batch

Für größere Imports:
```
User: Ich habe 5000 Leads

Jarvis: Das ist viel! Lass uns das in Batches machen:
        - Batch 1: Zeilen 1-200
        - Batch 2: Zeilen 201-400
        - etc.
        
        Soll ich mit Batch 1 starten?
```

## Support

Bei Problemen:
1. Prüfe CSV-Format (Header, Kommas)
2. Teste mit kleiner CSV (3-5 Zeilen)
3. Schaue in die Fehlermeldungen von Jarvis
