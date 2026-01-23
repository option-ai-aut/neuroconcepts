# Onboarding Guide

## 📋 Übersicht

Dieser Guide beschreibt den Prozess, um einen neuen Mandanten (Immobilienfirma) auf der Plattform in Betrieb zu nehmen. Das Ziel ist ein "Concierge Onboarding", das im Kickoff-Call (45-60 Min) komplett abgeschlossen wird.

## ✅ Checkliste für den Kickoff-Call

### 1. Vorbereitung (Admin)
- [ ] Tenant in der Super-Admin-Konsole anlegen.
- [ ] Admin-User für den Kunden erstellen und Invite senden.
- [ ] Stripe Customer ID verknüpfen (oder Subscription manuell anlegen).

### 2. Tech-Setup (Zusammen mit Kunden)

#### A. E-Mail Verbindung (White-Labeling)
*Das System muss E-Mails im Namen des Maklers senden können.*
- **Option 1: Google/Microsoft (Empfohlen)**
    - Klick auf "Connect Account".
    - OAuth Consent Screen bestätigen.
- **Option 2: SMTP/IMAP (für eigene Domains)**
    - SMTP Host (z.B. `smtp.ionos.de`)
    - SMTP Port (meist `465` oder `587`)
    - Benutzername & Passwort
    - *Test-E-Mail senden lassen zur Bestätigung.*

#### B. Kalender Integration
*Damit die KI Termine buchen kann.*
- Klick auf "Connect Calendar".
- Auswahl der Kalender, die auf "Verfügbarkeit" geprüft werden sollen (z.B. "Arbeit", aber nicht "Privat").
- Konfiguration der Arbeitszeiten (z.B. Mo-Fr, 09:00 - 17:00).

### 3. Content & Routing

#### A. Erstes Objekt anlegen
- PDF-Exposé hochladen (KI extrahiert Daten).
- Stammdaten prüfen: Adresse, Kaltmiete, Zimmer, Fläche.
- **KI-Fakten:** Wichtige Infos ergänzen, die nicht im Exposé stehen (z.B. "Keine WG", "Hund erlaubt").

#### B. Routing-Regeln
- Wer bekommt die Leads für dieses Objekt?
- [ ] Einzelner Makler
- [ ] Team (Round Robin)

### 4. Live-Simulation ("Aha-Moment")

1.  Kunde öffnet das Dashboard.
2.  Wir senden eine E-Mail von einem neutralen Account an die Inbound-Adresse.
3.  **Beobachten:**
    - Lead erscheint im Dashboard ("New").
    - KI analysiert und sendet Exposé (Status -> "Contacted").
    - E-Mail kommt im Test-Postfach an.
4.  Wir antworten: "Sieht gut aus, wann kann ich besichtigen?"
5.  **Beobachten:**
    - KI erkennt Intent "Besichtigung".
    - KI prüft Kalender des Maklers.
    - KI antwortet mit konkreten Terminvorschlägen.
6.  Wir klicken den Link und buchen.
7.  Termin erscheint im Kalender des Maklers.

## 🆘 Troubleshooting

**SMTP-Verbindung schlägt fehl:**
- Prüfen: Ist 2-Faktor-Authentifizierung (2FA) beim Provider aktiv? -> Dann wird oft ein "App-Passwort" benötigt.
- Prüfen: Stimmt der Port (TLS vs SSL)?

**Kalender synchronisiert nicht:**
- Prüfen: Hat der Token die richtigen Scopes?
- Re-Connect durchführen.

**KI antwortet nicht:**
- Prüfen: Ist das Objekt "aktiv"?
- Prüfen: Gibt es offene To-Dos/Eskalationen für diesen Lead?
