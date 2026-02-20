# Sicherheitsaudit v4 – Implementierte Fixes (Feb 2026)

Dieses Dokument beschreibt alle umgesetzten Sicherheitsmaßnahmen aus dem finalen Audit nach Entfernung der dev-Stage (nur noch test & main).

---

## 1. KRITISCH: IDOR-Schutz Expose-Templates

**Problem:** `GET /expose-templates/:id`, `PUT /expose-templates/:id`, `DELETE /expose-templates/:id` prüften nicht `tenantId` – ein Nutzer konnte fremde Templates abrufen/ändern/löschen.

**Fix:** Bei jedem Endpoint wird `currentUser` geladen und `findFirst({ where: { id, tenantId } })` statt `findUnique({ where: { id } })` genutzt. 404 bei Nichtbesitz.

**Datei:** `src/services/orchestrator/src/index.ts`

---

## 2. KRITISCH: IDOR-Schutz Exposes

**Problem:** `POST /exposes` (Property/Template-Lookup ohne tenantId), `PUT /exposes/:id`, `POST /exposes/:id/regenerate`, `DELETE /exposes/:id` ohne tenantId-Check.

**Fix:** Alle Endpoints nutzen `findFirst` mit `tenantId`. Property- und Template-Lookup bei POST ebenfalls mit tenantId abgesichert.

**Datei:** `src/services/orchestrator/src/index.ts`

---

## 3. KRITISCH: smtpConfig.pass Verschlüsselung

**Problem:** `smtpConfig.pass` wurde als Klartext in TenantSettings (JSON) gespeichert.

**Fix:** Beim Lesen wird `encryptionService.decrypt()` angewendet (backward-kompatibel mit unverschlüsselten Werten). AiTools.ts hat dies bereits; index.ts und der Stelle, die smtpConfig an EmailService übergibt, wurde es hinzugefügt.

**Dateien:** `src/services/orchestrator/src/index.ts`, `src/services/orchestrator/src/services/AiTools.ts`

**Hinweis:** Beim Speichern neuer smtpConfig muss `encrypt()` verwendet werden – sobald der Speicher-Endpoint implementiert ist.

---

## 4. HOCH: Auth auf interne Endpoints

**Problem:** `/emails/incoming` und `/internal/ingest-lead` waren ohne Authentifizierung aufrufbar.

**Fix:**
- Neue Middleware `verifyInternalSecret` in `middleware/auth.ts` – prüft Header `X-Internal-Secret` gegen `INTERNAL_API_SECRET`
- Beide Endpoints nutzen diese Middleware
- Email-Parser Lambda erhält `APP_SECRET_ARN`, lädt Secrets beim Start und sendet `X-Internal-Secret` bei allen Requests an den Orchestrator

**Dateien:**  
- `src/services/orchestrator/src/middleware/auth.ts`  
- `src/services/orchestrator/src/index.ts`  
- `src/services/email-parser/index.ts`  
- `infra/lib/infra-stack.ts` (APP_SECRET_ARN für Email-Parser)

**Konfiguration:** `INTERNAL_API_SECRET` muss in AWS Secrets Manager (`Immivo-App-Secret-test`, `Immivo-App-Secret-prod`) und lokal in `src/services/orchestrator/.env` / `.env.local` gesetzt sein.

---

## 5. HOCH: Path Traversal bei Document-Deletion

**Problem:** Property-Documents und Lead-Documents: `path.join(__dirname, '..', docToDelete.url)` ohne Boundary-Check – theoretisch Path Traversal möglich.

**Fix:** Gleiches Muster wie bei Image-Deletion: `path.resolve()` + Prüfung, dass `filePath.startsWith(uploadRoot + path.sep)`.

**Datei:** `src/services/orchestrator/src/index.ts` (2 Stellen)

---

## 6. HOCH: SSRF-Check verschärft

**Problem:** `parsed.hostname.endsWith('.amazonaws.com')` erlaubte z.B. `evil.amazonaws.com`.

**Fix:** Nur noch exakte Host-Liste (CDN-URL, S3-Bucket-URL, s3.region.amazonaws.com). Kein generisches `.amazonaws.com`-Suffix.

**Datei:** `src/services/orchestrator/src/index.ts` (AI image-edit Endpoint)

---

## 7. HOCH: Rate-Limiting öffentliche Endpoints

**Problem:** Öffentliche Endpoints ohne Rate-Limit – Missbrauch/Spam möglich.

**Fix:** IP-basierte Rate-Limits:
- `POST /contact` – 5/min/IP
- `POST /newsletter/subscribe`, `POST /newsletter/unsubscribe` – 5/min/IP
- `POST /jobs/:id/apply` – 5/min/IP
- `GET /calendar/busy` – 20/min/IP
- `POST /calendar/book-demo` – 3/min/IP

**Datei:** `src/services/orchestrator/src/index.ts`

---

## 8. HOCH: Rate-Limits AI/Upload/Search

**Fix:** Zusätzliche Rate-Limits:
- `POST /jarvis/generate-signature` – 20/min/User
- `POST /properties/:id/generate-text` – 20/min/User
- `GET /search` – 30/min/User
- `POST /properties/:id/images`, `POST /properties/:id/documents`, `POST /leads/:id/documents` – 20/min/User

**Datei:** `src/services/orchestrator/src/index.ts`

---

## 9. HOCH: HTML-Escaping in E-Mail-Templates

**Problem:** Kontaktformular und Job-Bewerbungen: User-Input (`firstName`, `lastName`, `message` usw.) wurde direkt in HTML eingefügt → XSS-Risiko in E-Mail-Clients.

**Fix:**
- `escapeHtml()` Helper in `index.ts` (ersetzt `<>&"'`)
- Kontaktformular- und Bewerbungs-E-Mails nutzen `escapeHtml()` für alle User-Felder
- `TemplateService.render()` escaped alle Platzhalter-Werte automatisch

**Dateien:** `src/services/orchestrator/src/index.ts`, `src/services/orchestrator/src/services/TemplateService.ts`

---

## 10. MITTEL: CSP unsafe-eval entfernt

**Problem:** `script-src 'self' 'unsafe-inline' 'unsafe-eval'` erhöht XSS-Risiko.

**Fix:** `'unsafe-eval'` aus der Content-Security-Policy entfernt.

**Datei:** `frontend/next.config.mjs`

**Hinweis:** Nach Deploy testen – Next.js könnte `eval` intern nutzen. Bei Problemen temporär wieder hinzufügen.

---

## 11. MITTEL: safeRedirect() für Frontend-Redirects

**Problem:** `window.location.href = data.url` bzw. `data.authUrl` von API-Responses – Open-Redirect-Risiko.

**Fix:** Utility `safeRedirect()` in `frontend/src/lib/safeRedirect.ts`. Erlaubt nur relative Pfade und explizite Domains (`*.immivo.ai`, `*.stripe.com`, `accounts.google.com`, `login.microsoftonline.com`).

**Dateien:** `TrialGate.tsx`, `login/page.tsx`, `billing/page.tsx`, `pricing/page.tsx`, `integrations/page.tsx`

---

## 12. MITTEL: sameSite lax auf Middleware-Cookies

**Problem:** Locale-Cookies ohne `sameSite` – leichtes CSRF-Risiko.

**Fix:** Alle `response.cookies.set('locale', ...)` Aufrufe in `frontend/src/middleware.ts` um `sameSite: 'lax'` ergänzt.

---

## 13. MITTEL: GitHub Actions SHA-Pinning & devAllowedIps entfernt

**Fix:**
- Alle Actions (`actions/checkout`, `actions/setup-node`, `aws-actions/configure-aws-credentials`) auf konkrete Commit-SHAs gepinnt (statt `@v4`)
- `devAllowedIps` aus `infra/cdk.context.json` entfernt (dev-Stage existiert nicht mehr)

**Dateien:** `.github/workflows/deploy.yml`, `infra/cdk.context.json`

---

## 14. MITTEL: localhost aus S3-CORS entfernt

**Problem:** `http://localhost:3000` in Production S3-CORS allowed origins.

**Fix:** localhost aus der allowed origins Liste entfernt.

**Datei:** `infra/lib/infra-stack.ts`

---

## 15. NIEDRIG: setup-db Info-Leak, .dockerignore, ExposeEditor innerHTML

**Fix:**
- **setup-db 404:** Keine Weitergabe von `cwd`, `dirname`, `taskFiles` mehr – nur noch `{ error: 'Migration file not found' }`
- **.dockerignore:** `frontend/.dockerignore` und `src/services/orchestrator/.dockerignore` angelegt
- **ExposeEditor:** `DOMPurify.sanitize()` auf die letzten `innerHTML`-Stellen (tagHtml) angewendet

**Dateien:** `src/services/orchestrator/src/index.ts`, `frontend/.dockerignore`, `src/services/orchestrator/.dockerignore`, `frontend/src/components/ExposeEditor.tsx`

---

## Konfiguration

### INTERNAL_API_SECRET

- **AWS:** In `Immivo-App-Secret-test` und `Immivo-App-Secret-prod` als Key hinterlegt (bereits per CLI gesetzt).
- **Lokal:** In `src/services/orchestrator/.env` und `.env.local` als `INTERNAL_API_SECRET=local-dev-internal-secret` (oder eigener Wert).

### .env-Dateien (Orchestrator)

| Datei                         | INTERNAL_API_SECRET |
|------------------------------|---------------------|
| `src/services/orchestrator/.env`       | ✅ Hinzugefügt       |
| `src/services/orchestrator/.env.local`| ✅ Hinzugefügt       |
| `src/services/orchestrator/.env.example`| ✅ Dokumentiert     |

---

## Manuell durchgeführt (Feb 2026)

- **AWS Secrets Manager:** `INTERNAL_API_SECRET` per CLI in `Immivo-App-Secret-test` und `Immivo-App-Secret-prod` gesetzt (Zufallswert via `openssl rand -hex 32`).
- **Lokal:** `INTERNAL_API_SECRET=local-dev-internal-secret` in `src/services/orchestrator/.env` und `.env.local` ergänzt.

---

## Relevante .md-Dateien

- `docs/SECURITY_AUDIT_V4.md` – diese Datei
- `docs/DEV_ENVIRONMENT_SETUP.md` – Backend-Konfiguration, INTERNAL_API_SECRET, AWS Secrets
- `docs/DEPLOY_CHECKLIST.md` – deploy-relevante Punkte
- `docs/AI_SECURITY.md` – AI-Security und übergreifende Sicherheitsmaßnahmen
- `README.md` – Kurzhinweis auf Sicherheit
