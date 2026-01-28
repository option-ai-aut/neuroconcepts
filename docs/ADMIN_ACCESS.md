# Admin Access Guide

## 🔐 Zugriff auf den Admin-Bereich

Der Admin-Bereich ist das Herzstück der Plattform für dich als Founder und deine Mitarbeiter. Hier hast du die volle Kontrolle über alle Mandanten, User und Einstellungen.

### Wie komme ich hin?

Aktuell ist der Admin-Bereich noch nicht als separater Frontend-Screen implementiert. In Phase 1 (MVP) nutzen wir **direkten Datenbank-Zugriff** oder API-Calls, um Admins zu verwalten.

**Frontend URL (Dev):** `https://5qpdhyx77rhge5sphj356r4rty0tipol.lambda-url.eu-central-1.on.aws/`

### Admin-User erstellen (Manuell)

Da wir noch keine Registrierungsseite haben, musst du den ersten Super-Admin direkt in der Datenbank anlegen.

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

---

## 🛠 Troubleshooting

### Aurora Serverless (Free Tier / Limits)

Falls das Deployment von `NeuroConcepts-Prod` fehlschlägt mit Kapazitätsfehlern:
Wir haben die Konfiguration angepasst (`serverlessV2MaxCapacity: 4`).

### Frontend "Cold Starts"

Da das Frontend auf Lambda läuft, kann der erste Aufruf nach einer Pause 3-5 Sekunden dauern. Das ist normal und spart Kosten (Scale to Zero).
