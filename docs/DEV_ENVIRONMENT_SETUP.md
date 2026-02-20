# Lokale Entwicklung & Stack Updates

Wenn du einen neuen CloudFormation Stack deployst (z.B. weil du den alten gelöscht hast oder eine neue Stage wie `Immivo-Test` aufsetzt), ändern sich die **IDs und URLs** der AWS-Ressourcen (Datenbank, Cognito User Pool, API Gateway).

Damit deine lokale Entwicklungsumgebung (`localhost`) weiterhin funktioniert, musst du diese neuen Werte in die lokalen Konfigurationsdateien übertragen.

## Workflow

```
Lokal entwickeln → push test → (manuell approve) → push main (Prod)
```

Shell-Shortcuts (in `~/.zshrc` konfiguriert):
```bash
push test "mein feature"   # commit + push auf test branch → test.immivo.ai
push main                  # test → main mergen + pushen → app.immivo.ai
```

---

## 1. Lokale Umgebung starten

```bash
# Backend (Orchestrator)
cd src/services/orchestrator
npm run dev   # startet auf localhost:3001

# Frontend (in neuem Terminal)
cd frontend
npm run dev   # startet auf localhost:3000
```

Das Frontend verbindet sich im `development`-Modus automatisch mit `localhost:3001` (via CSP in `next.config.mjs`).

---

## 2. Frontend Konfiguration (`frontend/.env.local`)

```env
# Lokale Entwicklung: Backend auf localhost
NEXT_PUBLIC_API_URL=http://localhost:3001

# Cognito-Werte aus dem test/prod Stack (für Login via AWS Cognito):
NEXT_PUBLIC_USER_POOL_ID=eu-central-1_XXXXXXXX
NEXT_PUBLIC_USER_POOL_CLIENT_ID=XXXXXXXXXXXXXXXX
NEXT_PUBLIC_AWS_REGION=eu-central-1
```

Werte findest du in: AWS Console → CloudFormation → `Immivo-Test` → Outputs.

---

## 3. Backend Konfiguration (`src/services/orchestrator/.env`)

```env
PORT=3001

# Lokale DB (Neon.tech empfohlen, siehe unten)
DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Cognito (muss mit Frontend übereinstimmen)
USER_POOL_ID=eu-central-1_XXXXXXXX
CLIENT_ID=XXXXXXXXXXXXXXXX

# AI
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# E-Mail (System-Mails via Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@immivo.ai

# Interner Service-zu-Service-Auth (Email-Parser → Orchestrator)
# Für lokale Dev: beliebiger Wert (z.B. local-dev-internal-secret)
# AWS: In Immivo-App-Secret-{stage} als INTERNAL_API_SECRET hinterlegt
INTERNAL_API_SECRET=local-dev-internal-secret
```

**Hinweis:** `.env.local` wird von `.gitignore` ignoriert und nicht committed.

---

## 4. Lokale Datenbank (Neon.tech)

Für lokale Entwicklung empfehlen wir **Neon.tech** (kostenlose serverless Postgres):

1. Account erstellen auf https://neon.tech
2. Neues Projekt anlegen (Region: eu-central-1)
3. Connection String kopieren
4. In `src/services/orchestrator/.env` als `DATABASE_URL` einfügen

### Schema synchronisieren

```bash
cd src/services/orchestrator

# Schema zur lokalen DB pushen (erstellt/aktualisiert Tabellen):
npx prisma db push

# Prisma Client neu generieren (nach Schema-Änderungen):
npx prisma generate

# Optional: Prisma Studio öffnen (DB-GUI):
npx prisma studio
```

### Neue Spalte/Tabelle hinzufügen

1. Zum Prisma-Schema (`prisma/schema.prisma`) hinzufügen
2. `npx prisma db push` lokal ausführen
3. SQL-Statement zum `migrations`-Array in `applyPendingMigrations()` (`index.ts`) hinzufügen
4. `MIGRATION_VERSION` in `index.ts` erhöhen
5. `npx prisma generate` ausführen

**Hinweis:** Manche DB-Objekte (pgvector Embeddings, tsvector Spalten, Trigger) sind **nicht** im Prisma-Schema, da Prisma die Typen nicht nativ unterstützt. Diese werden nur per Raw SQL in den Migrationen verwaltet.

---

## 5. Google/Microsoft OAuth (Falls benötigt)

Wenn sich die Frontend-URL geändert hat, musst du die **Authorized Redirect URI** anpassen:

### Google Cloud Console
- Lokal: `http://localhost:3000/dashboard/settings/integrations`
- Test: `https://test.immivo.ai/dashboard/settings/integrations`
- Prod: `https://app.immivo.ai/dashboard/settings/integrations`

### Microsoft Azure Portal
- Lokal: `http://localhost:3000/dashboard/settings/integrations`
- Test: `https://test.immivo.ai/dashboard/settings/integrations`
- Prod: `https://app.immivo.ai/dashboard/settings/integrations`

---

## 6. AWS Secrets Manager (Test & Prod)

In allen AWS-Stages werden Secrets aus dem **AWS Secrets Manager** geladen:
- `Immivo-App-Secret-test` — Test-Stage
- `Immivo-App-Secret-prod` — Production

Der Orchestrator liest diese automatisch beim Lambda-Start.

Folgende Keys müssen im Secret hinterlegt sein:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `ENCRYPTION_KEY`
- `FRONTEND_URL` (Test: `https://test.immivo.ai`, Prod: `https://app.immivo.ai`)
- `ADMIN_SECRET` (für `/admin/migrate` Endpoint)
- `INTERNAL_API_SECRET` (für interne Endpoints: `/internal/ingest-lead`, `/emails/incoming`)
- Google/Microsoft OAuth Keys

**Hinzufügen:** AWS Console → Secrets Manager → `Immivo-App-Secret-{stage}` → Retrieve secret value → Edit → Add row.

**INTERNAL_API_SECRET:** Bereits per AWS CLI in test und prod gesetzt (siehe `docs/SECURITY_AUDIT_V4.md`).

---

## 7. Nach dem Deploy: Datenbank migrieren

Nach jedem Deploy auf test oder prod — besonders wenn Schema-Änderungen dabei sind:

```bash
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

Vollständige Checkliste: siehe `docs/DEPLOY_CHECKLIST.md`.

---

## 8. Medien-Uploads

- **Production/Test:** AWS S3 Bucket (automatisch via CDK erstellt), ausgeliefert via CloudFront CDN
- **Lokal:** Fallback auf `./uploads` Ordner (wird automatisch erstellt)
