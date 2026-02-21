# Deploy-Checkliste: Lokal → Test → Main

Dieses Dokument beschreibt alle Schritte die beim Deployen von lokal nach `test` (und `test` nach `main`) zu beachten sind.

---

## Schnell-Referenz: AWS Ressourcen

| Stage | API Gateway URL | Secret Name | CloudFormation Stack |
|-------|----------------|-------------|----------------------|
| test  | `https://8fiutkddgi.execute-api.eu-central-1.amazonaws.com/test` | `Immivo-App-Secret-test` | `Immivo-Test` |
| main  | *(prod URL)* | `Immivo-App-Secret-prod` | `Immivo-Prod` |

---

## Lokal → Test pushen

### 1. Vor dem Push: Code prüfen

```bash
# Lokale TypeScript-Kompilierung prüfen
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
- [ ] Wurde `MIGRATION_VERSION` erhöht (z.B. von 13 auf 14)?

> **Faustregel**: Neue Tabellen → `ensureAdminTables` in `index.ts`. Neue Spalten auf bestehenden Tabellen → `applyPendingMigrations` in `index.ts` + `MIGRATION_VERSION` erhöhen.

### 3. Push ausführen

**Option A: Push-Script (empfohlen)**

```bash
# Auf test deployen
push test

# Auf main (Prod) deployen
push main
```

> Die `push`-Funktion in `~/.zshrc` stasht automatisch ungetrackte/geänderte Dateien (z.B. `telegram-agent/bot-error.log`) vor dem Branch-Wechsel und poppt sie danach wieder. So blockieren lokale Log-Änderungen nicht mehr.

**Option B: Manuell**

```bash
cd /Users/dennis/NeuroConcepts.ai

# Aktuellen Branch-Stand nach test pushen
git add .
git commit -m "feat: ..."
git push origin HEAD:test
```

GitHub Actions deployt automatisch sobald der `test`/`main`-Branch aktualisiert wird. Dauer: **~10–15 Minuten**.

### 4. Nach dem Deploy: Datenbank migrieren

Das ist der **wichtigste Schritt** — ohne diesen fehlen neue Spalten in der DB.

```bash
# ADMIN_SECRET aus AWS Secrets Manager holen und Force-Migrate ausführen
ADMIN_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id Immivo-App-Secret-test \
  --query SecretString \
  --output text \
  --region eu-central-1 | python3 -c "import sys,json; print(json.load(sys.stdin)['ADMIN_SECRET'])")

curl -s -X POST https://8fiutkddgi.execute-api.eu-central-1.amazonaws.com/test/admin/migrate \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"force":true}' | python3 -m json.tool
```

**Erwartete Antwort:**
```json
{
  "success": true,
  "tables": ["User", "Lead", "Property", ...]
}
```

> `force: true` löscht `_MigrationMeta` und führt **alle** Migration-Statements neu aus. Das ist idempotent — jedes Statement hat `IF NOT EXISTS`, also passiert bei bereits vorhandenen Spalten/Tabellen nichts.

### 5. Deployment verifizieren

```bash
# Health Check
curl -s https://8fiutkddgi.execute-api.eu-central-1.amazonaws.com/test/health | python3 -m json.tool

# Login testen (im Browser)
open https://test.immivo.ai
```

Checkliste nach dem Deploy:
- [ ] Login funktioniert
- [ ] Dashboard lädt
- [ ] CRM / Leads öffnet ohne 500er
- [ ] Settings / Billing öffnet ohne Fehler

---

## Test → Main pushen

### Voraussetzung
Test muss **vollständig funktionieren** (Login, Dashboard, CRM, alle Seiten).

### 1. Push

```bash
git push origin test:main
```

GitHub Actions benötigt für `main` eine **manuelle Bestätigung** (Environment Protection). Im GitHub Actions UI auf "Review deployments" → "Approve" klicken.

### 2. Datenbank migrieren (Main/Prod)

```bash
ADMIN_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id Immivo-App-Secret-prod \
  --query SecretString \
  --output text \
  --region eu-central-1 | python3 -c "import sys,json; print(json.load(sys.stdin)['ADMIN_SECRET'])")

curl -s -X POST https://api.immivo.ai/admin/migrate \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -H "Origin: https://app.immivo.ai" \
  -d '{"force":true}' | python3 -m json.tool
```

> **Hinweis:** Prod blockiert Requests ohne `Origin`-Header. Bei curl `-H "Origin: https://app.immivo.ai"` setzen.

> **Achtung bei Main/Prod**: `force:true` ist sicher (idempotent), aber auf Prod nur ausführen wenn neue Schema-Änderungen da sind. Bei reinen Code-Changes ohne Schema-Änderungen reicht ein normaler Aufruf ohne `force`.

---

## Migration-System — Wie es funktioniert

Das Projekt hat **3 Migrations-Schichten**:

| Schicht | Datei | Wann ausgeführt |
|---------|-------|-----------------|
| `migration.sql` | `prisma/migrations/.../migration.sql` | Einmalig bei DB-Setup via `/admin/setup-db` |
| `applyPendingMigrations` | `src/index.ts` | Bei jedem Lambda Cold Start (version-gated) |
| `ensureAdminTables` | `src/index.ts` | Bei jedem Lambda Cold Start (idempotent) |

### Neue Spalte hinzufügen (Schritt-für-Schritt)

1. Spalte in `schema.prisma` hinzufügen
2. In `index.ts`: `MIGRATION_VERSION` um 1 erhöhen
3. In der `migrations`-Array in `applyPendingMigrations` hinzufügen:
   ```typescript
   'ALTER TABLE "MeinModel" ADD COLUMN IF NOT EXISTS "meinFeld" TEXT',
   ```
4. Pushen + nach Deploy `admin/migrate` mit `force:true` aufrufen

### Neue Tabelle hinzufügen (Schritt-für-Schritt)

1. Model in `schema.prisma` hinzufügen
2. In `ensureAdminTables` in `index.ts` einen neuen Block hinzufügen:
   ```typescript
   if (!existing.has('MeinModel')) {
     await db.$executeRawUnsafe(`CREATE TABLE "MeinModel" (...)`);
     created++;
   }
   ```
3. Pushen + nach Deploy `admin/migrate` mit `force:true` aufrufen

---

## Push-Workflow (zshrc)

Das Projekt nutzt eine `push`-Funktion in `~/.zshrc` für vereinfachtes Deployen:

```bash
push test             # commit + push auf test → deployt auf test.immivo.ai
push main             # merged test → main, pushed (braucht GitHub-Approval) → app.immivo.ai
```

**Hinweis:** Die dev-Stage wurde entfernt. Es gibt nur noch test und main.

Die Funktion stasht automatisch ungetrackte/geänderte Dateien (z.B. `bot-error.log`) vor Branch-Wechseln und stellt sie danach wieder her.

## Lokale Entwicklung

Für lokale Entwicklung wird kein separates Stage-Backend benötigt:

```bash
# Backend starten
cd src/services/orchestrator
npm run dev   # startet auf localhost:3001

# Frontend starten
cd frontend
npm run dev   # startet auf localhost:3000
```

Das lokale Frontend verbindet sich automatisch mit `localhost:3001` (via `NODE_ENV === 'development'` Logik in `next.config.mjs`).

---

## Häufige Fehler & Lösungen

### `500` beim Login (`/auth/sync`)
**Ursache**: Spalte fehlt in DB (z.B. `lastSeenAt`, `assistantThreadId`).  
**Fix**: `admin/migrate` mit `force:true` aufrufen (siehe Schritt 4 oben).

### `500` beim CRM / Billing
**Ursache**: Spalte fehlt (z.B. `tenantId` wird aus DB geholt, Tabelle existiert nicht).  
**Fix**: `admin/migrate` mit `force:true` aufrufen.

### Deploy hängt in CloudFormation
**Häufige Ursache**: Security Group Description geändert (immutable Property).  
**Fix**: Nie die `description` eines Security Groups ändern. Sieh `infra/lib/infra-stack.ts`.

### Lambda-Paket zu groß (>262MB)
**Ursache**: `sourceMap: true` in CDK Bundling-Config erzeugt ~110MB Source Maps.  
**Fix**: In `infra-stack.ts` bei `OrchestratorLambda` → `bundling: { sourceMap: false }`.

### `Forbidden` beim Aufrufen von `/admin/migrate`
**Ursache**: Falscher Secret-Name im `aws secretsmanager` Befehl.  
**Korrekte Namen**: `Immivo-App-Secret-test`, `Immivo-App-Secret-prod`.

### Eingehende E-Mails landen nicht (401 Unauthorized)
**Ursache**: `INTERNAL_API_SECRET` fehlt in AWS Secrets Manager oder Email-Parser hat keinen Zugriff auf AppSecret.  
**Fix**: In `Immivo-App-Secret-{stage}` muss der Key `INTERNAL_API_SECRET` existieren. CDK gibt dem Email-Parser `APP_SECRET_ARN` + `grantRead` — nach Deploy sollte es automatisch funktionieren.

### Deploy auf `main` hängt auf "Warten"
**Ursache**: GitHub Actions `environment: production` erfordert manuelle Genehmigung.  
**Fix**: Im GitHub Actions UI → "Review deployments" → "Approve" klicken.

### Lambda crasht mit `DOMMatrix is not defined` (502/500)
**Ursache**: `xlsx` (SheetJS) nutzt Browser-APIs (`DOMMatrix`), die auf AWS Lambda nicht existieren. Wenn der Bundler `xlsx` einbündelt, crasht der Orchestrator beim Startup.  
**Fix**: `xlsx`, `mammoth`, `pdf-parse`, `jszip` müssen in `infra/lib/infra-stack.ts` unter `externalModules` stehen und in `afterBundling` separat installiert werden. Außerdem: `xlsx` nur lazy laden (z.B. per `require('xlsx')` erst bei Excel-Upload).

### Lambda startet nicht: `DOMMatrix is not defined`
**Ursache**: Eine npm-Library (z.B. `xlsx`/SheetJS) wird von esbuild eingebündelt und ihr statischer Initializer braucht Browser-APIs (DOMMatrix), die in Lambda nicht existieren.  
**Fix**: Library zu `externalModules` in `infra/lib/infra-stack.ts` (OrchestratorLambda) hinzufügen UND in `afterBundling` via `npm install` installieren. Aktuell extern: `xlsx`, `mammoth`, `pdf-parse`, `jszip`.

### `push test` schlägt fehl: "local changes would be overwritten by checkout"
**Ursache**: Lokale Datei (z.B. `telegram-agent/bot-error.log`) ist auf dem Ziel-Branch getrackt, aber lokal verändert.  
**Fix**: Die `push`-Funktion in `~/.zshrc` stasht automatisch — falls das Problem erneut auftritt, manuell `git stash` vor `push test` ausführen. Oder: `git rm --cached <datei>` auf dem Ziel-Branch ausführen und pushen.
