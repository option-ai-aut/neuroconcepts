# NeuroConcepts AI - B2B Real Estate Automation Platform

**Status:** Phase 1 (MVP) - Live on AWS Lambda (Dev)  
**Target Launch:** Q2 2026  
**Focus:** DACH Region (Germany, Austria, Switzerland)

## 📖 Projektübersicht

NeuroConcepts AI ist eine B2B-SaaS-Plattform für Immobilienunternehmen (2–5 Mio. € Umsatz), die den Vertriebsprozess automatisiert. Das System führt eingehende Leads (von Portalen oder der Website) vollautomatisch bis zum gebuchten Besichtigungstermin.

**Kernversprechen:** Der Makler greift erst ein, wenn der Termin im Kalender steht oder eine Eskalation notwendig ist.

### Hauptfunktionen (Ticket 1 - MVP)
- **Lead Intake:** Automatische Erfassung aus E-Mail-Weiterleitungen (ImmoScout, Willhaben) und Web-Formularen.
- **Jarvis-Kommunikation:** Google Gemini 3 Flash erstellt personalisierte Exposés und beantwortet Rückfragen in Echtzeit (DE/EN/FR/ES).
- **E-Mail Thread Intelligence:** Ordnet Antworten korrekt zu und führt den Dialog kontextbezogen fort.
- **Kalender-Sync:** Bidirektionale Synchronisation (Google/Outlook) für automatische Terminbuchung.
- **White-Labeling:** Versand über die SMTP-Server des Maklers (eigene Domain).
- **Auth:** Login & Registrierung via AWS Cognito.

## 🛠 Tech Stack

### Infrastructure & Backend
- **Cloud:** AWS (Region: `eu-central-1` Frankfurt)
- **Compute:** AWS Lambda (Serverless) + API Gateway
- **Database:** PostgreSQL (RDS t4g.micro for Dev/Stage, Aurora Serverless for Prod)
- **Language:** Node.js / TypeScript
- **IaC:** AWS CDK

### AI & Intelligence
- **Model:** Google Gemini 3 Flash Preview
- **Features:** Multi-Language Support, Context-Awareness, Sentiment Analysis

### Integrations
- **Payment:** Stripe (Subscriptions, Invoicing)
- **Email:** SMTP/IMAP (User Credentials), AWS SES (System Notifications)
- **Calendar:** Google Calendar API, Microsoft Graph API

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Hosting:** AWS Lambda (via Docker + AWS Lambda Web Adapter)
- **UI:** Tailwind CSS + Amplify UI Components

## 📂 Projektstruktur

```
/
├── docs/                 # Detaillierte Dokumentation
│   ├── ADMIN_ACCESS.md   # Anleitung für Admin-Zugriff
│   ├── ARCHITECTURE.md   # Technische Architektur & Datenflüsse
│   ├── ONBOARDING.md     # Checklisten für neue Kunden
│   └── AI_GUIDELINES.md  # Prompting-Strategien & Sicherheitsregeln
├── frontend/             # Next.js Frontend App (Dockerized)
├── infra/                # AWS CDK Infrastructure Code
├── src/                  # Backend Services (Orchestrator, Email Parser)
└── README.md             # Diese Datei
```

## 🚀 Roadmap

### Phase 1: MVP (Wochen 1–8) - ✅ COMPLETED
- [x] AWS Infrastruktur Setup (VPC, RDS, Lambda)
- [x] E-Mail Inbound Parser & DB Schema
- [x] Jarvis-Engine Integration (Gemini 3)
- [x] SMTP Outbound & Kalender Sync
- [x] Dashboard & Stripe Integration
- [x] Frontend Deployment (AWS Lambda + Docker)
- [x] Authentication (Cognito)

### Phase 2: Post-Termin (Monate 3–6)
- [ ] Follow-up Automatisierung
- [ ] Dokumenten-Management (Uploads)
- [ ] Mietanbot & Digitale Unterschrift
- [ ] Mieter-Ticketing System

## 🔐 Sicherheit & Datenschutz

- **Datenhaltung:** Konform mit österreichischen und EU-Rechtsvorgaben (DSGVO).
- **Isolation:** Logische Mandantentrennung (Multi-Tenancy).
- **Transparenz:** Jarvis-Nachrichten sind im Dashboard klar gekennzeichnet.

## 📞 Support

**Technischer Lead:** Dennis (Founder)  
**Support:** AI-Assisted Support Desk

---
*NeuroConcepts.ai Internal Documentation*
