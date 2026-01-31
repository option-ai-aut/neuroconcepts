# Jarvis - AI Assistant Capabilities

## Übersicht

Jarvis ist der zentrale KI-Assistent für NeuroConcepts mit Zugriff auf das **gesamte System**.

## Vollständige Tool-Liste

### 📋 LEADS & CRM (8 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `create_lead` | Lead anlegen mit Anrede & Du/Sie | "Leg einen Lead an: Frau Anna Müller, per Du, anna@test.de" |
| `get_leads` | Alle Leads abrufen | "Zeig mir alle neuen Leads" |
| `get_lead` | Einzelnen Lead abrufen | "Zeig mir Lead ABC-123" |
| `update_lead` | Lead aktualisieren (inkl. Anrede, Du/Sie) | "Ändere Lead XYZ auf per Sie" |
| `delete_lead` | Lead löschen | "Lösche Lead ABC-123" |
| `get_lead_statistics` | Lead-Statistiken | "Wie ist unsere Conversion-Rate diesen Monat?" |
| `search_properties` | Properties suchen | "Suche Wohnungen in Berlin unter 500k" |
| `get_dashboard_stats` | Dashboard-Übersicht | "Zeig mir die Stats dieser Woche" |

**Lead-Felder:**
- `salutation`: Anrede (NONE, MR/Herr, MS/Frau, DIVERSE/Divers)
- `formalAddress`: Du/Sie Toggle (true = Sie, false = Du)
- `firstName`, `lastName`, `email`, `phone`
- `budgetMin`, `budgetMax`, `preferredType`, `preferredLocation`
- `minRooms`, `minArea`, `timeFrame`, `financingStatus`, `source`

### 🏠 IMMOBILIEN (6 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `create_property` | Property anlegen | "Leg ein Objekt an: 3-Zimmer-Wohnung in München" |
| `get_properties` | Alle Properties abrufen | "Zeig mir alle verfügbaren Wohnungen" |
| `get_property` | Einzelne Property abrufen | "Zeig mir Property XYZ-789" |
| `update_property` | Property aktualisieren | "Ändere den Preis von Property ABC auf 450.000€" |
| `delete_property` | Property löschen | "Lösche Property XYZ-789" |
| `get_property_statistics` | Property-Statistiken | "Wie viele Objekte haben wir verkauft?" |

### 📧 E-MAILS (5 Tools)

| Tool | Beschreibung | Status | Beispiel |
|------|--------------|--------|----------|
| `get_emails` | E-Mails abrufen | 🚧 Coming Soon | "Zeig mir ungelesene E-Mails" |
| `get_email` | Einzelne E-Mail | 🚧 Coming Soon | "Zeig mir E-Mail ABC-123" |
| `draft_email` | E-Mail-Entwurf | 🚧 Coming Soon | "Erstelle einen Entwurf an max@test.de" |
| `send_email` | E-Mail senden | 🚧 Coming Soon | "Sende E-Mail an max@test.de" |
| `reply_to_email` | Auf E-Mail antworten | 🚧 Coming Soon | "Antworte auf E-Mail XYZ" |
| `get_email_templates` | E-Mail-Templates | ✅ Aktiv | "Zeig mir alle E-Mail-Vorlagen" |

### 📅 KALENDER (5 Tools)

| Tool | Beschreibung | Status | Beispiel |
|------|--------------|--------|----------|
| `get_calendar_events` | Termine abrufen | 🚧 Coming Soon | "Was steht heute im Kalender?" |
| `create_calendar_event` | Termin erstellen | 🚧 Coming Soon | "Erstelle Termin für Dienstag 14 Uhr" |
| `update_calendar_event` | Termin ändern | 🚧 Coming Soon | "Verschiebe Termin ABC auf Mittwoch" |
| `delete_calendar_event` | Termin löschen | 🚧 Coming Soon | "Lösche Termin XYZ" |
| `get_calendar_availability` | Verfügbarkeit prüfen | ✅ Aktiv | "Bin ich nächste Woche Dienstag frei?" |

### 📄 EXPOSÉS & TEMPLATES (12 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `get_exposes` | Exposés abrufen | "Zeig mir alle Exposés" |
| `create_expose_from_template` | Exposé erstellen | "Erstelle Exposé für Property ABC mit Template XYZ" |
| `delete_expose` | Exposé löschen | "Lösche Exposé ABC-123" |
| `generate_expose_pdf` | PDF generieren | "Generiere PDF für Exposé XYZ" |
| `get_expose_templates` | Exposé-Templates | "Zeig mir alle Exposé-Vorlagen" |
| `get_template` | Template abrufen | "Zeig mir Template XYZ" |
| `update_template` | Template aktualisieren | "Ändere den Namen von Template ABC" |

**Exposé-Editor-Tools** (im Editor & Chat verfügbar):
- `create_expose_block` - Block hinzufügen (alle 16 Block-Typen)
- `update_expose_block` - Block bearbeiten
- `delete_expose_block` - Block löschen
- `reorder_expose_blocks` - Blöcke sortieren
- `create_full_expose` - Komplettes Exposé generieren
- `set_expose_theme` - Theme ändern
- `clear_expose_blocks` - Alle Blöcke löschen

**Verfügbare Block-Typen:**

| Kategorie | Blöcke |
|-----------|--------|
| **Header** | `hero` (Hero-Bild mit Titel/Untertitel) |
| **Content** | `text`, `features`, `highlights`, `twoColumn`, `quote` |
| **Media** | `gallery`, `floorplan`, `video`, `virtualTour` |
| **Daten** | `stats`, `priceTable`, `energyCertificate`, `location`, `contact`, `leadInfo` |
| **CTA** | `cta`, `pageBreak` |

**Template-Variablen** (für personalisierte Exposés):
```
Property: {{property.title}}, {{property.address}}, {{property.city}}, {{property.price}}, 
          {{property.rooms}}, {{property.area}}, {{property.bedrooms}}, {{property.bathrooms}},
          {{property.yearBuilt}}, {{property.propertyType}}, {{property.energyClass}}

Makler:   {{user.name}}, {{user.email}}, {{user.phone}}, {{company.name}}

Lead:     {{lead.name}}, {{lead.firstName}}, {{lead.lastName}}, {{lead.email}}, 
          {{lead.phone}}, {{lead.greeting}}

Datum:    {{date.today}}, {{date.year}}
```

### 💬 TEAM-CHAT (3 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `get_channels` | Channels abrufen | "Zeig mir alle Team-Channels" |
| `get_channel_messages` | Nachrichten lesen | "Was wurde im Sales-Channel geschrieben?" |
| `send_channel_message` | Nachricht senden | "Schreibe im Team-Chat: Meeting um 15 Uhr" |

### 📂 DATEI-VERARBEITUNG (Native Gemini-Fähigkeit)

**Keine Tools nötig** - Jarvis kann Dateien direkt verarbeiten:

| Format | Fähigkeit | Beispiel |
|--------|-----------|----------|
| 📄 CSV, Excel | Bulk-Import | "Hier sind 200 Leads als CSV" → Jarvis liest und importiert |
| 📄 PDF, Word | Text-Extraktion | "Extrahiere Daten aus diesem Vertrag" |
| 🖼️ Bilder | Bild-Analyse | "Was siehst du auf diesem Immobilienfoto?" |
| 📄 JSON, XML | Struktur-Parsing | "Parse diese API-Response" |

**Intelligente Verarbeitung:**
- ✅ Automatisches Format-Erkennung
- ✅ Spalten-Mapping (z.B. "Vorname" → firstName)
- ✅ Zeile-für-Zeile mit Fortschritts-Updates
- ✅ Fehlertoleranz und Duplikat-Erkennung

## Gesamt: 50+ Tools

- ✅ **44 Tools aktiv**
- 🚧 **6 Tools in Entwicklung** (E-Mail & Kalender-Integration)
- ✨ **Native Datei-Verarbeitung** (CSV, Excel, PDF, Bilder, etc.)
- 🎨 **Live-Editor-Integration** (Jarvis kann Exposés in Echtzeit bearbeiten)

## Beispiel-Konversationen

### Beispiel 1: Lead-Management
```
User: Zeig mir alle neuen Leads dieser Woche
Jarvis: [get_leads mit status=NEW, period=week]
        "Du hast 12 neue Leads diese Woche. Die wichtigsten sind..."

User: Ändere den Status von Lead ABC auf QUALIFIED
Jarvis: [update_lead]
        "Lead wurde auf QUALIFIED gesetzt. Möchtest du einen Termin vereinbaren?"
```

### Beispiel 2: Property-Verwaltung
```
User: Leg ein Test-Objekt an
Jarvis: [create_property]
        "Objekt 'Test-Wohnung' wurde angelegt. Möchtest du ein Exposé erstellen?"

User: Ja, erstelle ein Exposé
Jarvis: [create_expose_from_template]
        "Exposé wurde erstellt. Öffne den Editor um es anzupassen."
```

### Beispiel 3: Dashboard & Statistiken
```
User: Wie läuft es diesen Monat?
Jarvis: [get_dashboard_stats, get_lead_statistics]
        "Diesen Monat: 45 neue Leads, 12 qualifiziert (27% Conversion).
         8 Properties verkauft, 15 Exposés erstellt."
```

### Beispiel 4: Team-Kommunikation
```
User: Was wurde im Sales-Channel geschrieben?
Jarvis: [get_channel_messages]
        "Letzte Nachrichten: Anna fragte nach dem Penthouse-Deal,
         Tom meldete 3 neue Besichtigungen..."
```

### Beispiel 5: Datei-Import (Onboarding)
```
User: [Lädt leads.xlsx hoch]
      Wir steigen von unserem alten CRM um. Importiere alle Leads.

Jarvis: Excel-Datei analysiert: 200 Leads gefunden.
        
        Importiere Lead 1/200: max@test.de ✓
        Importiere Lead 2/200: anna@test.de ✓
        Importiere Lead 3/200: invalid-email ✗ (Ungültige E-Mail)
        Importiere Lead 4/200: peter@test.de ✗ (Existiert bereits)
        ...
        Importiere Lead 200/200: lisa@test.de ✓
        
        ✅ 196 Leads importiert, 4 übersprungen
        
        Möchtest du auch deine Properties importieren?
```

### Beispiel 6: Bild-Analyse
```
User: [Lädt 3 Immobilienfotos hoch]
      Beschreibe diese Wohnung und erstelle ein Property

Jarvis: Fotos analysiert:
        
        Bild 1 (Wohnzimmer):
        - Moderne offene Küche
        - Parkettboden
        - Große Fensterfront
        - Ca. 30m²
        
        Bild 2 (Schlafzimmer):
        - Einbauschrank
        - Balkonzugang
        - Ca. 15m²
        
        Bild 3 (Bad):
        - Moderne Dusche
        - Fliesen in Grau
        
        Geschätzte Gesamtfläche: 75-80m²
        Zimmer: 2-3
        Zustand: Neuwertig
        
        Soll ich ein Property anlegen?

User: Ja, Adresse ist Friedrichstraße 123, Berlin, Preis 450.000€

Jarvis: [create_property]
        ✅ Property "Moderne Wohnung Friedrichstraße" angelegt
```

## Proaktives Verhalten

Jarvis schlägt automatisch nächste Schritte vor:

```
User: Lead Max Mustermann hat gerade angefragt
Jarvis: "Möchtest du dass ich:
         1. Einen Lead anlege
         2. Eine Antwort-E-Mail entwerfe
         3. Einen Besichtigungstermin vorschlage?"
```

## Sicherheit

Alle Tools sind durch die AI Safety Middleware geschützt:
- ✅ Rate Limiting (50 req/min)
- ✅ Content Moderation
- ✅ Tenant Isolation
- ✅ Audit Logging

Bei kritischen Operationen (Löschen, E-Mail-Versand) fragt Jarvis nach Bestätigung.

## Performance

- **Streaming**: Antworten erscheinen live
- **Conversation Memory**: Lange Gespräche bleiben schnell
- **Smart Caching**: Häufige Abfragen werden optimiert

## Roadmap

### Q1 2026
- ✅ Vollständige CRM-Tools
- ✅ Exposé-Editor-Integration
- ✅ Team-Chat-Tools
- 🚧 E-Mail-Integration (SMTP)
- 🚧 Kalender-Integration (Google/Outlook)

### Q2 2026
- 🔮 Automatische Lead-Qualifizierung
- 🔮 Predictive Analytics (Verkaufschancen)
- 🔮 Automatische Termin-Vorschläge
- 🔮 Multi-Language Support

### Q3 2026
- 🔮 Voice Interface (Spracheingabe)
- 🔮 WhatsApp-Integration
- 🔮 Automatische Marktanalysen
- 🔮 Competitor Intelligence
