# Deploy-Checkliste: Lokal → Test → Main

Dieses Dokument beschreibt alle Schritte beim Deployen von lokal nach `test` (und `test` nach `main`).

---

## Automatische Safeguards (seit 2026-02-22)

Nach **jedem** CDK-Deploy (`push test` oder `push main`) führt die GitHub Actions Pipeline **automatisch** aus:

1. `POST /admin/setup-db` — erstellt alle Core-Tabellen falls sie fehlen (idempotent)
2. `POST /admin/migrate?force=true` — wendet alle Schema-Änderungen an (idempotent)
3. `POST /admin/seed-portals` — befüllt Portal-Tabelle (idempotent, upsert)
4. `GET /health` — verifiziert dass der Lambda antwortet

**Das bedeutet:** Ein leeres/frisches DB-Schema kann nicht mehr passieren. Selbst wenn Aurora neu provisioniert wird, repariert sich die DB bei jedem Deploy automatisch. Schlägt einer dieser Schritte fehl, scheitert der gesamte Deploy-Job und du wirst benachrichtigt.

---

## Schnell-Referenz: AWS Ressourcen

| Stage | API Gateway URL | Secret Name | CloudFormation Stack | Frontend |
|-------|----------------|-------------|----------------------|---------|
| test  | `https://8fiutkddgi.execute-api.eu-central-1.amazonaws.com/test` | `Immivo-App-Secret-test` | `Immivo-Test` | `test.immivo.ai` |
| prod  | `https://6bvhhew3b0.execute-api.eu-central-1.amazonaws.com/prod` | `Immivo-App-Secret-prod` | `Immivo-Prod` | `app.immivo.ai` |

---

## Lokal → Test pushen

### 1. Vor dem Push: Code prüfen

```bash
# TypeScript kompilierung prüfen
cd src/services/orchestrator
npm run build

cd ../../..
cd frontend
npm run build   # Next.js Build prüfen
```

### 2. Schema-Änderungen prüfen

Hat sich `schema.prisma` geändert? Wenn ja:

- [ ] Ist jede neue Tabelle in `ensureAdminTables` abgedeckt?
- [ ] Ist jede neue Spalte in `applyPendingMigrations` als `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` enthalten?
- [ ] Wurde `MIGRATION_VERSION` erhöht? (aktuell: **14**, nach v5-Audit — `WebhookEvent`-Tabelle)

> **Faustregel**: Neue Tabellen → `ensureAdminTables` in `index.ts`. Neue Spalten auf bestehenden Tabellen → `applyPendingMigrations` in `index.ts` + `MIGRATION_VERSION` erhöhen.

### 3. Push ausführen

**Option A: Push-Script (empfohlen)**

```bash
push test
```

**Option B: Manuell**

```bash
cd /Users/dennis/NeuroConcepts.ai
git add .
git commit -m "feat: ..."
git push origin HEAD:test
```

GitHub Actions deployt automatisch sobald der `test`-Branch aktualisiert wird. Dauer: **~10–15 Minuten**.

### 4. Deploy beobachten

Die Pipeline führt nach dem CDK-Deploy automatisch aus:
- setup-db → migrate → seed-portals → health-check

Alle 4 Schritte müssen grün sein. Wenn einer rot wird → Deploy-Job schlägt fehl, kein weiteres Handeln notwendig bis das Problem behoben ist.

### 5. Nach dem Deploy: Manuell verifizieren

```bash
# Health Check
curl -s https://8fiutkddgi.execute-api.eu-central-1.amazonaws.com/test/health

# Login im Browser testen
open https://test.immivo.ai
```

Pflicht-Checkliste nach dem Deploy auf test:
- [ ] Login funktioniert (kein 500 bei `/auth/sync`)
- [ ] Dashboard lädt vollständig
- [ ] CRM / Leads öffnet ohne 500er
- [ ] Settings → Portale zeigt Portal-Cards
- [ ] Settings → Billing öffnet ohne Fehler
- [ ] Team Chat funktioniert
- [ ] Einstellungen → E-Mail konfigurierbar

**Erst wenn alle Punkte gecheckt sind → main pushen.**

---

## Test → Main pushen

### Voraussetzung (STRIKT)

Test muss **vollständig** die 7-Punkte-Checkliste oben bestehen. Kein Punkt darf offen sein.

### 1. Push

```bash
git push origin test:main
```

GitHub Actions benötigt für `main` eine **manuelle Bestätigung** (Environment Protection).  
Im GitHub Actions UI → "Review deployments" → "Approve" klicken.

### 2. Deploy Pipeline beobachten

Die Pipeline führt nach dem CDK-Deploy automatisch aus:
- setup-db → migrate → seed-portals → health-check

Alle 4 Schritte müssen grün sein.

### 3. Nach dem Deploy: Prod verifizieren

```bash
curl -s https://6bvhhew3b0.execute-api.eu-central-1.amazonaws.com/prod/health \
  -H "Origin: https://app.immivo.ai"

open https://app.immivo.ai/login
```

Pflicht-Checkliste nach dem Prod-Deploy:
- [ ] Login auf `app.immivo.ai` funktioniert
- [ ] Dashboard lädt ohne 500er
- [ ] CRM / Leads öffnet
- [ ] Settings → Portale zeigt Portal-Cards
- [ ] Billing öffnet ohne Fehler

---

## Migration-System — Wie es funktioniert

Das Projekt hat **3 Migrations-Schichten**:

| Schicht | Datei | Wann ausgeführt |
|---------|-------|-----------------|
| `migration.sql` | `prisma/migrations/.../migration.sql` | Via `/admin/setup-db` — einmalig bei neuem DB-Schema, idempotent |
| `applyPendingMigrations` | `src/index.ts` | Bei jedem Lambda Cold Start (version-gated) + via `/admin/migrate` |
| `ensureAdminTables` | `src/index.ts` | Bei jedem Lambda Cold Start (idempotent) |

**Wichtig**: `admin/setup-db` erstellt alle Core-Tabellen (User, Tenant, Portal, Channel, Message, ...). `applyPendingMigrations` fügt nur neue Spalten/Zusatztabellen hinzu. Beide werden jetzt bei jedem Deploy automatisch aufgerufen.

### Neue Spalte hinzufügen (Schritt-für-Schritt)

1. Spalte in `schema.prisma` hinzufügen
2. In `index.ts`: `MIGRATION_VERSION` um 1 erhöhen
3. In der `migrations`-Array in `applyPendingMigrations` hinzufügen:
   ```typescript
   'ALTER TABLE "MeinModel" ADD COLUMN IF NOT EXISTS "meinFeld" TEXT',
   ```
4. `push test` → Pipeline führt migrate automatisch aus

### Neue Tabelle hinzufügen (Schritt-für-Schritt)

1. Model in `schema.prisma` hinzufügen
2. In `ensureAdminTables` in `index.ts` einen neuen Block hinzufügen:
   ```typescript
   if (!existing.has('MeinModel')) {
     await db.$executeRawUnsafe(`CREATE TABLE "MeinModel" (...)`);
     created++;
   }
   ```
3. `push test` → Pipeline führt setup-db + migrate automatisch aus

---

## Push-Workflow (zshrc)

Das Projekt nutzt eine `push`-Funktion in `~/.zshrc`:

```bash
push test    # commit + push auf test → deployt auf test.immivo.ai
push main    # merged test → main, pushed (braucht GitHub-Approval) → app.immivo.ai
```

Die Funktion stasht automatisch ungetrackte/geänderte Dateien vor Branch-Wechseln und stellt sie danach wieder her.

## Lokale Entwicklung

```bash
# Backend starten
cd src/services/orchestrator
npm run dev   # startet auf localhost:3001

# Frontend starten
cd frontend
npm run dev   # startet auf localhost:3000
```

Das lokale Frontend verbindet sich automatisch mit `localhost:3001` (via `NODE_ENV === 'development'` in `next.config.mjs`).

---

## Häufige Fehler & Lösungen

### `500` beim Login (`/auth/sync`)
**Ursache A**: Tabellen fehlen in DB (Core-Schema nie initialisiert).  
**Fix**: `POST /admin/setup-db` aufrufen (passiert jetzt automatisch im Deploy).

**Ursache B**: Spalte fehlt in DB (z.B. `lastSeenAt`, `assistantThreadId`).  
**Fix**: `POST /admin/migrate` mit `{"force":true}` aufrufen (passiert jetzt automatisch im Deploy).

### `500` beim CRM / Billing
**Ursache**: Tabelle oder Spalte fehlt.  
**Fix**: `admin/migrate` mit `force:true` aufrufen.

### Keine Portal-Cards in Einstellungen
**Ursache**: Portal-Tabelle leer (seed nie ausgeführt).  
**Fix**: `POST /admin/seed-portals` aufrufen (passiert jetzt automatisch im Deploy).

### Deploy hängt in CloudFormation
**Häufige Ursache**: Security Group Description geändert (immutable Property).  
**Fix**: Nie die `description` eines Security Groups ändern. Sieh `infra/lib/infra-stack.ts`.

### Lambda-Paket zu groß (>262MB)
**Ursache**: `sourceMap: true` in CDK Bundling-Config erzeugt ~110MB Source Maps, oder unnötige platform-spezifische Binaries (`@napi-rs/canvas`, `pdfjs-dist`).  
**Fix**: In `infra-stack.ts` bei `OrchestratorLambda` → `bundling: { sourceMap: false }`. Bei manuellem Deploy: S3-basiertes Upload verwenden (`aws s3 cp orchestrator.zip s3://... && aws lambda update-function-code --s3-bucket ... --s3-key ...`).

### `Forbidden` beim Aufrufen von `/admin/migrate`
**Ursache**: Falscher Secret-Name im `aws secretsmanager` Befehl.  
**Korrekte Namen**: `Immivo-App-Secret-test`, `Immivo-App-Secret-prod`.

### Deploy auf `main` hängt auf "Warten"
**Ursache**: GitHub Actions `environment: production` erfordert manuelle Genehmigung.  
**Fix**: Im GitHub Actions UI → "Review deployments" → "Approve" klicken.

### Lambda crasht mit `DOMMatrix is not defined` (502/500)
**Ursache**: `xlsx` (SheetJS) oder `pdf-parse` (via `pdfjs-dist`) nutzen Browser-APIs (`DOMMatrix`), die auf AWS Lambda nicht existieren.  
**Fix**: `xlsx`, `mammoth`, `pdf-parse`, `jszip`, `sharp` müssen in `infra/lib/infra-stack.ts` unter `externalModules` stehen und in `afterBundling` separat installiert werden. Außerdem: `xlsx`, `pdf-parse` und `sharp` werden **lazy geladen** (erst bei Bedarf per `require()`), damit Lambda-Startup nicht crasht.

### `push test` schlägt fehl: "local changes would be overwritten by checkout"
**Ursache**: Lokale Datei ist auf dem Ziel-Branch getrackt, aber lokal verändert.  
**Fix**: Die `push`-Funktion in `~/.zshrc` stasht automatisch — falls Problem erneut auftritt, manuell `git stash` vor `push test` ausführen.

### Post-Deploy Step schlägt fehl: `curl: (22) The requested URL returned error: 403`
**Ursache**: ADMIN_SECRET konnte nicht aus Secrets Manager geladen werden (IAM-Rechte fehlen für Deploy-Role).  
**Fix**: Sicherstellen dass `AWS_DEPLOY_ROLE_ARN` IAM-Recht `secretsmanager:GetSecretValue` auf `Immivo-App-Secret-*` hat.

### Stripe-Webhook wird doppelt verarbeitet
**Ursache**: `WebhookEvent`-Tabelle noch nicht migriert (MIGRATION_VERSION 14 noch nicht angewendet).  
**Fix**: `POST /admin/migrate` mit `force:true` aufrufen (passiert automatisch im Deploy-Pipeline).
