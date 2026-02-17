# Dev Environment Setup & Stack Updates

Wenn du einen neuen CloudFormation Stack deployst (z.B. weil du den alten gelöscht hast oder eine neue Stage wie `Immivo-Test` aufsetzt), ändern sich die **IDs und URLs** der AWS-Ressourcen (Datenbank, Cognito User Pool, API Gateway).

Damit deine lokale Entwicklungsumgebung (`localhost`) weiterhin funktioniert, musst du diese neuen Werte in die lokalen Konfigurationsdateien übertragen.

## 1. Stack Deployen & Outputs abrufen

Führe den Deploy-Befehl aus:

```bash
cd infra
cdk deploy Immivo-Dev --outputs-file outputs.json
```

Nach dem Deployment werden die "Outputs" im Terminal angezeigt. Du findest sie auch in der Datei `infra/outputs.json`.

Die wichtigsten Werte sind:
*   `UserPoolId` (z.B. `eu-central-1_xxxxxx`)
*   `UserPoolClientId` (z.B. `73cigqbtjg...`)
*   `OrchestratorApiUrl` (z.B. `https://...amazonaws.com/dev/`)
*   `DBEndpoint` (z.B. `...rds.amazonaws.com`)

## 2. Frontend Konfiguration aktualisieren

Datei: `frontend/.env.local`

Aktualisiere diese Datei mit den neuen Cognito-Werten, damit der Login funktioniert.

```env
# API URL für lokale Entwicklung meist localhost, für Prod die AWS URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Diese Werte kommen aus dem neuen Stack:
NEXT_PUBLIC_USER_POOL_ID=eu-central-1_NEUE_ID_HIER
NEXT_PUBLIC_USER_POOL_CLIENT_ID=NEUE_CLIENT_ID_HIER
NEXT_PUBLIC_AWS_REGION=eu-central-1
```

## 3. Backend (Orchestrator) Konfiguration aktualisieren

### Datei: `src/services/orchestrator/.env`

Enthält die Basis-Konfiguration für AWS-Deployment.

```env
# DB Endpoint aus dem Stack Output
DATABASE_URL="postgresql://postgres:DEIN_PASSWORT@AWS_DB_ENDPOINT:5432/postgres"

PORT=3001

# Diese Werte müssen mit dem Frontend übereinstimmen:
USER_POOL_ID=eu-central-1_NEUE_ID_HIER
CLIENT_ID=NEUE_CLIENT_ID_HIER

# AI
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...

# E-Mail (System-Mails via Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@immivo.ai
# Zum Deaktivieren in Dev: RESEND_ENABLED=false
```

### Datei: `src/services/orchestrator/.env.local` (Optional)

Für lokale Entwicklung mit Neon.tech (überschreibt `.env`):

```env
# Neon.tech Connection String für lokale Entwicklung
DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

**Wichtig:** `.env.local` wird von `.gitignore` ignoriert und nicht committed.

## 4. Google/Microsoft OAuth (Falls benötigt)

Wenn sich die Frontend-URL geändert hat, musst du die **Authorized Redirect URI** anpassen:

### Google Cloud Console
*   Lokal: `http://localhost:3000/dashboard/settings/integrations`
*   Dev: `https://dev.immivo.ai/dashboard/settings/integrations`
*   Test: `https://test.immivo.ai/dashboard/settings/integrations`
*   Prod: `https://app.immivo.ai/dashboard/settings/integrations`

### Microsoft Azure Portal
*   Lokal: `http://localhost:3000/dashboard/settings/integrations`
*   Dev: `https://dev.immivo.ai/dashboard/settings/integrations`
*   Test: `https://test.immivo.ai/dashboard/settings/integrations`
*   Prod: `https://app.immivo.ai/dashboard/settings/integrations`

## 5. Neustart

Nach dem Ändern von `.env` Dateien musst du die lokalen Server neu starten:

*   Frontend: `Ctrl+C` -> `npm run dev`
*   Backend: `Ctrl+C` -> `npm run dev`

## 6. Lokale Datenbank (Neon.tech)

Für lokale Entwicklung empfehlen wir **Neon.tech** (kostenlose serverless Postgres):

1. Account erstellen auf https://neon.tech
2. Neues Projekt anlegen (Region: eu-central-1)
3. Connection String kopieren
4. In `.env.local` einfügen

### Prisma Schema lokal synchronisieren

**Wichtig:** Wir nutzen `prisma db push` (nicht `prisma migrate dev`) fuer die lokale Entwicklung. In Production laufen Migrationen automatisch ueber das In-App-System (`applyPendingMigrations()` in `index.ts`). Siehe `docs/ARCHITECTURE.md` → "Datenbank-Migrationen".

```bash
cd src/services/orchestrator

# Schema zur lokalen DB pushen (erstellt/aktualisiert Tabellen):
npx prisma db push

# Prisma Client neu generieren (nach Schema-Aenderungen):
npx prisma generate

# Optional: Prisma Studio oeffnen (DB-GUI):
npx prisma studio
```

### Neue Spalte/Tabelle hinzufuegen

1. Zum Prisma-Schema (`prisma/schema.prisma`) hinzufuegen
2. `npx prisma db push` lokal ausfuehren
3. SQL-Statement zum `migrations`-Array in `applyPendingMigrations()` (index.ts) hinzufuegen
4. `MIGRATION_VERSION` in `index.ts` erhoehen
5. `npx prisma generate` ausfuehren

**Hinweis:** Manche DB-Objekte (pgvector Embeddings, tsvector Spalten, Trigger) sind **nicht** im Prisma-Schema, da Prisma die Typen nicht nativ unterstuetzt. Diese werden nur per Raw SQL in den Migrationen verwaltet. Siehe Kommentar oben in `schema.prisma`.

## 7. AWS Secrets Manager (Alle Stages)

In allen AWS-Stages (Dev, Test, Prod) werden Secrets aus dem **AWS Secrets Manager** geladen:
- `Immivo-App-Secret-dev` — Dev-Stage
- `Immivo-App-Secret-test` — Test-Stage
- `Immivo-App-Secret-prod` — Production

Der Orchestrator liest diese automatisch beim Lambda-Start.

Folgende Keys müssen im Secret hinterlegt sein:
- `DATABASE_URL`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `ENCRYPTION_KEY`
- `FRONTEND_URL` (Dev: `https://dev.immivo.ai`, Test: `https://test.immivo.ai`, Prod: `https://app.immivo.ai`)
- Google/Microsoft OAuth Keys (wenn benötigt)

**Hinzufügen:** AWS Console → Secrets Manager → `Immivo-App-Secret-{stage}` → Retrieve secret value → Edit → Add row.

## 8. Medien-Uploads

- **Production:** AWS S3 Bucket (automatisch via CDK erstellt)
- **Lokal:** Fallback auf `./uploads` Ordner (wird automatisch erstellt)
- Bilder werden über den `/uploads/...` Endpunkt oder direkte S3-URLs ausgeliefert

## 9. Manuelles Lambda-Deployment

Falls GitHub Actions nicht funktioniert, kannst du direkt deployen:

```bash
# CDK Stack synthetisieren
cd infra
rm -rf cdk.out
npx cdk synth Immivo-Dev

# Orchestrator Lambda manuell updaten
cd cdk.out
ASSET_DIR=$(ls -d asset.* | while read d; do if [ -f "$d/index.js" ] && [ $(stat -f%z "$d/index.js") -gt 1000000 ]; then echo "$d"; fi; done | head -1)
cd "$ASSET_DIR"
zip -r /tmp/orchestrator.zip index.js
aws lambda update-function-code \
  --function-name Immivo-Dev-OrchestratorLambdaXXXXX \
  --zip-file fileb:///tmp/orchestrator.zip
```
