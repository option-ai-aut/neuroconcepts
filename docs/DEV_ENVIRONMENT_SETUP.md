# Dev Environment Setup & Stack Updates

Wenn du einen neuen CloudFormation Stack deployst (z.B. weil du den alten gelöscht hast oder eine neue Stage wie `NeuroConcepts-Stage` aufsetzt), ändern sich die **IDs und URLs** der AWS-Ressourcen (Datenbank, Cognito User Pool, API Gateway).

Damit deine lokale Entwicklungsumgebung (`localhost`) weiterhin funktioniert, musst du diese neuen Werte in die lokalen Konfigurationsdateien übertragen.

## 1. Stack Deployen & Outputs abrufen

Führe den Deploy-Befehl aus:

```bash
cd infra
cdk deploy NeuroConcepts-Dev --outputs-file outputs.json
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
```

### Datei: `src/services/orchestrator/.env.local` (Optional)

Für lokale Entwicklung mit Neon.tech (überschreibt `.env`):

```env
# Neon.tech Connection String für lokale Entwicklung
DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"
```

**Wichtig:** `.env.local` wird von `.gitignore` ignoriert und nicht committed.

## 4. Google/Microsoft OAuth (Falls benötigt)

Wenn sich die Frontend-URL geändert hat (z.B. bei einer neuen Stage auf AWS Lambda), musst du die **Authorized Redirect URI** anpassen:

### Google Cloud Console
*   Lokal: `http://localhost:3000/dashboard/settings/integrations`
*   Live (Dev/Stage): `https://NEUE-LAMBDA-URL.on.aws/dashboard/settings/integrations`

### Microsoft Azure Portal
*   Lokal: `http://localhost:3000/dashboard/settings/integrations`
*   Live (Dev/Stage): `https://NEUE-LAMBDA-URL.on.aws/dashboard/settings/integrations`

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

### Prisma Migrationen lokal ausführen

```bash
cd src/services/orchestrator
DATABASE_URL="postgresql://..." npx prisma migrate dev
npx prisma generate
```

## 7. Manuelles Lambda-Deployment

Falls GitHub Actions nicht funktioniert, kannst du direkt deployen:

```bash
# CDK Stack synthetisieren
cd infra
rm -rf cdk.out
npx cdk synth NeuroConcepts-Dev

# Orchestrator Lambda manuell updaten
cd cdk.out
ASSET_DIR=$(ls -d asset.* | while read d; do if [ -f "$d/index.js" ] && [ $(stat -f%z "$d/index.js") -gt 1000000 ]; then echo "$d"; fi; done | head -1)
cd "$ASSET_DIR"
zip -r /tmp/orchestrator.zip index.js
aws lambda update-function-code \
  --function-name NeuroConcepts-Dev-OrchestratorLambdaXXXXX \
  --zip-file fileb:///tmp/orchestrator.zip
```
