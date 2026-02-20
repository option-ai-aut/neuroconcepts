# Deploy-Checkliste: Dev → Test → Main

Dieses Dokument beschreibt alle Schritte die beim Pushen von `dev` nach `test` (und `test` nach `main`) zu beachten sind.

---

## Schnell-Referenz: AWS Ressourcen

| Stage | API Gateway URL | Secret Name | CloudFormation Stack |
|-------|----------------|-------------|----------------------|
| dev   | `https://7mb9n425ui.execute-api.eu-central-1.amazonaws.com/dev` | `Immivo-App-Secret-dev` | `Immivo-Dev` |
| test  | `https://8fiutkddgi.execute-api.eu-central-1.amazonaws.com/test` | `Immivo-App-Secret-test` | `Immivo-Test` |
| main  | *(prod URL)* | `Immivo-App-Secret-prod` | `Immivo-Prod` |

---

## Dev → Test pushen

### 1. Vor dem Push: Code prüfen

```bash
# Lokale Tests laufen lassen
cd src/services/orchestrator
npm run build   # TypeScript-Fehler prüfen

cd ../../..
cd frontend
npm run build   # Next.js Build prüfen
```

### 2. Schema-Änderungen prüfen

Hat sich `schema.prisma` geändert? Wenn ja:

- [ ] Ist jede neue Tabelle in `migration.sql` ODER in `applyPendingMigrations` ODER in `ensureAdminTables` abgedeckt?
- [ ] Ist jede neue Spalte in `applyPendingMigrations` als `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` enthalten?
- [ ] Wurde `MIGRATION_VERSION` erhöht (z.B. von 13 auf 14)?

> **Faustregel**: Neue Tabellen → `ensureAdminTables` in `index.ts`. Neue Spalten auf bestehenden Tabellen → `applyPendingMigrations` in `index.ts` + `MIGRATION_VERSION` erhöhen.

### 3. Push ausführen

```bash
cd /Users/dennis/NeuroConcepts.ai

# Option A: Nur den aktuellen dev-Stand nach test pushen
git push origin dev:test

# Option B: Erst committen, dann pushen
git add .
git commit -m "feat: ..."
git push origin dev
git push origin dev:test
```

GitHub Actions deployt automatisch sobald `test` Branch aktualisiert wird. Dauer: **~10–15 Minuten**.

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

### 2. Datenbank migrieren (Main/Prod)

```bash
ADMIN_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id Immivo-App-Secret-prod \
  --query SecretString \
  --output text \
  --region eu-central-1 | python3 -c "import sys,json; print(json.load(sys.stdin)['ADMIN_SECRET'])")

curl -s -X POST <PROD_API_URL>/admin/migrate \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"force":true}' | python3 -m json.tool
```

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
**Korrekte Namen**: `Immivo-App-Secret-dev`, `Immivo-App-Secret-test`, `Immivo-App-Secret-prod`.

---

## Dev-Stage: Force-Migrate (Referenz)

```bash
ADMIN_SECRET=$(aws secretsmanager get-secret-value \
  --secret-id Immivo-App-Secret-dev \
  --query SecretString \
  --output text \
  --region eu-central-1 | python3 -c "import sys,json; print(json.load(sys.stdin)['ADMIN_SECRET'])")

curl -s -X POST https://7mb9n425ui.execute-api.eu-central-1.amazonaws.com/dev/admin/migrate \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET" \
  -d '{"force":true}' | python3 -m json.tool
```
