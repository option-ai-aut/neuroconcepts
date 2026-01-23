# NeuroConcepts AI - B2B Real Estate Automation Platform

**Status:** Planning Phase (Pre-MVP)  
**Target Launch:** Q2 2026  
**Focus:** DACH Region (Germany, Austria, Switzerland)

## 📖 Projektübersicht

NeuroConcepts AI ist eine B2B-SaaS-Plattform für Immobilienunternehmen (2–5 Mio. € Umsatz), die den Vertriebsprozess automatisiert. Das System führt eingehende Leads (von Portalen oder der Website) vollautomatisch bis zum gebuchten Besichtigungstermin.

**Kernversprechen:** Der Makler greift erst ein, wenn der Termin im Kalender steht oder eine Eskalation notwendig ist.

### Hauptfunktionen (Ticket 1 - MVP)
- **Lead Intake:** Automatische Erfassung aus E-Mail-Weiterleitungen (ImmoScout, Willhaben) und Web-Formularen.
- **KI-Kommunikation:** Google Gemini 3 Flash erstellt personalisierte Exposés und beantwortet Rückfragen in Echtzeit (DE/EN/FR/ES).
- **E-Mail Thread Intelligence:** Ordnet Antworten korrekt zu und führt den Dialog kontextbezogen fort.
- **Kalender-Sync:** Bidirektionale Synchronisation (Google/Outlook) für automatische Terminbuchung.
- **White-Labeling:** Versand über die SMTP-Server des Maklers (eigene Domain).

## 🛠 Tech Stack

### Infrastructure & Backend
- **Cloud:** AWS (Region: `eu-central-1` Frankfurt)
- **Compute:** AWS Fargate (Serverless Containers)
- **Database:** PostgreSQL (Aurora Serverless) + `pgvector` für KI-Kontext
- **Language:** Node.js / TypeScript
- **IaC:** Terraform / CDK

### AI & Intelligence
- **Model:** Google Gemini 3 Flash Preview
- **Features:** Multi-Language Support, Context-Awareness, Sentiment Analysis

### Integrations
- **Payment:** Stripe (Subscriptions, Invoicing)
- **Email:** SMTP/IMAP (User Credentials), AWS SES (System Notifications)
- **Calendar:** Google Calendar API, Microsoft Graph API

## 📂 Projektstruktur

```
/
├── docs/                 # Detaillierte Dokumentation
│   ├── ARCHITECTURE.md   # Technische Architektur & Datenflüsse
│   ├── ONBOARDING.md     # Checklisten für neue Kunden
│   └── AI_GUIDELINES.md  # Prompting-Strategien & Sicherheitsregeln
├── src/                  # (Planned) Source Code
└── README.md             # Diese Datei
```

## 🚀 Roadmap

### Phase 1: MVP (Wochen 1–8)
- [ ] AWS Infrastruktur Setup
- [ ] E-Mail Inbound Parser & DB Schema
- [ ] KI-Engine Integration (Gemini 3)
- [ ] SMTP Outbound & Kalender Sync
- [ ] Dashboard & Stripe Integration

### Phase 2: Post-Termin (Monate 3–6)
- [ ] Follow-up Automatisierung
- [ ] Dokumenten-Management (Uploads)
- [ ] Mietanbot & Digitale Unterschrift
- [ ] Mieter-Ticketing System

## 🔐 Sicherheit & Datenschutz

- **Datenhaltung:** Konform mit österreichischen und EU-Rechtsvorgaben (DSGVO).
- **Isolation:** Logische Mandantentrennung (Multi-Tenancy).
- **Transparenz:** KI-Nachrichten sind im Dashboard klar gekennzeichnet.

## 📞 Support

**Technischer Lead:** Dennis (Founder)  
**Support:** AI-Assisted Support Desk

---
*NeuroConcepts.ai Internal Documentation*
