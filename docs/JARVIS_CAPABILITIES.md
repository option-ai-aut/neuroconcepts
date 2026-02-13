# Jarvis - AI Assistant Capabilities

## Übersicht

Jarvis ist der zentrale KI-Assistent für Immivo, basierend auf **OpenAI GPT-5-mini**, mit Zugriff auf das **gesamte System**. Für Bildbearbeitung (Virtual Staging) wird **Google Gemini** verwendet.

### Architektur-Highlights
- **Multi-Round Tool Calls:** Jarvis kann bis zu **8 aufeinanderfolgende Tool-Runden** in einer Antwort ausführen (z.B. 3 Properties anlegen → Exposés erstellen → PDFs generieren)
- **Saubere Antworten:** Keine internen Gedanken, kein JSON-Leak, keine Tool-Argumente — nur die finale Antwort
- **Live Tool-Tags:** Während Jarvis arbeitet, sieht der User pulsende Aktions-Tags (z.B. "🏠 Objekt erstellt"), die nach Abschluss statisch werden
- **Inline-Bilder im Chat:** Ergebnis-Bilder (z.B. Virtual Staging) werden direkt im Chat angezeigt

## Vollständige Tool-Liste

### 📋 LEADS & CRM (8 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `create_lead` | Lead anlegen mit Anrede & Du/Sie | "Leg einen Lead an: Frau Anna Müller, per Du, anna@test.de" |
| `get_leads` | Alle Leads abrufen | "Zeig mir alle neuen Leads" |
| `get_lead` | Einzelnen Lead abrufen | "Zeig mir Lead ABC-123" |
| `update_lead` | Lead aktualisieren (inkl. Anrede, Du/Sie) | "Ändere Lead XYZ auf per Sie" |
| `delete_lead` | Lead löschen | "Lösche Lead ABC-123" |
| `delete_all_leads` | Alle Leads löschen | "Lösche alle Test-Leads" |
| `get_lead_statistics` | Lead-Statistiken | "Wie ist unsere Conversion-Rate diesen Monat?" |
| `search_contacts` | Kontakte durchsuchen | "Suche nach Kontakt Müller" |

**Lead-Felder:**
- `salutation`: Anrede (NONE, MR/Herr, MS/Frau, DIVERSE/Divers)
- `formalAddress`: Du/Sie Toggle (true = Sie, false = Du)
- `firstName`, `lastName`, `email`, `phone`
- `budgetMin`, `budgetMax`, `preferredType`, `preferredLocation`
- `minRooms`, `minArea`, `timeFrame`, `financingStatus`, `source`

### 🏠 IMMOBILIEN (14 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `create_property` | Property anlegen (alle Felder) | "Leg ein Objekt an: 3-Zimmer-Wohnung in München" |
| `get_properties` | Alle Properties abrufen | "Zeig mir alle verfügbaren Wohnungen" |
| `get_property` | Einzelne Property abrufen | "Zeig mir Property XYZ-789" |
| `update_property` | Property aktualisieren (alle Felder) | "Ändere den Preis von Property ABC auf 450.000€" |
| `delete_property` | Property löschen | "Lösche Property XYZ-789" |
| `delete_all_properties` | Alle Properties löschen | "Lösche alle Test-Objekte" |
| `search_properties` | Properties suchen | "Suche Wohnungen in Berlin unter 500k" |
| `get_property_statistics` | Property-Statistiken | "Wie viele Objekte haben wir verkauft?" |
| `upload_images_to_property` | Bilder zu Property hochladen | "Lade diese Bilder zum Objekt hoch" |
| `get_property_images` | Bilder einer Property abrufen | "Zeig mir die Bilder von Property ABC" |
| `delete_property_image` | Einzelnes Bild löschen | "Lösche das 3. Bild von Property ABC" |
| `delete_all_property_images` | Alle Bilder löschen | "Lösche alle Bilder von Property ABC" |
| `move_image_to_floorplan` | Bild als Grundriss markieren | "Verschiebe Bild 2 zu den Grundrissen" |
| `add_video_to_property` | Video-URL hinzufügen | "Füge dieses YouTube-Video zum Objekt hinzu" |
| `set_virtual_tour` | 360°-Tour-URL setzen | "Setze die Virtual-Tour-URL für Property ABC" |

**Property-Felder (vollständig über create/update verfügbar):**
- **Basis:** `title`, `description`, `propertyType`, `marketingType`, `status`, `priority`
- **Adresse:** `address`, `city`, `zipCode`, `state`, `country`
- **Preise:** `price`, `pricePerSqm`, `deposit`, `commission`, `warmRent`, `coldRent`, `additionalCosts`
- **Flächen:** `livingArea`, `usableArea`, `plotArea`, `landArea`
- **Räume:** `rooms`, `bedrooms`, `bathrooms`
- **Gebäude:** `floor`, `totalFloors`, `yearBuilt`, `parkingSpaces`
- **Energie:** `energyClass`, `energyCertificateValidUntil`, `heatingType`
- **Ausstattung:** `features` (Array), `equipmentDescription`
- **Beschreibungen:** `locationDescription`
- **Medien:** `videos` (Array), `virtualTour` (URL)

### 🎨 VIRTUAL STAGING (1 Tool)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `virtual_staging` | KI-Möblierung via Gemini | "Möbliere dieses Bild im skandinavischen Stil" |

**Fähigkeiten:**
- Bilder aus **Chat-Upload** oder von einer **Property** verwenden
- **Stil** wählen (Modern, Skandinavisch, Industrial, etc.)
- **Raumtyp** angeben (Wohnzimmer, Schlafzimmer, Küche, etc.)
- **Freie Prompt-Eingabe** für spezifische Wünsche
- Ergebnis auf **S3 speichern** und optional direkt einer Property zuweisen
- Ergebnis-Bild wird **inline im Chat** angezeigt
- Strikte Regel: Nur Möbel/Deko werden hinzugefügt — Wände, Türen, Fenster, Böden etc. bleiben unverändert

### 📧 E-MAILS (6 Tools)

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

### 📄 EXPOSÉS & TEMPLATES (17 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `get_exposes` | Exposés abrufen | "Zeig mir alle Exposés" |
| `create_expose_from_template` | Exposé erstellen | "Erstelle Exposé für Property ABC mit Template XYZ" |
| `create_expose_template` | Neues Template erstellen | "Erstelle ein neues Exposé-Template" |
| `update_expose_template` | Template aktualisieren | "Ändere den Namen von Template ABC" |
| `delete_expose_template` | Template löschen | "Lösche Template XYZ" |
| `delete_expose` | Exposé löschen | "Lösche Exposé ABC-123" |
| `delete_all_exposes` | Alle Exposés löschen | "Lösche alle Exposés" |
| `generate_expose_pdf` | PDF generieren | "Generiere PDF für Exposé XYZ" |
| `get_expose_templates` | Exposé-Templates abrufen | "Zeig mir alle Exposé-Vorlagen" |
| `get_template` | Template abrufen | "Zeig mir Template XYZ" |
| `update_template` | Template-Details aktualisieren | "Ändere die Blöcke von Template ABC" |

**Exposé-Editor-Tools** (im Editor & Chat verfügbar):

| Tool | Beschreibung |
|------|--------------|
| `create_expose_block` | Block hinzufügen (alle 16 Block-Typen) |
| `update_expose_block` | Block bearbeiten |
| `delete_expose_block` | Block löschen |
| `reorder_expose_blocks` | Blöcke sortieren |
| `generate_expose_text` | Text für Block generieren |
| `get_expose_status` | Exposé-Status abrufen |
| `set_expose_status` | Exposé-Status setzen |
| `create_full_expose` | Komplettes Exposé generieren |
| `set_expose_theme` | Theme ändern |
| `clear_expose_blocks` | Alle Blöcke löschen |

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
          {{property.yearBuilt}}, {{property.propertyType}}, {{property.energyClass}},
          {{property.usableArea}}, {{property.plotArea}}, {{property.floor}}, 
          {{property.totalFloors}}, {{property.heatingType}}

Makler:   {{user.name}}, {{user.email}}, {{user.phone}}, {{company.name}}

Lead:     {{lead.name}}, {{lead.firstName}}, {{lead.lastName}}, {{lead.email}}, 
          {{lead.phone}}, {{lead.greeting}}

Datum:    {{date.today}}, {{date.year}}
```

### 💬 TEAM-CHAT (4 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `get_channels` | Channels abrufen | "Zeig mir alle Team-Channels" |
| `get_channel_messages` | Nachrichten lesen | "Was wurde im Sales-Channel geschrieben?" |
| `send_channel_message` | Nachricht senden | "Schreibe im Team-Chat: Meeting um 15 Uhr" |
| `send_team_message` | Team-Nachricht senden | "Schreibe dem Team eine Nachricht" |

### 🧠 GEDÄCHTNIS & KONTEXT (4 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `search_chat_history` | Chatverlauf durchsuchen | "Was haben wir über die Villa gesprochen?" |
| `get_conversation_context` | Konversationskontext abrufen | "Zusammenfassung des letzten Gesprächs" |
| `get_memory_summary` | Gedächtnis-Zusammenfassung | "Was weißt du über mich?" |
| `get_last_conversation` | Letzte Unterhaltung abrufen | "Was war unser letztes Gespräch?" |

### 📊 STATISTIKEN (3 Tools)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `get_dashboard_stats` | Dashboard-Übersicht | "Zeig mir die Stats dieser Woche" |
| `get_lead_statistics` | Lead-Statistiken | "Wie ist die Conversion-Rate?" |
| `get_property_statistics` | Property-Statistiken | "Wie viele Objekte haben wir?" |

### 👥 TEAM (1 Tool)

| Tool | Beschreibung | Beispiel |
|------|--------------|----------|
| `get_team_members` | Team-Mitglieder abrufen | "Wer ist im Team?" |

### 📂 DATEI-VERARBEITUNG (Native Fähigkeit)

**Keine Tools nötig** - Jarvis kann Dateien direkt verarbeiten:

| Format | Fähigkeit | Beispiel |
|--------|-----------|----------|
| 📄 CSV, Excel | Bulk-Import | "Hier sind 200 Leads als CSV" → Jarvis liest und importiert |
| 📄 PDF, Word | Text-Extraktion | "Extrahiere Daten aus diesem Vertrag" |
| 🖼️ Bilder | Bild-Analyse & Virtual Staging | "Möbliere dieses Bild" / "Was siehst du auf diesem Foto?" |
| 📄 JSON, XML | Struktur-Parsing | "Parse diese API-Response" |

**Intelligente Verarbeitung:**
- ✅ Automatisches Format-Erkennung
- ✅ Spalten-Mapping (z.B. "Vorname" → firstName)
- ✅ Zeile-für-Zeile mit Fortschritts-Updates
- ✅ Fehlertoleranz und Duplikat-Erkennung

## Gesamt: 63+ Tools

- ✅ **52 Tools aktiv**
- 🚧 **9 Tools in Entwicklung** (E-Mail & Kalender-Integration)
- 🎨 **1 Virtual Staging Tool** (Google Gemini)
- ✨ **Native Datei-Verarbeitung** (CSV, Excel, PDF, Bilder, etc.)
- 🧠 **4 Gedächtnis-Tools** (Chatverlauf, Kontext, Memory)
- 🔄 **Multi-Round Tool Calls** (bis zu 8 Runden pro Antwort)
- 🖼️ **Inline-Bilder im Chat** (Virtual Staging Ergebnisse etc.)

## Chat UX

### Live Tool-Tags
Wenn Jarvis Tools ausführt, sieht der User pulsierende Aktions-Tags:
- **Während der Ausführung:** Blaue pulsierende Tags (z.B. "🏠 Objekt erstellt" mit Animation)
- **Nach Abschluss:** Statische graue Tags

### Inline-Bilder
Ergebnis-Bilder (z.B. von Virtual Staging) werden direkt als klickbare Bilder im Chat angezeigt, nicht als Text-URLs.

### Multi-Round Execution
Bei komplexen Aufgaben (z.B. "Lege 3 Objekte an und erstelle Exposés") führt Jarvis bis zu 8 Tool-Runden automatisch aus und gibt am Ende eine zusammenfassende Antwort. Kein JSON-Leak, keine internen Gedanken.

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

### Beispiel 3: Multi-Action (Multi-Round)
```
User: Lege 3 Test-Objekte an
Jarvis: [create_property] → [create_property] → [create_property]
        "3 Objekte wurden angelegt: Test-Wohnung Berlin, Test-Villa München, 
         Test-Büro Hamburg. Soll ich Exposés erstellen?"
```

### Beispiel 4: Virtual Staging im Chat
```
User: [Lädt Foto hoch] Möbliere dieses Wohnzimmer im skandinavischen Stil
Jarvis: [virtual_staging mit style=skandinavisch, roomType=Wohnzimmer]
        "Hier ist das Ergebnis:"
        [Zeigt möbliertes Bild inline an]
        "Soll ich das Bild einem Objekt hinzufügen?"
```

### Beispiel 5: Dashboard & Statistiken
```
User: Wie läuft es diesen Monat?
Jarvis: [get_dashboard_stats, get_lead_statistics]
        "Diesen Monat: 45 neue Leads, 12 qualifiziert (27% Conversion).
         8 Properties verkauft, 15 Exposés erstellt."
```

### Beispiel 6: Datei-Import (Onboarding)
```
User: [Lädt leads.xlsx hoch]
      Wir steigen von unserem alten CRM um. Importiere alle Leads.

Jarvis: Excel-Datei analysiert: 200 Leads gefunden.
        
        Importiere Lead 1/200: max@test.de ✓
        Importiere Lead 2/200: anna@test.de ✓
        Importiere Lead 3/200: invalid-email ✗ (Ungültige E-Mail)
        ...
        
        ✅ 196 Leads importiert, 4 übersprungen
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
- **Multi-Round**: Bis zu 8 Tool-Runden pro Antwort für komplexe Aufgaben
- **Conversation Memory**: Lange Gespräche bleiben schnell
- **Smart Caching**: Häufige Abfragen werden optimiert

## Roadmap

### Q1 2026
- ✅ Vollständige CRM-Tools (inkl. erweiterte Property-Felder)
- ✅ Exposé-Editor-Integration
- ✅ Team-Chat-Tools
- ✅ Virtual Staging via Jarvis-Chat
- ✅ Multi-Round Tool Calls
- ✅ Inline-Bilder im Chat
- ✅ Live Tool-Tags mit Animation
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
