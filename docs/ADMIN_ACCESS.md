# Admin Access Guide

## 🔐 Zugriff auf den Admin-Bereich

Der Admin-Bereich ist das Herzstück der Plattform für dich als Founder und deine Mitarbeiter. Hier hast du die volle Kontrolle über alle Mandanten, User und Einstellungen.

### Wie komme ich hin?

Aktuell ist der Admin-Bereich noch nicht als separater Frontend-Screen implementiert. In Phase 1 (MVP) nutzen wir **direkten Datenbank-Zugriff** oder API-Calls, um Admins zu verwalten.

**Zukünftige URL:** `https://app.neuroconcepts.ai/admin` (Sobald Frontend implementiert)

### Admin-User erstellen (Manuell)

Da wir noch keine Registrierungsseite haben, musst du den ersten Super-Admin direkt in der Datenbank anlegen.

1.  **Verbinde dich mit der Datenbank:**
    *   Hole dir das Passwort aus dem AWS Secrets Manager (`NeuroConcepts-DB-Secret-dev`).
    *   Nutze ein Tool wie **TablePlus** oder **DBeaver**.
    *   Host: Siehe CloudFormation Output `DBEndpoint`.

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

## 🛠 Troubleshooting: Aurora Serverless (Free Tier)

Falls das Deployment von `NeuroConcepts-Stage` fehlschlägt mit:
`The specified maximum capacity exceeds the maximum capacity available with free plan accounts customers (4 ACUs).`

**Lösung:**
Wir haben die Konfiguration bereits angepasst (`serverlessV2MaxCapacity: 4`).
Wenn der Fehler trotzdem auftritt, liegt es daran, dass der **alte, fehlgeschlagene Stack** noch in AWS existiert und blockiert.

**Schritte:**
1.  Gehe in die **AWS Console** -> **CloudFormation**.
2.  Lösche den Stack `NeuroConcepts-Stage` (Status: `ROLLBACK_COMPLETE`).
3.  Starte den GitHub Action Workflow neu.
