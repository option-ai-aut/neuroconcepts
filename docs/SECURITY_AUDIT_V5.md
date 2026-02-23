# Sicherheitsaudit v5 – Implementierte Fixes (Feb 2026)

Dieses Dokument beschreibt alle umgesetzten Sicherheitsmaßnahmen aus dem Audit v5.
Basis: vollständiges Neues Audit nach Implementierung aller v4-Fixes.

---

## 1. KRITISCH: SQL Injection in EmbeddingService

**Problem:** `entityType` wurde ohne Whitelist-Prüfung direkt in `$queryRawUnsafe` interpoliert — SQL-Injection möglich.

**Fix:** Whitelist `['property', 'lead']` vor der Query-Interpolation. Unbekannte Werte ergeben `safeType = null` → kein Filter.

**Datei:** `src/services/orchestrator/src/services/EmbeddingService.ts` (Zeile 154)

---

## 2. KRITISCH: IDOR in portal-connections Endpoints

**Problem:** `GET /portal-connections`, `GET /portal-connections/effective`, `POST /portal-connections/:id/test` akzeptierten `tenantId`/`userId` direkt aus Query/Params ohne Prüfung gegen den authentifizierten User — ein User konnte fremde Verbindungen abrufen/testen.

**Fix:**
- `GET /portal-connections`: Erzwingt `currentUser.tenantId` als Filter; `userId`-Filter nur für eigene ID erlaubt (Admins dürfen innerhalb des Tenants filtern)
- `GET /portal-connections/effective`: Ignoriert Query-Parameter komplett, nutzt `currentUser.id` und `currentUser.tenantId`
- `POST /portal-connections/:id/test`: `findFirst` mit `tenantId: currentUser.tenantId OR userId: currentUser.id`

**Datei:** `src/services/orchestrator/src/index.ts`

---

## 3. HOCH: Email Header Injection in EmailService

**Problem:** `to` und `subject` wurden ohne Newline-Stripping in RFC-2822 Header eingebaut — Header-Injection möglich.

**Fix:** Im unified `sendEmail`-Einstiegspunkt: `subject.replace(/[\r\n]/g, ' ')` und `to.replace(/[\r\n]/g, '')` vor Weitergabe an alle Provider.

**Datei:** `src/services/orchestrator/src/services/EmailService.ts`

---

## 4. HOCH: Timing-Attack in `verifyInternalSecret`

**Problem:** String-Vergleich `secret !== expected` via `===` — anfällig für Timing-Attacken.

**Fix:** `crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(expected))` — konstante Vergleichszeit.

**Datei:** `src/services/orchestrator/src/middleware/auth.ts`

---

## 5. HOCH: KMS Policy `resources: ['*']`

**Problem:** Der `cognitoEmailKmsKey`-Resource-Policy nutzte `resources: ['*']` statt dem konkreten Key-ARN.

**Fix:** `resources: [cognitoEmailKmsKey.keyArn]`.

**Datei:** `infra/lib/infra-stack.ts`

---

## 6. HOCH: Validation `.passthrough()` – Mass Assignment (Teilweise)

**Problem:** `.passthrough()` auf `createExposeTemplate` und `createPortalConnection` erlaubte beliebige Extrafelder.

**Fix:**
- `createExposeTemplate` und `createPortalConnection`: `.passthrough()` entfernt — Schemas decken alle relevanten Felder ab.
- `createProperty` und `updateProperty`: `.passthrough()` **bewusst beibehalten** — die Schemas sind absichtliche Teilmengen aller Property-Felder; die Handler-Implementierung destructuriert Felder explizit und nutzt nie `req.body` direkt in Prisma, weshalb das Mass-Assignment-Risiko durch den Handler selbst ausgeschlossen ist.

**Datei:** `src/services/orchestrator/src/middleware/validation.ts`

---

## 7. HOCH: BillingService Webhook-Idempotency in-memory

**Problem:** `processedWebhookEvents` war ein in-memory Set — bei Lambda-Neustart/Cold-Start verloren; Stripe-Events konnten mehrfach verarbeitet werden (Doppel-Subscriptions möglich).

**Fix:**
- Neue `WebhookEvent`-Tabelle in `schema.prisma` mit `stripeEventId UNIQUE`
- Migration v14 in `applyPendingMigrations` (`index.ts`)
- Vor Verarbeitung: DB-Lookup; nach Verarbeitung: DB-Insert
- `MIGRATION_VERSION` auf `14` erhöht

**Dateien:** `src/services/orchestrator/prisma/schema.prisma`, `src/services/orchestrator/src/index.ts`

---

## 8. MITTEL: Input-Validierung auf weitere Endpoints

**Problem:** Mehrere Endpoints ohne Zod-Validation:

| Endpoint | Schema |
|----------|--------|
| `POST /expose-templates` | `createExposeTemplate` (bereits vorhanden) |
| `PUT /expose-templates/:id` | neues `updateExposeTemplate` |
| `PUT /calendar/events/:eventId` | neues `updateCalendarEvent` (title/start/end required) |
| `POST /channels` | neues `createChannel` |
| `POST /channels/:channelId/messages` | `channelMessage` (bereits vorhanden) |

**Hinweis `POST /calendar/events`:** Keine Validation hinzugefügt — es gibt ein Pre-Existing-Mismatch im Frontend (sendet `subject` statt `title`). Validation würde alle Event-Erstellungen mit 400 ablehnen.

**Fix:** Neue Schemas in `validation.ts` + `validate()`-Middleware auf alle 6 Endpoints angewendet.

**Dateien:** `src/services/orchestrator/src/middleware/validation.ts`, `src/services/orchestrator/src/index.ts`

---

## 9. MITTEL: TemplateService Prototype Pollution

**Problem:** `path.split('.').reduce(obj?.[key], context)` erlaubte `__proto__`, `constructor`, `prototype` als Pfad-Segmente.

**Fix:** Guard-Check vor jedem Key-Zugriff: gibt `undefined` zurück für `__proto__`/`constructor`/`prototype`.

**Datei:** `src/services/orchestrator/src/services/TemplateService.ts`

---

## 10. MITTEL: CloudTrail für Test-Stage aktiviert

**Problem:** CloudTrail war nur für `prod` aktiv — Test-Stage hatte kein Audit-Logging.

**Fix:** `if (['test', 'prod'].includes(props.stageName))` statt `if (props.stageName === 'prod')`.

**Datei:** `infra/lib/infra-stack.ts`

---

## 11. MITTEL: TLS 1.3 auf CloudFront

**Problem:** Alle 3 CloudFront-Distributions verwendeten `TLS_V1_2_2021`.

**Fix:** `TLS_V1_3_2025` auf Media-CDN, Frontend-CDN und API-CDN.

**Datei:** `infra/lib/infra-stack.ts` (3 Stellen)

---

## 12. MITTEL: Function URL Rate-Limit (SSE-Stream)

**Problem:** `/events/stream` (Server-Sent Events) hatte kein Rate-Limit — WAF schützt die Function URL nicht direkt.

**Fix:**
- `/chat/stream` war bereits durch `AiSafetyMiddleware.rateLimit(50, 60000)` abgesichert (bestätigt)
- `/events/stream`: Neuer `sseStreamLimit` (10/min/User) hinzugefügt

**Datei:** `src/services/orchestrator/src/index.ts`

---

## 13. NIEDRIG: Error Leakage

**Problem:** Raw `error.message` von AWS SDK wurde im AWS Cost Explorer Endpoint an den Client zurückgegeben.

**Fix:** Generische Fehlermeldung: `'Fehler beim Abrufen der AWS-Kostendaten'` statt `error.message`.

**Datei:** `src/services/orchestrator/src/index.ts` (~Zeile 11083)

---

## 14. NIEDRIG: Statische Redirects konsistent mit `safeRedirect()`

**Problem:** `window.location.href = '/login'` und `window.location.href = '/'` in Admin-Layout und Profile-Page — für Code-Konsistenz mit dem `safeRedirect()`-Pattern vereinheitlicht.

**Fix:** `safeRedirect()` importiert und alle 4 hardcoded-Redirect-Stellen ersetzt.

**Dateien:** `frontend/src/app/admin/layout.tsx`, `frontend/src/app/dashboard/settings/profile/page.tsx`

---

## 15. NIEDRIG: EmailService E-Mail-Format-Validierung

**Problem:** `to.split(',')` in `sendOutlookEmail` ohne Validierung der einzelnen Adressen.

**Fix:** Regex-Validierung (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) vor der Verarbeitung; ungültige Adressen werden gefiltert.

**Datei:** `src/services/orchestrator/src/services/EmailService.ts` (sendOutlookEmail)

---

## Migrations-Hinweis (v5)

`MIGRATION_VERSION` wurde von `13` auf `14` erhöht. Die Migration erstellt:

```sql
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "stripeEventId" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_stripeEventId_key" ON "WebhookEvent"("stripeEventId");
```

Diese Migration wird automatisch beim nächsten `push test` / `push main` durch den Post-Deploy-Step ausgeführt.

---

## Relevante .md-Dateien

- `docs/SECURITY_AUDIT_V5.md` — diese Datei
- `docs/SECURITY_AUDIT_V4.md` — vorheriger Audit
- `docs/DEPLOY_CHECKLIST.md` — Schema-Version & Deploy-Workflow
- `docs/AI_SECURITY.md` — Rate-Limiting & Secret Management
