# Immivo AI - B2B Real Estate Automation Platform

**Status:** Phase 1 (MVP) - Live on AWS Lambda (Dev)  
**Target Launch:** Q2 2026  
**Focus:** DACH Region (Germany, Austria, Switzerland)

## 📖 Projektübersicht

Immivo AI ist eine B2B-SaaS-Plattform für Immobilienunternehmen (2–5 Mio. € Umsatz), die den Vertriebsprozess automatisiert. Das System führt eingehende Leads (von Portalen oder der Website) vollautomatisch bis zum gebuchten Besichtigungstermin.

**Kernversprechen:** Der Makler greift erst ein, wenn der Termin im Kalender steht oder eine Eskalation notwendig ist.

### Hauptfunktionen (Ticket 1 - MVP)
- **Lead Intake:** Automatische Erfassung aus E-Mail-Weiterleitungen (ImmoScout, Willhaben) und Web-Formularen. Smart Email Processing: AutoClick (Portal-Link-Extraktion via Puppeteer), LeadEnrichment (Duplikat-Check, Telefon-Normalisierung DACH, Vollständigkeit), Sentiment-Analyse (Buying/Risk-Signale).
- **Jarvis-Kommunikation:** OpenAI GPT-5.2 (flagship, Dec 2025) via Chat Completions API mit 64+ Tools, Multi-Agent Router (gpt-5-mini Intent-Klassifikation), pgvector RAG Suche, persistente Konversationen, Multi-Round Tool Calls (bis zu 4 Runden), Live Tool-Tags, Inline-Bilder im Chat, Virtual Staging direkt im Chat.
- **KI-Bildstudio:** Virtual Staging mit Google Gemini (Möblierung). Settings-Sidebar links, Bildvorschau rechts. Auch direkt via Jarvis-Chat nutzbar.
- **E-Mail Thread Intelligence:** Ordnet Antworten korrekt zu und führt den Dialog kontextbezogen fort.
- **Kalender:** AWS WorkMail Kalender via CalDAV mit Google Meet Integration (geplant).
- **White-Labeling:** Versand über OAuth (Gmail/Outlook) mit Makler-Domain.
- **System-Mails:** Benachrichtigungen via Resend API.
- **Bug Reports:** In-App Bug-Reporting mit automatischem Screenshot und Console-Log-Capture.
- **Auth:** Login & Registrierung via AWS Cognito.

## 🛠 Tech Stack

### Infrastructure & Backend
- **Cloud:** AWS (Region: `eu-central-1` Frankfurt)
- **Compute:** AWS Lambda (Serverless) + API Gateway
- **Database:** PostgreSQL (RDS t4g.micro for Dev/Stage, Aurora Serverless for Prod)
- **Language:** Node.js / TypeScript
- **IaC:** AWS CDK

### AI & Intelligence
- **Chat Engine:** OpenAI GPT-5.2 (Jarvis Assistent) via Chat Completions API mit gerouteten Tool-Subsets (Assistants API deprecated, sunset Aug 2026)
- **Router:** GPT-5-mini Multi-Agent Router (Intent-Klassifikation, Tool-Filterung)
- **RAG:** pgvector Embeddings (text-embedding-3-small, 1536 Dimensionen) + Cosine Similarity
- **Image Editing:** Google Gemini (gemini-2.5-flash-image) — Virtual Staging
- **Lead Scoring:** Regelbasierte Scoring Engine (0-100, 6 Faktoren)
- **Predictive Analytics:** Conversion-Wahrscheinlichkeit, optimale Kontaktzeit, Preis-Schätzung (Comparable Analysis)
- **Cache & Queue:** In-Memory Cache (Redis-kompatibel) und Job-Queue (SQS-kompatibel) mit Retry/Backoff
- **A/B Testing:** In-Memory Framework mit gewichteten Varianten, Z-Test Signifikanz
- **Full-Text Search:** PostgreSQL tsvector/tsquery mit deutscher Stemming
- **Features:** Semantische Suche, Multi-Language, Context-Awareness, Follow-Up Automatisierung

### Integrations
- **Payment:** Stripe (Subscriptions, Invoicing)
- **Email Inbound:** AWS SES → Email-Parser Lambda
- **Email Outbound (Leads):** Gmail/Outlook via OAuth
- **Email Outbound (System):** Resend API
- **Email Postfächer:** AWS WorkMail (4 Seats)
- **Calendar:** AWS WorkMail CalDAV (geplant: Google Meet)
- **Media Storage:** AWS S3 via CloudFront CDN (`media.immivo.ai`)
- **CDN:** AWS CloudFront (app/api/admin/media.immivo.ai)
- **DNS:** AWS Route53 (`immivo.ai` Hosted Zone)

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
│   ├── AI_GUIDELINES.md  # Prompting-Strategien & Sicherheitsregeln
│   ├── JARVIS_CAPABILITIES.md # Alle Jarvis-Tools & Fähigkeiten (64+ Tools)
│   ├── ONBOARDING.md     # Checklisten für neue Kunden
│   ├── PROPERTY_FIELDS_RESEARCH.md # Property-Felder Spezifikation
│   ├── FILE_PROCESSING.md # Datei-Import (CSV, Excel, PDF)
│   ├── CONVERSATION_MEMORY.md # Jarvis Gedächtnis-System
│   └── DEV_ENVIRONMENT_SETUP.md # Anleitung für Dev-Environment & Stack Updates
├── frontend/             # Next.js Frontend App (Dockerized)
├── infra/                # AWS CDK Infrastructure Code
├── src/                  # Backend Services (Orchestrator, Email Parser)
└── README.md             # Diese Datei
```

## 🚀 Roadmap

### Phase 1: MVP - ✅ COMPLETED
- [x] AWS Infrastruktur Setup (VPC, RDS, Lambda, S3)
- [x] E-Mail Inbound Parser & DB Schema
- [x] Jarvis-Engine Integration (OpenAI GPT-5-mini)
- [x] KI-Bildstudio (Google Gemini Virtual Staging + Jarvis-Integration)
- [x] Exposé-Editor mit KI-Unterstützung
- [x] CRM (Leads, Objekte, Bildupload zu S3, erweiterte Property-Felder)
- [x] Dashboard & Admin Panel (real data)
- [x] Frontend Deployment (AWS Lambda + Docker)
- [x] Authentication (Cognito)
- [x] System-E-Mails via Resend
- [x] Bug Reports mit Screenshot + Console-Log-Capture
- [x] Dark Mode
- [x] Jarvis Multi-Round Tool Calls (bis zu 8 Runden)
- [x] Virtual Staging via Jarvis-Chat
- [x] Live Tool-Tags & Inline-Bilder im Chat

### Intelligence Roadmap - ✅ COMPLETED (16/22)
- [x] DB Composite Indexes (Lead, Property, User)
- [x] Query Parallelisierung (Promise.all Dashboard)
- [x] Cold-Start Optimierung (versionsbasierte Migrationen)
- [x] Bild-Kompression mit sharp (WebP, Thumbnails)
- [x] Frontend Bundle Optimierung (Fonts, Package Imports)
- [x] Chat Completions API mit gerouteten Tools (Assistants API deprecated)
- [x] pgvector RAG (semantische Suche, Embeddings)
- [x] Multi-Agent Router (gpt-5-mini Intent-Klassifikation)
- [x] Fine-Tuning Daten-Export (JSONL)
- [x] Lead Scoring Engine (0-100, 6 Faktoren)
- [x] Intelligente Property-Empfehlungen (Regel + Embedding)
- [x] Follow-Up Sequenzen (Tag 3/7/14, EventBridge)
- [x] Prisma Connection Pooling
- [x] Structured Logging (CloudWatch JSON)
- [x] Security Headers (HSTS, XSS, Frame)
- [x] PostgreSQL Full-Text Search (tsvector/tsquery)

### Phase 3.4 - Smart Email Processing - ✅ COMPLETED
- [x] AutoClickService: Puppeteer-basierte Extraktion von Lead-Daten aus Portal-Links
- [x] LeadEnrichmentService: Duplikat-Check, Telefon-Normalisierung (DE/AT/CH), Vollständigkeits-Score (0-100%)
- [x] SentimentService: KI-Sentiment-Analyse (gpt-5-mini) für E-Mail-Antworten, Buying/Risk-Signale

### Phase 4.1 - CacheService - ✅ COMPLETED
- [x] In-Memory Cache mit Redis-kompatiblem Interface (get/set/getJSON/setJSON, TTL, Rate Limiting, getOrSet)

### Phase 4.4 - QueueService - ✅ COMPLETED
- [x] In-Memory Job-Queue (SQS-kompatibel), Retry mit Exponential Backoff, Concurrency 3

### Phase 5.2 - Predictive Analytics - ✅ COMPLETED
- [x] PredictiveService: Conversion-Wahrscheinlichkeit (0-99%), optimale Kontaktzeit, Preis-Schätzung (IQR Outlier-Entfernung)

### Phase 5.4 - A/B Testing - ✅ COMPLETED
- [x] ABTestService: In-Memory Framework, gewichtete Varianten, MD5-Assignment, Z-Test Signifikanz

### Phase 2: Kalender & Automatisierung
- [ ] AWS WorkMail CalDAV Integration
- [ ] Demo-Buchung auf Landing Page (öffentlich)
- [ ] Google Meet Integration für Videocalls
- [x] Follow-up Automatisierung (Tag 3/7/14)
- [ ] Dokumenten-Management
- [ ] Mietanbot & Digitale Unterschrift

## 🔐 Sicherheit & Datenschutz

- **Datenhaltung:** Konform mit österreichischen und EU-Rechtsvorgaben (DSGVO).
- **Isolation:** Logische Mandantentrennung (Multi-Tenancy).
- **Transparenz:** Jarvis-Nachrichten sind im Dashboard klar gekennzeichnet.

## 📞 Support

**Technischer Lead:** Dennis (Founder)  
**Support:** AI-Assisted Support Desk

---
*Immivo.ai Internal Documentation*
