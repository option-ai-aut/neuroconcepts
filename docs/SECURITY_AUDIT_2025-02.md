# Sicherheitsaudit – Immivo.ai (Februar 2026)

## Kontext

Komplettes Sicherheitsaudit der Immivo.ai B2B-SaaS-Plattform (Immobilien-Automatisierung, DACH-Region).
Stack: Next.js 16 Frontend, Express/Node.js 22 Backend (Lambda), PostgreSQL (RDS/Aurora), AWS CDK Infra.

---

## Alle durchgeführten Änderungen (22 Fixes)

### Geänderte Dateien (15 modifiziert, 1 neu)

| Datei | Typ |
|---|---|
| `src/services/orchestrator/src/index.ts` | Backend API (Haupt-Datei, 10k+ Zeilen) |
| `src/services/orchestrator/src/services/EncryptionService.ts` | Verschlüsselungs-Service |
| `src/services/orchestrator/src/middleware/validation.ts` | **NEU** – zod Input-Validierung |
| `src/services/orchestrator/Dockerfile` | Backend Docker-Build |
| `src/services/orchestrator/package.json` | +zod dependency |
| `infra/lib/infra-stack.ts` | AWS CDK Infrastruktur-Stack |
| `infra/cdk.context.json` | CDK Context (Dev-IP-Whitelist) |
| `frontend/next.config.mjs` | Next.js Config (Security Headers) |
| `frontend/src/app/login/page.tsx` | Login-Seite |
| `frontend/src/app/dashboard/inbox/page.tsx` | E-Mail Inbox |
| `frontend/src/app/admin/inbox/page.tsx` | Admin E-Mail Inbox |
| `frontend/src/app/dashboard/settings/integrations/page.tsx` | OAuth Integrations-Seite |
| `frontend/package.json` | +dompurify, @types/dompurify |
| `.github/workflows/deploy.yml` | CI/CD Pipeline |

---

## KRITISCH – 6 Fixes

### 1. Raw SQL Injection via Admin-Endpoint (index.ts)

**Vorher:** `/admin/db-migrate` akzeptierte beliebiges SQL via `req.body.sql` und führte es mit `$executeRawUnsafe()` aus. Ein geleakter Admin-Secret hätte vollständige DB-Kontrolle ermöglicht.

**Nachher:** Endpoint akzeptiert nur `{ version: string }` und delegiert an den bestehenden `MigrationService` mit vordefinierten, versionierten SQL-Migrations. Kein User-Input wird mehr als SQL ausgeführt.

**Zusätzlich:** `verifyAdminSecret()` Funktion eingeführt, die `crypto.timingSafeEqual()` nutzt statt direktem String-Vergleich (verhindert Timing-Angriffe).

### 2. Default Encryption Key (EncryptionService.ts)

**Vorher:** `process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production-32chars!!'` — ein öffentlich bekannter Fallback-Key im Source Code.

**Nachher:** Kein Fallback mehr. Ohne `ENCRYPTION_KEY` Environment-Variable wirft der Service einen Fehler und die App startet nicht. Lazy-Singleton-Pattern damit der Crash nur bei tatsächlicher Nutzung und nicht beim CDK-Build passiert.

**Hinweis:** Der Key-Derivation-Salt bleibt `'salt'` für Backwards-Kompatibilität mit bestehenden verschlüsselten Daten (FTP-Passwörter, OAuth-Tokens in der DB). Das Hauptproblem war der Default-Key, nicht der Salt.

### 3. Dev-DB öffentlich erreichbar (infra-stack.ts)

**Vorher:** Security Group erlaubte `0.0.0.0/0` (gesamtes Internet) auf Port 5432 in Dev. `publiclyAccessible: true` in Dev.

**Nachher:**
- Security Group: IP-Whitelist über CDK Context (`devAllowedIps` in `cdk.context.json`), aktuell auf `41.66.119.230/32` gesetzt
- `publiclyAccessible: false` für ALLE Environments
- `allowAllOutbound: false` auf der DB Security Group

### 4. AWS WAF v2 (infra-stack.ts)

**Vorher:** Kein WAF — kein Schutz gegen SQL Injection, XSS, Bad Inputs oder DDoS auf Netzwerk-Ebene.

**Nachher:** WAF v2 mit 4 Regel-Sets auf API Gateway:
- `AWSManagedRulesCommonRuleSet` (OWASP Top 10)
- `AWSManagedRulesSQLiRuleSet` (SQL Injection)
- `AWSManagedRulesKnownBadInputsRuleSet` (Log4Shell, etc.)
- IP-basiertes Rate Limiting (2000 Requests / 5 Minuten pro IP)

WAF ist über `CfnWebACLAssociation` an die API Gateway Stage gebunden.

### 5. Lambda Function URLs (infra-stack.ts)

**Vorher:** Orchestrator Function URL und Frontend Function URL hatten `cors: { allowedOrigins: ['*'] }`. API Gateway CORS war `ALL_ORIGINS`.

**Nachher:**
- Frontend Lambda URL: CORS komplett entfernt (nicht nötig für SSR — wird über CloudFront bedient)
- API Gateway: CORS auf explizite Origins beschränkt (`dev.immivo.ai`, `test.immivo.ai`, `app.immivo.ai`, etc.)
- Gateway Error Responses (4XX/5XX): Von `'*'` auf spezifische Origin

### 6. OAuth-Tokens in URL-Parametern (index.ts + integrations/page.tsx)

**Vorher:** 4 OAuth-Callbacks (Google Calendar, Outlook Calendar, Gmail, Outlook Mail) übergaben `accessToken` und `refreshToken` als URL-Query-Parameter an das Frontend als Fallback falls Server-Side-Save fehlschlug. Tokens waren in Browser-History, Referrer-Headers und Server-Logs sichtbar.

**Nachher:** Alle 4 Callbacks (Zeilen ~4638, ~4860, ~5530, ~5693 in index.ts) senden nur noch `provider`, `success` und `email` als URL-Parameter. Wenn Server-Side-Save fehlschlägt, wird ein Error-Redirect statt Token-Fallback gesendet.

Frontend (`integrations/page.tsx`): Liest keine `accessToken`/`refreshToken`/`expiryDate` mehr aus URL. Reagiert nur noch auf `success`/`error` Status.

---

## HOCH – 6 Fixes

### 7. Input-Validierung mit zod (validation.ts + index.ts)

**Neu erstellt:** `src/services/orchestrator/src/middleware/validation.ts`
- `validate(schema)` Express-Middleware die `req.body` gegen zod-Schema prüft
- `validateQuery(schema)` für Query-Parameter
- Zentrale `schemas`-Sammlung für alle wichtigen Endpoints

**Angewandt auf Endpoints:** `/seats/invite`, `/me/settings`, `/settings/tenant`, `/chat`

**Bereitgestellte Schemas (noch nicht überall angewandt):** `createLead`, `updateLead`, `sendLeadEmail`, `createProperty`, `updateProperty`, `chatMessage`, `channelMessage`, `createExposeTemplate`, `createPortalConnection`, `adminMigrate`

**TODO für nächsten Agent:** Schemas auf die restlichen ~70 Endpoints anwenden. Die Schemas sind fertig definiert in `validation.ts`, müssen nur als Middleware in die Route-Definition eingefügt werden (Pattern: `app.post('/route', authMiddleware, validate(schemas.xyz), async (req, res) => {...})`).

### 8. Globales Rate Limiting (index.ts)

**Vorher:** Rate Limiting nur auf 4 AI-Chat-Endpoints (50/min via `AiSafetyMiddleware`). Alle anderen ~80 Endpoints ungeschützt.

**Nachher:** Globale Express-Middleware (vor allen Routes):
- 200 Requests/Minute pro IP
- `Retry-After` Header bei 429-Response
- Health-Endpoint (`/health`) ausgenommen
- Automatische Cleanup des In-Memory-Stores alle 2 Minuten (Memory-Leak-Prevention)
- AI-Endpoints haben zusätzlich weiterhin das bestehende 50/min User-Level-Limit

**Hinweis:** In-Memory-Store reicht für Lambda (pro Instanz isoliert, Cold Start = Reset). Für persistentes Rate Limiting wäre DynamoDB/ElastiCache nötig, aber WAF Rate Limiting (2000/5min pro IP) deckt das auf Netzwerk-Ebene ab.

### 9. Open Redirect (login/page.tsx)

**Vorher:** `getRedirectTarget()` las `?redirect=...` aus URL ohne Validierung. Angreifer konnte `?redirect=https://evil.com` setzen.

**Nachher:** Validierung: Redirect muss mit `/` starten, darf nicht mit `//` starten, darf `://` nicht enthalten. Fallback: `/dashboard`.

### 10. Error Messages (index.ts)

**Vorher:** ~100 Stellen mit `res.status(500).json({ error: error.message })` — leakten Stack-Traces, DB-Fehler, interne Pfade.

**Nachher:** Alle durch `res.status(500).json({ error: 'Internal Server Error' })` ersetzt (globales replace_all). Auch `res.status(400).json({ error: error.message })` → `'Bad Request'`.

### 11. CI/CD Pipeline (deploy.yml)

**Vorher:** Ein Job mit langlebigen `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, `--require-approval never` auf allen Environments, keine Approval-Gates.

**Nachher:**
- 3 separate Jobs (`deploy-dev`, `deploy-test`, `deploy-prod`)
- OIDC-basierte Authentifizierung: `role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}`
- Prod-Job hat `environment: production` für manuelles Approval-Gate

**AWS-Konfiguration (bereits erledigt):**
- GitHub OIDC Provider in AWS IAM erstellt (`arn:aws:iam::463090596988:oidc-provider/token.actions.githubusercontent.com`)
- IAM Role `Immivo-GitHub-Deploy` erstellt mit Trust Policy für `repo:option-ai-aut/neuroconcepts:*`
- AdministratorAccess Policy angehängt (CDK braucht breite Permissions)

**Noch zu tun:**
1. GitHub Secret `AWS_DEPLOY_ROLE_ARN` = `arn:aws:iam::463090596988:role/Immivo-GitHub-Deploy` setzen unter github.com/option-ai-aut/neuroconcepts -> Settings -> Secrets -> Actions
2. GitHub Environment `production` erstellen unter Settings -> Environments (optional: Required Reviewers aktivieren)
3. Danach alte Secrets `AWS_ACCESS_KEY_ID` und `AWS_SECRET_ACCESS_KEY` löschen

### 12. Admin Auth Separation (index.ts)

**Vorher:** Admin-Endpoints (`/admin/seed-portals`, `/admin/db-migrate`) nutzten `ENCRYPTION_KEY` als Auth-Secret. Gleicher Key für Verschlüsselung UND Authentifizierung.

**Nachher:**
- Neue Funktion `verifyAdminSecret(req)` nutzt dediziertes `ADMIN_SECRET`
- Timing-safe Vergleich mit `crypto.timingSafeEqual()`
- Alle 4 Admin-Endpoints (`seed-portals`, `db-migrate`, `migrate`, `setup-db`) migriert
- `ADMIN_SECRET` zur `keysToLoad` Liste im Secret-Loader hinzugefügt (Zeile ~140)

**AWS-Konfiguration (bereits erledigt):**
- `ADMIN_SECRET` (64 Zeichen, kryptografisch generiert) in `Immivo-App-Secret-dev`, `Immivo-App-Secret-test` und `Immivo-App-Secret-prod` in AWS Secrets Manager gespeichert

---

## MITTEL – 10 Fixes

### 13. Content Security Policy (next.config.mjs)

**Vorher:** Kein CSP Header. Deprecated `X-XSS-Protection: 1; mode=block` gesetzt.

**Nachher:** Vollständiger CSP Header:
```
default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https://*.immivo.ai https://*.amazonaws.com;
connect-src 'self' https://*.immivo.ai https://*.amazonaws.com https://cognito-idp.eu-central-1.amazonaws.com;
frame-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
```
Plus: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
Entfernt: `X-XSS-Protection` (deprecated, kann XSS sogar verschlimmern)

### 14. DOMPurify (inbox/page.tsx + admin/inbox/page.tsx)

**Vorher:** Manuelle Regex-Sanitisierung (`/<script>...</script>/gi` etc.) — umgehbar durch SVG-Events, `<object>`, CSS-Angriffe.

**Nachher:** `dompurify` installiert. `sanitizeEmailHtml()` nutzt `DOMPurify.sanitize()` mit expliziter Tag- und Attribut-Whitelist. Identische Änderung in beiden Dateien.

### 15. File-Upload Whitelist (index.ts)

**Vorher:** Multer fileFilter akzeptierte `file.mimetype.startsWith('application/')` — erlaubte `application/x-executable`, `application/javascript`, etc.

**Nachher:** Explizites `Set` mit erlaubten Mimetypes: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`, `application/pdf`.

### 16. CORS ohne Origin (index.ts)

**Vorher:** Requests ohne `Origin`-Header (cURL, Postman, Server-to-Server) wurden immer durchgelassen.

**Nachher:** In Production (`STAGE=prod`): Requests ohne Origin werden blockiert. In Dev/Test: weiterhin erlaubt für Entwickler-Convenience.

### 17. S3 Media Bucket (infra-stack.ts)

**Vorher:** `blockPublicAccess` deaktiviert, `StarPrincipal()` Read-Policy, CORS `['*']`.

**Nachher:**
- `blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL`
- Public-Read-Policy entfernt (CloudFront OAC war bereits konfiguriert und reicht)
- `encryption: s3.BucketEncryption.S3_MANAGED`
- `enforceSSL: true`
- CORS auf explizite Immivo-Domains beschränkt
- Versioning aktiviert für Prod

### 18. CloudTrail (infra-stack.ts)

**Vorher:** Kein CloudTrail.

**Nachher:** Nur für Prod-Stack:
- CloudTrail Trail mit eigenem verschlüsseltem S3-Bucket (90-Tage-Lifecycle)
- CloudWatch Log Group (`/immivo/cloudtrail/prod`, 3 Monate Retention)
- Imports hinzugefügt: `aws-cdk-lib/aws-cloudtrail`, `aws-cdk-lib/aws-logs`

### 19. Docker Non-Root (Orchestrator Dockerfile)

**Vorher:** Kein `USER` Directive, lief als Root. Single-Stage Build.

**Nachher:** Multi-Stage Build, Non-Root User `appuser` (UID 1001), `npm ci --omit=dev`, nur Build-Artefakte im finalen Image.

### 20. S3/RDS Encryption (infra-stack.ts)

**Vorher:** Encryption nicht explizit konfiguriert (nur AWS-Defaults).

**Nachher:**
- RDS: `storageEncrypted: true` auf Dev/Test Instance UND Prod Aurora Cluster
- Media Bucket: `encryption: s3.BucketEncryption.S3_MANAGED`
- Email Bucket: `encryption: s3.BucketEncryption.S3_MANAGED`, `enforceSSL: true`, `blockPublicAccess: BLOCK_ALL`

### 21. JSON Body Size (index.ts)

**Vorher:** `express.json({ limit: '20mb' })` — DoS-Vektor auf Lambda mit 1024MB Memory.

**Nachher:** `express.json({ limit: '5mb' })`. File-Uploads laufen weiterhin über Multer (10MB Limit, separater Middleware-Stack).

### 22. Security Headers + Misc (index.ts + infra-stack.ts + next.config.mjs)

- Backend: `X-XSS-Protection` entfernt (deprecated), `Permissions-Policy` Header hinzugefügt, HSTS auf 2 Jahre + preload
- Infra: S3 Versioning für Prod, WAF Import (`aws-cdk-lib/aws-wafv2`)

---

## AWS-Konfigurationen (bereits erledigt, außerhalb des Codes)

| Was | Status |
|---|---|
| `ADMIN_SECRET` in Secrets Manager (dev/test/prod) | ✅ Erledigt |
| GitHub OIDC Provider in AWS IAM | ✅ Erledigt |
| IAM Role `Immivo-GitHub-Deploy` | ✅ Erledigt |
| Dev-IP in `cdk.context.json` | ✅ Erledigt (41.66.119.230/32) |

## Noch manuell zu erledigen

| Was | Wo | Details |
|---|---|---|
| GitHub Secret `AWS_DEPLOY_ROLE_ARN` setzen | GitHub Settings → Secrets | Value: `arn:aws:iam::463090596988:role/Immivo-GitHub-Deploy` |
| GitHub Environment `production` erstellen | GitHub Settings → Environments | Optional: Required Reviewers aktivieren |
| Alte AWS Access Keys aus GitHub löschen | GitHub Settings → Secrets | `AWS_ACCESS_KEY_ID` und `AWS_SECRET_ACCESS_KEY` entfernen |
| CDK Deploy auf Dev | Via `push dev` | Alle Infra-Änderungen werden beim nächsten Push automatisch deployed |

## Offene Verbesserungen für die Zukunft

1. **zod-Validierung auf alle Endpoints ausweiten** — Schemas sind in `validation.ts` definiert, müssen auf ~70 weitere Routes angewandt werden
2. **WAF auf CloudFront** — Aktuell nur auf API Gateway. Für CloudFront-WAF braucht man einen separaten Stack in us-east-1
3. **Cognito Advanced Security** — Bot-Protection / Adaptive Authentication gegen Credential Stuffing
4. **DynamoDB-basiertes Rate Limiting** — Für persistentes Cross-Instance-Limiting (aktuell: In-Memory pro Lambda-Instanz + WAF)
5. **IAM Role für CDK einschränken** — Aktuell AdministratorAccess, sollte auf CDK-spezifische Actions begrenzt werden
6. **Secret Rotation** — Automatische Rotation für ENCRYPTION_KEY und ADMIN_SECRET konfigurieren
7. **Dev-IP dynamisch** — Die IP in cdk.context.json muss bei IP-Änderung manuell aktualisiert werden
