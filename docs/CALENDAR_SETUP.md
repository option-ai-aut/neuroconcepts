# Calendar Integration Setup

Diese Anleitung erklärt, wie Sie Google Calendar und Outlook Calendar OAuth-Integration einrichten.

## Google Calendar Setup

### 1. Google Cloud Console

1. Gehen Sie zur [Google Cloud Console](https://console.cloud.google.com/)
2. Erstellen Sie ein neues Projekt oder wählen Sie ein bestehendes aus
3. Aktivieren Sie die **Google Calendar API**:
   - Navigation: APIs & Services > Library
   - Suchen Sie nach "Google Calendar API"
   - Klicken Sie auf "Enable"

### 2. OAuth Credentials erstellen

1. Gehen Sie zu: APIs & Services > Credentials
2. Klicken Sie auf "+ CREATE CREDENTIALS" > "OAuth client ID"
3. Wählen Sie "Web application"
4. Konfigurieren Sie:
   - **Name**: NeuroConcepts Calendar Integration
   - **Authorized JavaScript origins**: 
     - `http://localhost:3001` (Development)
     - `https://your-production-domain.com` (Production)
   - **Authorized redirect URIs**:
     - `http://localhost:3001/calendar/google/callback` (Development)
     - `https://your-production-domain.com/calendar/google/callback` (Production)
5. Klicken Sie auf "Create"
6. Kopieren Sie **Client ID** und **Client Secret**

### 3. Umgebungsvariablen setzen

Fügen Sie in `/src/services/orchestrator/.env` hinzu:

**Für Local Development:**
```env
GOOGLE_CALENDAR_CLIENT_ID=your-client-id-here
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3001/calendar/google/callback
```

**Für Online Dev/Production:**
```env
GOOGLE_CALENDAR_CLIENT_ID=your-client-id-here
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALENDAR_REDIRECT_URI=https://1rnmc2z8eg.execute-api.eu-central-1.amazonaws.com/dev/calendar/google/callback
```

## Microsoft Outlook Calendar Setup

### 1. Azure Portal

1. Gehen Sie zum [Azure Portal](https://portal.azure.com/)
2. Navigieren Sie zu: Azure Active Directory > App registrations
3. Klicken Sie auf "+ New registration"

### 2. App Registration

1. Konfigurieren Sie:
   - **Name**: NeuroConcepts Calendar Integration
   - **Supported account types**: Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts
   - **Redirect URI**: 
     - Platform: Web
     - URI: `http://localhost:3001/calendar/outlook/callback`
2. Klicken Sie auf "Register"

### 3. API Permissions

1. Gehen Sie zu: API permissions
2. Klicken Sie auf "+ Add a permission"
3. Wählen Sie "Microsoft Graph"
4. Wählen Sie "Delegated permissions"
5. Fügen Sie hinzu:
   - `Calendars.ReadWrite`
   - `User.Read`
6. Klicken Sie auf "Add permissions"
7. Klicken Sie auf "Grant admin consent" (wenn Sie Admin sind)

### 4. Client Secret erstellen

1. Gehen Sie zu: Certificates & secrets
2. Klicken Sie auf "+ New client secret"
3. Beschreibung: "Calendar Integration"
4. Expires: 24 months (oder nach Bedarf)
5. Klicken Sie auf "Add"
6. **WICHTIG**: Kopieren Sie den **Value** sofort (wird nur einmal angezeigt!)

### 5. Umgebungsvariablen setzen

Fügen Sie in `/src/services/orchestrator/.env` hinzu:

**Für Local Development:**
```env
MICROSOFT_CLIENT_ID=your-application-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here
MICROSOFT_REDIRECT_URI=http://localhost:3001/calendar/outlook/callback
```

**Für Online Dev/Production:**
```env
MICROSOFT_CLIENT_ID=your-application-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here
MICROSOFT_REDIRECT_URI=https://1rnmc2z8eg.execute-api.eu-central-1.amazonaws.com/dev/calendar/outlook/callback
```

## Testing

### 1. Backend starten

```bash
cd src/services/orchestrator
npm run dev
```

### 2. Frontend starten

```bash
cd frontend
npm run dev
```

### 3. Calendar Integration testen

1. Öffnen Sie: http://localhost:3000/dashboard/settings/calendar
2. Klicken Sie auf "Verbinden" bei Google Calendar oder Outlook Calendar
3. Authentifizieren Sie sich mit Ihrem Account
4. Sie werden zurück zur Settings-Seite weitergeleitet
5. Der Status sollte "Verbunden als [Ihre E-Mail]" anzeigen

## Sicherheit

- **Tokens werden verschlüsselt**: Alle Access und Refresh Tokens werden mit AES-256 verschlüsselt in der Datenbank gespeichert
- **HTTPS in Production**: Verwenden Sie HTTPS für alle OAuth-Callbacks in Production
- **Token Rotation**: Refresh Tokens werden automatisch verwendet, wenn Access Tokens ablaufen

## Troubleshooting

### "redirect_uri_mismatch" Error

- Überprüfen Sie, dass die Redirect URI in der Google Cloud Console/Azure Portal exakt mit der in `.env` übereinstimmt
- Achten Sie auf trailing slashes (mit/ohne `/`)

### "invalid_grant" Error

- Token ist abgelaufen oder ungültig
- Trennen Sie die Verbindung und verbinden Sie neu

### "insufficient_permissions" Error

- Überprüfen Sie, dass alle erforderlichen API Permissions in Azure Portal gewährt wurden
- Klicken Sie auf "Grant admin consent"

## Wichtig: Redirect URIs in OAuth Apps

Sie müssen die Redirect URIs in beiden OAuth-Konsolen (Google Cloud & Azure Portal) konfigurieren:

### Google Cloud Console
Fügen Sie beide URIs hinzu:
- `http://localhost:3001/calendar/google/callback` (für lokale Entwicklung)
- `https://1rnmc2z8eg.execute-api.eu-central-1.amazonaws.com/dev/calendar/google/callback` (für Online Dev)

### Azure Portal
Fügen Sie beide URIs hinzu:
- `http://localhost:3001/calendar/outlook/callback` (für lokale Entwicklung)
- `https://1rnmc2z8eg.execute-api.eu-central-1.amazonaws.com/dev/calendar/outlook/callback` (für Online Dev)

**Hinweis:** Sie können mehrere Redirect URIs in beiden Konsolen hinzufügen. Die OAuth-Bibliotheken wählen automatisch die richtige URI basierend auf der Umgebungsvariable.

## Production Deployment

Für Production:

1. Erstellen Sie separate OAuth Apps für Production
2. Verwenden Sie Production-URLs in den Redirect URIs
3. Setzen Sie die Umgebungsvariablen in Ihrer Production-Umgebung
4. Verwenden Sie HTTPS für alle Callbacks
5. Rotieren Sie Client Secrets regelmäßig
6. Aktualisieren Sie `FRONTEND_URL` mit Ihrer CloudFront-Domain
