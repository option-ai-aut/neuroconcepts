# Auftragsverarbeitungsvertrag (AVV)

gemäß Art. 28 DSGVO

**Stand: Januar 2026**

---

## 1. Vertragsgegenstand

Dieser Auftragsverarbeitungsvertrag (AVV) regelt die Rechte und Pflichten im Zusammenhang mit der Verarbeitung personenbezogener Daten durch den Auftragsverarbeiter (Immivo AI GmbH) im Auftrag des Verantwortlichen (Kunde/Maklerunternehmen).

## 2. Vertragsparteien

**Verantwortlicher (Auftraggeber):**
[Name und Adresse des Kunden – wird bei Vertragsschluss ergänzt]

**Auftragsverarbeiter:**
Immivo AI GmbH
Musterstraße 123
1010 Wien, Österreich
E-Mail: datenschutz@immivo.ai

## 3. Gegenstand und Dauer der Verarbeitung

### 3.1 Gegenstand
Die Verarbeitung umfasst die Bereitstellung der Immivo AI Plattform für Immobilienmakler, einschließlich:
- CRM-Verwaltung (Lead-Management)
- E-Mail-Kommunikation (Versand und Empfang)
- KI-gestützter Assistent (Jarvis) für Textgenerierung und Aufgabenverwaltung
- Exposé-Erstellung und PDF-Generierung
- Kalender-Integration
- Team-Kommunikation

### 3.2 Dauer
Die Verarbeitung erfolgt für die Dauer des Hauptvertrags (SaaS-Nutzungsvertrag) und endet mit dessen Beendigung oder Kündigung.

## 4. Art und Zweck der Verarbeitung

Die Verarbeitung erfolgt ausschließlich zum Zweck der Bereitstellung der vertraglich vereinbarten Plattformdienste:

| Kategorie | Zweck |
|-----------|-------|
| CRM-Daten | Verwaltung von Leads, Kontakten, Immobilien |
| E-Mail-Daten | Versand/Empfang/Archivierung von E-Mails |
| KI-Verarbeitung | Textgenerierung, Zusammenfassungen, Vorschläge |
| Dokumentenerstellung | Exposés, PDFs |
| Nutzungsdaten | Authentifizierung, Session-Verwaltung, Audit-Logs |

## 5. Kategorien betroffener Personen

- Mitarbeiter/Makler des Verantwortlichen (Nutzer der Plattform)
- Leads/Interessenten (Kontaktpersonen im CRM)
- E-Mail-Kommunikationspartner

## 6. Kategorien personenbezogener Daten

- Kontaktdaten: Name, E-Mail, Telefonnummer, Adresse
- Immobiliendaten: Objektbeschreibungen, Preise, Bilder
- Kommunikationsdaten: E-Mails, Chat-Verläufe
- Nutzungsdaten: Login-Zeiten, Aktivitäten, KI-Interaktionen
- Finanzdaten: Preise, Budgets (soweit im CRM erfasst)

## 7. Pflichten des Auftragsverarbeiters

### 7.1 Weisungsgebundenheit
Der Auftragsverarbeiter verarbeitet Daten ausschließlich auf dokumentierte Weisung des Verantwortlichen.

### 7.2 Vertraulichkeit
Alle Mitarbeiter mit Zugang zu personenbezogenen Daten sind zur Vertraulichkeit verpflichtet.

### 7.3 Technische und organisatorische Maßnahmen (TOM)

Der Auftragsverarbeiter setzt folgende Maßnahmen um:

**Verschlüsselung:**
- TLS/HTTPS für alle Datenübertragungen
- AES-256 Verschlüsselung sensibler Daten at rest
- Verschlüsselte Datenbank-Verbindungen

**Zugriffskontrolle:**
- Multi-Tenancy mit strikter Datenisolation
- Rollenbasierte Zugriffskontrolle (RBAC)
- Authentifizierung über AWS Cognito

**Verfügbarkeit:**
- Hosting auf AWS (Region eu-central-1, Frankfurt)
- Automatische Backups
- Monitoring und Alerting

**KI-Sicherheit:**
- Input-Validierung und Prompt-Injection-Schutz
- Output-Filterung sensibler Daten
- Rate-Limiting für kritische KI-Operationen
- Audit-Logging aller KI-Interaktionen

### 7.4 Unterstützung des Verantwortlichen
Der Auftragsverarbeiter unterstützt den Verantwortlichen bei:
- Beantwortung von Betroffenenanfragen (Auskunft, Löschung, Export)
- Meldung von Datenschutzverletzungen
- Datenschutz-Folgenabschätzungen

### 7.5 Meldepflicht bei Datenpannen
Der Auftragsverarbeiter meldet Datenschutzverletzungen unverzüglich (spätestens innerhalb von 24 Stunden) an den Verantwortlichen.

## 8. Unterauftragsverarbeiter

Folgende Unterauftragsverarbeiter werden eingesetzt:

| Anbieter | Zweck | Standort | Garantien |
|----------|-------|----------|-----------|
| Amazon Web Services (AWS) | Hosting, DB, E-Mail-Empfang (SES), Storage (S3), WorkMail | Frankfurt, DE (eu-central-1) | EU-Rechenzentrum |
| OpenAI, Inc. | KI-Chat & Tools (Jarvis, GPT-5-mini) | USA | EU-Standardvertragsklauseln (SCCs) |
| Google LLC | KI-Bildbearbeitung (Gemini), Kalender-Integration (optional) | USA | EU-Standardvertragsklauseln (SCCs) |
| Resend, Inc. | System-E-Mail-Versand (Benachrichtigungen) | USA | EU-Standardvertragsklauseln (SCCs) |

Änderungen bei Unterauftragsverarbeitern werden dem Verantwortlichen vorab mitgeteilt (Widerspruchsrecht innerhalb von 14 Tagen).

## 9. Datenübermittlung in Drittländer

Datenübermittlungen in die USA (OpenAI, Google, Resend) erfolgen auf Basis von:
- EU-Standardvertragsklauseln (SCCs) gemäß Art. 46 Abs. 2 lit. c DSGVO
- Zusätzliche Schutzmaßnahmen (Verschlüsselung, Pseudonymisierung wo möglich)

## 10. Löschung und Rückgabe von Daten

Nach Beendigung des Hauptvertrags:
- Der Verantwortliche kann einen vollständigen Datenexport anfordern
- Alle personenbezogenen Daten werden innerhalb von 30 Tagen gelöscht
- Eine Bestätigung der Löschung wird schriftlich erteilt
- Gesetzliche Aufbewahrungsfristen bleiben unberührt

## 11. Kontrollrechte

Der Verantwortliche hat das Recht, die Einhaltung dieses AVV zu überprüfen:
- Durch Einsicht in aktuelle Zertifizierungen und Audit-Berichte
- Durch Vor-Ort-Inspektionen (nach vorheriger Ankündigung)
- Durch Beauftragung eines unabhängigen Prüfers

## 12. Haftung

Die Haftung richtet sich nach den gesetzlichen Bestimmungen der DSGVO, insbesondere Art. 82 DSGVO.

## 13. Laufzeit und Kündigung

Dieser AVV gilt für die Dauer des Hauptvertrags. Bei Kündigung des Hauptvertrags endet auch dieser AVV automatisch.

---

**Unterschrift Verantwortlicher:**

Ort, Datum: _________________________

Unterschrift: _________________________

Name: _________________________

---

**Unterschrift Auftragsverarbeiter:**

Ort, Datum: _________________________

Unterschrift: _________________________

Name: _________________________
Immivo AI GmbH
