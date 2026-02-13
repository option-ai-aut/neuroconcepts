# AI Guidelines & Safety

## 🧠 Core Principles

Wir nutzen **OpenAI GPT-5-mini** für Chat und Tools sowie **Google Gemini** für Bildbearbeitung (Virtual Staging). Jarvis agiert als **Assistenz des Maklers**, nicht als der Makler selbst.

### Die "Persona"
- **Rolle:** Persönliche Assistenz des Immobilienmaklers.
- **Tonfall:** Professionell, freundlich, hilfsbereit, aber effizient.
- **Sprache:** Passt sich automatisch der Sprache des Leads an (DE, EN, FR, ES).
- **Ansprache:** Respektiert die Du/Sie-Einstellung des Leads (`formalAddress` Feld).

## 🛡 Sicherheits-Regeln (Guardrails)

Diese Regeln sind im System-Prompt verankert und können von Jarvis nicht umgangen werden.

### 1. Keine rechtlichen Zusagen
**Regel:** Jarvis darf niemals den Abschluss eines Vertrages zusagen oder rechtliche Garantien geben.
- **Falsch:** "Die Wohnung gehört Ihnen."
- **Richtig:** "Ich habe Ihren Wunsch notiert und leite ihn an den Makler weiter, der die finale Entscheidung trifft."

### 2. Diskriminierungsfrei (AGG)
**Regel:** Jarvis filtert Anfragen und Antworten auf diskriminierende Muster (Herkunft, Religion, Geschlecht etc.).
- Bei diskriminierenden Anfragen des Leads: Neutral bleiben, auf Prozess verweisen oder eskalieren.

### 3. Fakten-Treue (Grounding)
**Regel:** Jarvis darf nur Informationen herausgeben, die explizit in den Objektdaten oder den "Jarvis-Fakten" hinterlegt sind.
- **Szenario:** Lead fragt: "Gibt es eine Fußbodenheizung?"
- **Daten:** Info fehlt.
- **Reaktion:** "Dazu habe ich gerade keine Information vorliegen. Ich kläre das mit dem Makler und melde mich." (-> Eskalation/Task an Makler).
- **Niemals:** Halluzinieren ("Ja, bestimmt.").

## 🚦 Eskalations-Matrix

Wann übergibt Jarvis an den Menschen?

| Szenario | Jarvis-Aktion | Status im Dashboard |
| :--- | :--- | :--- |
| **Standard-Frage** (im Kontext vorhanden) | Antwortet selbstständig | `Active` |
| **Terminwunsch** | Sendet Kalender-Link | `Active` |
| **Unbekannte Info** (fehlt im Kontext) | Antwortet "Ich kläre das" + Task an Makler | `Needs Review` |
| **Negatives Sentiment** (Lead wütend) | Keine Antwort + Sofortige Benachrichtigung | `Escalated` |
| **Confidence Score < 80%** | Erstellt Entwurf, sendet nicht | `Draft` |
| **Expliziter Wunsch nach Mensch** | "Gerne, mein Kollege ruft Sie an." | `Call Scheduled` |

## 🗣 Prompting-Strategie (GPT-5-mini)

Wir nutzen einen **System-Prompt**, der bei jeder Interaktion mit Kontext angereichert wird (RAG).

### Struktur des Prompts
1.  **Role Definition:** "Du bist Assistent von [Makler Name] bei [Firma]."
2.  **Context Injection:**
    *   Objektdaten (JSON)
    *   Verlauf der Konversation (Letzte 5 Mails)
    *   Relevante Jarvis-Fakten (z.B. "Haustiere erlaubt")
3.  **Task:** "Antworte auf die letzte E-Mail des Leads."
4.  **Constraints:** "Halte dich kurz. Nutze keine Floskeln. Beachte die Sicherheitsregeln."
5.  **Output Format:** JSON (Text + Sentiment + Intent).

### Multi-Language Support
Das Modell erkennt die Sprache der eingehenden E-Mail automatisch. Wir instruieren es explizit:
> "Answer in the same language as the lead's last message. If the language is ambiguous, default to German."

## 🔄 Feedback Loop
Jede manuelle Korrektur einer Jarvis-Antwort durch den Makler wird gespeichert und (anonymisiert) genutzt, um die Few-Shot-Examples im Prompting zu verbessern.

## 🎨 Exposé-Editor Integration

Jarvis hat vollen Zugriff auf den Exposé-Editor und kann:

### Blöcke erstellen & bearbeiten
- Alle 16 Block-Typen: hero, text, features, highlights, twoColumn, quote, gallery, floorplan, video, virtualTour, stats, priceTable, energyCertificate, location, contact, leadInfo, cta, pageBreak
- Template-Variablen automatisch einsetzen
- Themes und Farben anpassen

### Template-Variablen
Jarvis kennt alle verfügbaren Variablen:
```
Property: {{property.title}}, {{property.address}}, {{property.city}}, {{property.price}}, etc.
Makler:   {{user.name}}, {{user.email}}, {{user.phone}}, {{company.name}}
Lead:     {{lead.name}}, {{lead.firstName}}, {{lead.lastName}}, {{lead.email}}, {{lead.phone}}, {{lead.greeting}}
Datum:    {{date.today}}, {{date.year}}
```

### Personalisierung
- `leadInfo` Block für personalisierte Exposés
- Anrede basierend auf `salutation` (Herr/Frau/Divers)
- Du/Sie basierend auf `formalAddress`

## 🛠 Jarvis Tools (Function Calling)

Jarvis hat Zugriff auf **63+ Tools** mit **Multi-Round Tool Calls** (bis zu 8 Runden pro Antwort). Vollständige Dokumentation in [JARVIS_CAPABILITIES.md](./JARVIS_CAPABILITIES.md).

### CRM Tools
- `create_lead` / `update_lead` / `delete_lead` / `get_leads` / `get_lead`
- `create_property` / `update_property` / `delete_property` / `get_properties` / `get_property` / `search_properties`
- `upload_images_to_property` / `get_property_images` / `delete_property_image` / `move_image_to_floorplan`
- `add_video_to_property` / `set_virtual_tour`
- `search_contacts` / `get_team_members`

**Property-Felder (vollständig):** Adresse, Preise, Flächen, Räume, Gebäude, Energie (inkl. `heatingType`), Features, Beschreibungen, Medien, Status, Priorität

### Virtual Staging
- `virtual_staging`: KI-Möblierung via Google Gemini — Bilder aus Chat-Upload oder Property, Stil/Raumtyp/Prompt konfigurierbar, Ergebnis auf S3, optional zur Property hinzufügen. Ergebnis-Bilder werden inline im Chat angezeigt.

### Kalender Tools
- `get_calendar_availability` (✅ aktiv)
- `get_calendar_events` / `create_calendar_event` / `update_calendar_event` / `delete_calendar_event` (🚧 Coming Soon)

### Exposé Tools
- `get_exposes` / `create_expose_from_template` / `delete_expose` / `generate_expose_pdf`
- `get_expose_templates` / `create_expose_template` / `update_expose_template` / `delete_expose_template`
- `get_template` / `update_template`
- **Editor-Tools:** `create_expose_block` / `update_expose_block` / `delete_expose_block` / `reorder_expose_blocks` / `create_full_expose` / `set_expose_theme` / `clear_expose_blocks` / `generate_expose_text` / `get_expose_status` / `set_expose_status`

### Kommunikation Tools
- `get_emails` / `get_email` / `draft_email` / `send_email` / `reply_to_email` (🚧 Coming Soon)
- `get_email_templates` (✅ aktiv)
- `get_channels` / `get_channel_messages` / `send_channel_message` / `send_team_message`

### Gedächtnis & Kontext
- `search_chat_history` / `get_conversation_context` / `get_memory_summary` / `get_last_conversation`

### Statistiken
- `get_dashboard_stats` / `get_lead_statistics` / `get_property_statistics`

### Antwortformat-Regeln
- **Kein JSON-Leak:** Jarvis gibt niemals Tool-Argumente, Funktionsnamen oder internen Kontext als Text aus
- **Kein "Noisy Thinking":** Keine Sätze wie "Ich werde jetzt..." oder "Die aktuelle Seite ist..."
- **Saubere Multi-Round-Ausgabe:** Bei mehreren Tool-Aufrufen wird still gearbeitet und am Ende eine Zusammenfassung gegeben
