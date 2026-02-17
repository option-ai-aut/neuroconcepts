# Admin Access Guide

## 🔐 Zugriff auf den Admin-Bereich

Der Admin-Bereich ist das Herzstück der Plattform für dich als Founder und deine Mitarbeiter. Hier hast du die volle Kontrolle über alle Mandanten, User und Einstellungen.

### Wie komme ich hin?

**Production:** `https://admin.immivo.ai` (oder `https://app.immivo.ai/admin`)  
**Test:** `https://test.immivo.ai/admin`  
**Dev:** `https://dev.immivo.ai/admin`

Der Admin-Bereich ist über `/admin` erreichbar und durch einen separaten **Admin Cognito User Pool** geschützt.

### Admin-Seiten (alle mit echten Daten)

| Seite | Beschreibung |
|-------|-------------|
| **Dashboard** | Plattform-KPIs (Tenants, Users, Leads, Properties, Exposés, E-Mails) + letzte Aktivitäten |
| **Bug Reports** | Alle Bug-Reports der User mit Status-Pipeline (Offen → In Bearbeitung → Gelöst → Geschlossen), Prioritäten, Screenshots, Console-Logs, Admin-Notizen |
| **Tenants** | Tenant-Verwaltung (erstellen, löschen), Statistiken pro Tenant |
| **Users** | Alle User über alle Tenants, gruppiert nach Tenant, mit Rollen-Filter |
| **Audit Log** | KI-Interaktions-Protokoll, Filter für geflaggte Einträge, Detail-Ansicht |
| **Operations** | System-Health-Checks (DB, Cognito, S3, OpenAI, Gemini, Resend, Lambda) |
| **Settings** | Plattform-Konfiguration (AI Keys, Auth, E-Mail, Storage) |

### Admin-User erstellen (Manuell)

Da wir noch keine Admin-Registrierungsseite haben, musst du den ersten Super-Admin direkt in der Datenbank anlegen.

1.  **Verbinde dich mit der Datenbank:**
    *   Hole dir das Passwort aus dem AWS Secrets Manager (`Immivo-DB-Secret-dev`).
    *   Nutze ein Tool wie **TablePlus** oder **DBeaver**.
    *   Host: Siehe CloudFormation Output `DBEndpoint` (in der AWS Konsole).

2.  **SQL-Befehl ausführen:**
    ```sql
    INSERT INTO "Tenant" (id, name, "updatedAt") 
    VALUES ('default-tenant', 'Immivo HQ', NOW());

    INSERT INTO "User" (id, email, name, "tenantId", role) 
    VALUES (gen_random_uuid(), 'deine.email@immivo.ai', 'Dennis (Founder)', 'default-tenant', 'SUPER_ADMIN');
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

Falls das Deployment von `Immivo-Prod` fehlschlägt mit Kapazitätsfehlern:
Wir haben die Konfiguration angepasst (`serverlessV2MaxCapacity: 4`).

### Frontend "Cold Starts"

Da das Frontend auf Lambda läuft, kann der erste Aufruf nach einer Pause 3-5 Sekunden dauern. Das ist normal und spart Kosten (Scale to Zero).

### GitHub Actions "Queued"

Falls GitHub Actions Deployments in "queued" hängen bleiben:
- Prüfen ob GitHub-Limits erreicht sind
- Alternativ: Manuelles Deployment via CDK (siehe DEV_ENVIRONMENT_SETUP.md)

### CORS Fehler auf Dev Stage

Falls 502 Fehler mit CORS auftreten:
- Lambda Logs prüfen (`aws logs tail /aws/lambda/Immivo-Dev-OrchestratorLambda...`)
- Häufige Ursache: Dateisystem-Zugriff außerhalb von `/tmp` in Lambda
- Lösung: Uploads müssen in `/tmp/uploads` statt `./uploads` gespeichert werden

### Doppelte Slashes in API URLs

Falls API-Calls mit `//` in der URL fehlschlagen:
- `getApiUrl()` Helper in `lib/api.ts` entfernt trailing slashes automatisch
- Prüfen ob alle API-Calls diesen Helper nutzen
