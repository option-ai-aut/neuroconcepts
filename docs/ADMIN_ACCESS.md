# Admin Access Guide

## 🔐 Zugriff auf den Admin-Bereich

Der Admin-Bereich ist das Herzstück der Plattform für dich als Founder und deine Mitarbeiter. Hier hast du die volle Kontrolle über alle Mandanten, User und Einstellungen.

### Wie komme ich hin?

**Frontend URL (Dev):** `https://LAMBDA-URL.lambda-url.eu-central-1.on.aws/admin`

Der Admin-Bereich ist über `/admin` erreichbar und durch eine Middleware geschützt, die prüft ob `user.role === 'SUPER_ADMIN'` ist.

### Admin-User erstellen (Manuell)

Da wir noch keine Admin-Registrierungsseite haben, musst du den ersten Super-Admin direkt in der Datenbank anlegen.

1.  **Verbinde dich mit der Datenbank:**
    *   Hole dir das Passwort aus dem AWS Secrets Manager (`NeuroConcepts-DB-Secret-dev`).
    *   Nutze ein Tool wie **TablePlus** oder **DBeaver**.
    *   Host: Siehe CloudFormation Output `DBEndpoint` (in der AWS Konsole).

2.  **SQL-Befehl ausführen:**
    ```sql
    INSERT INTO "Tenant" (id, name, "updatedAt") 
    VALUES ('default-tenant', 'NeuroConcepts HQ', NOW());

    INSERT INTO "User" (id, email, name, "tenantId", role) 
    VALUES (gen_random_uuid(), 'deine.email@neuroconcepts.ai', 'Dennis (Founder)', 'default-tenant', 'SUPER_ADMIN');
    ```

### Sicherheits-Konzept

*   **Rollen:**
    *   `SUPER_ADMIN`: Darf alles (auch andere Tenants sehen).
    *   `ADMIN`: Darf nur seinen eigenen Tenant verwalten.
    *   `AGENT`: Darf nur Leads bearbeiten.
*   **Schutz:** Der Admin-Bereich im Frontend wird durch eine Middleware geschützt, die prüft, ob `user.role === 'SUPER_ADMIN'` ist.
*   **Auth:** Custom Login-Formular mit AWS Cognito (keine Amplify Authenticator UI).

---

## 🛠 Troubleshooting

### Aurora Serverless (Free Tier / Limits)

Falls das Deployment von `NeuroConcepts-Prod` fehlschlägt mit Kapazitätsfehlern:
Wir haben die Konfiguration angepasst (`serverlessV2MaxCapacity: 4`).

### Frontend "Cold Starts"

Da das Frontend auf Lambda läuft, kann der erste Aufruf nach einer Pause 3-5 Sekunden dauern. Das ist normal und spart Kosten (Scale to Zero).

### GitHub Actions "Queued"

Falls GitHub Actions Deployments in "queued" hängen bleiben:
- Prüfen ob GitHub-Limits erreicht sind
- Alternativ: Manuelles Deployment via CDK (siehe DEV_ENVIRONMENT_SETUP.md)

### CORS Fehler auf Dev Stage

Falls 502 Fehler mit CORS auftreten:
- Lambda Logs prüfen (`aws logs tail /aws/lambda/NeuroConcepts-Dev-OrchestratorLambda...`)
- Häufige Ursache: Dateisystem-Zugriff außerhalb von `/tmp` in Lambda
- Lösung: Uploads müssen in `/tmp/uploads` statt `./uploads` gespeichert werden

### Doppelte Slashes in API URLs

Falls API-Calls mit `//` in der URL fehlschlagen:
- `getApiUrl()` Helper in `lib/api.ts` entfernt trailing slashes automatisch
- Prüfen ob alle API-Calls diesen Helper nutzen
