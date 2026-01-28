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

Datei: `src/services/orchestrator/.env`

Damit das lokale Backend (`npm run dev`) Token verifizieren und auf die DB zugreifen kann.

```env
# DB Endpoint aus dem Stack Output (Passwort bleibt meist gleich, wenn im Code nicht geändert)
DATABASE_URL="postgresql://postgres:DEIN_PASSWORT@NEUER_DB_ENDPOINT:5432/postgres"

PORT=3001

# Diese Werte müssen mit dem Frontend übereinstimmen:
USER_POOL_ID=eu-central-1_NEUE_ID_HIER
CLIENT_ID=NEUE_CLIENT_ID_HIER
```

## 4. Google OAuth (Falls benötigt)

Wenn sich die Frontend-URL geändert hat (z.B. bei einer neuen Stage auf AWS Lambda), musst du die **Authorized Redirect URI** in der [Google Cloud Console](https://console.cloud.google.com/) anpassen:

*   Lokal: `http://localhost:3000/api/auth/callback/google`
*   Live (Dev/Stage): `https://NEUE-LAMBDA-URL.on.aws/api/auth/callback/google`

## 5. Neustart

Nach dem Ändern von `.env` Dateien musst du die lokalen Server neu starten:

*   Frontend: `Ctrl+C` -> `npm run dev`
*   Backend: `Ctrl+C` -> `npm run dev`
