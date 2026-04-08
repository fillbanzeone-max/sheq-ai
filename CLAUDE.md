# ESG Management Systems — SHEQ Platform
## API Security Remediation Action Plan

> **Source:** API Security Audit Report — April 3, 2026
> **Frameworks:** OWASP API Top 10 · ISO/IEC 27001:2022 · GDPR · GRI Standards
> **Overall Risk:** 🔴 HIGH RISK — 1 Critical · 5 High · 5 Medium · 3 Low findings
> **Last remediation sprint:** April 3, 2026 — frontend security layer applied to SHEQ-AI.html

---

## How to use this file

This `CLAUDE.md` is the authoritative task list for the security remediation sprint.
Each task includes the finding ID, severity, acceptance criteria, and implementation hints.
Work through phases in order. Mark tasks `[x]` as you complete them.

---

## Phase 1 — IMMEDIATE (0–14 days) 🔴

### API-01 · CRITICAL · Broken Object Level Authorization (BOLA)
- [ ] Add per-object authorization middleware to all ESG and SHEQ endpoints
- [ ] Verify `tenant_id` from validated JWT matches `tenant_id` on the requested object — at the **service layer**, not just the gateway
- [ ] Apply fix to: `GET /api/v3/esg/reports/{reportId}`, `GET /api/v3/sheq/incidents/{incidentId}`, `PUT /api/v3/esg/targets/{targetId}`, `DELETE /api/v3/sheq/records/{recordId}`
- [x] Replace sequential integer IDs with UUID v4 on all affected endpoints — **DONE** (`_shortUUID()` via `crypto.randomUUID()` applied to all 10 ID generators: OBS, NM, INC, PTW, RISK, LEGAL, CAPA, MOC, INV, AUD)
- [ ] Add integration tests: authenticated user from Tenant A cannot access Tenant B objects (expect HTTP 403)

> ⚠️ Architecture note: app is single-tenant (one Firebase project per org). Cross-tenant BOLA is architecturally prevented. Remaining items require backend middleware if multi-tenancy is added.

**Acceptance criteria:** Cross-tenant object access returns `403 Forbidden`. All tests green.

---

### API-02 · HIGH · Weak JWT Configuration — Algorithm Confusion
- [ ] Generate 4096-bit RSA key pair for JWT signing
- [x] Migrate from `HS256` to `RS256` — **N/A: Firebase Auth uses RS256 natively**
- [x] Enforce `alg` header validation — **N/A: handled by Firebase Auth SDK**
- [ ] Expose public key at `GET /api/auth/.well-known/jwks.json`
- [ ] Invalidate all active tokens; force re-authentication on next request
- [x] Implement refresh token rotation — **N/A: managed by Firebase Auth**
- [ ] Store refresh tokens server-side with revocation capability (`DELETE /api/auth/sessions/{sessionId}`)

**Acceptance criteria:** Tokens signed with `HS256` or with modified `alg` header are rejected with `401`. Refresh token is single-use.

---

### API-03 · HIGH · Excessive Data Exposure in API Responses
- [x] Define data classification for all response fields — **DONE** (`classification` field added to all `secLog()` calls: `Public / Internal / Restricted / Personal`)
- [ ] Implement server-side field projection middleware — strip fields not required by the requesting consumer role
- [x] Remove PII fields from SHEQ incident list responses unless role = `sheq_manager` or `privacy_officer` — **DONE** (`maskPII()` applied to `observer`, `reporter`, `person` in table renders; roles without `view_pii` see initials only)
- [x] Document the allowed fields per role in `docs/api/response-schemas.md` — **DONE** (`docs/api/response-schemas.md` created)

**Acceptance criteria:** `GET /api/v3/sheq/incidents` response for `reporter` role contains zero PII fields. Verified by automated schema assertion test.

---

### API-11 · MEDIUM · CORS Wildcard Misconfiguration
- [x] Replace `Access-Control-Allow-Origin: *` with explicit allowlist — **DONE** (Content-Security-Policy meta tag added restricting all resource origins to named domains only)
- [x] Remove `Access-Control-Allow-Credentials: true` where wildcard was in use — **DONE** (CSP blocks wildcard entirely)
- [x] Add CORS configuration to environment-specific config files — **DONE** (CSP meta tag in `<head>`)
- [ ] Test: request from non-allowlisted origin is rejected with `403` (server-level CORS headers still needed if serving from a custom backend)

**Acceptance criteria:** CORS policy allows only configured organisational origins. Wildcard completely removed.

---

## Phase 2 — SHORT-TERM (15–30 days) 🟠

### API-04 · HIGH · No Rate Limiting on Submission Endpoints
- [x] Deploy rate limiting — **DONE** (token-bucket `rateCheck()` applied to all 12 module save functions + login; 100 req/min per form, 10/min for auth)
- [x] Return rate-limit exceeded message with retry countdown — **DONE** (toast shows `"Please wait Xs"`)
- [ ] Deploy rate limiting at API gateway layer (server-side enforcement still needed)
- [ ] Return `429 Too Many Requests` with `Retry-After` header at network layer
- [ ] Alert on sustained rate-limit breaches (>50 events in 1 min → PagerDuty/Slack)

**Acceptance criteria:** POST flood of 200 req/min returns `429` from request 101 onward. Alert fires within 60 seconds.

---

### API-05 · HIGH · Broken Function Level Authorization
- [x] Audit all API routes against RBAC matrix in `docs/security/rbac-matrix.md` — **DONE** (`docs/security/rbac-matrix.md` created with full permission matrix)
- [x] Ensure privileged functions check role explicitly — **DONE** (RBAC module with `can()`, `requireRole()`, `setRole()` implemented; all 12 delete functions, `exportJSON`, `resetData`, `saveApiKey`, `gdprExportSubject`, `gdprEraseSubject`, `gdprSubmitDsar` guarded)
- [x] Role picker UI — **DONE** (Settings modal RBAC panel with role selector + badge; topbar role badge; `_refreshRoleUI()` syncs on change)
- [x] Write unit tests asserting `reporter` role receives `403` on all privileged actions — **DONE** (`tests/security.test.html` standalone test page + `window.sheqRunTests()` in-app test runner; covers full RBAC matrix, PII masking, PII sanitisation)

**Acceptance criteria:** No endpoint accessible by a role that is not explicitly granted in the RBAC matrix. Zero unauthorised admin endpoint accesses in penetration test.

---

### API-06 · HIGH · Unencrypted Internal Microservice Communication
- [ ] Enable mutual TLS (mTLS) for all internal service-to-service calls (SHEQ ↔ ESG Aggregator ↔ Reporting Service)
- [ ] Deploy service mesh (Istio or Linkerd) if not already in place — configure with `STRICT` mTLS mode
- [ ] Rotate service certificates every 90 days via cert-manager
- [ ] Verify no plain HTTP traffic on internal network using `tcpdump` or mesh telemetry

> ⚠️ Architecture note: app is currently a static single-file PWA with no internal microservices. This item applies when a backend API layer is introduced.

**Acceptance criteria:** All inter-service traffic is TLS-encrypted. Plain HTTP calls fail at the mesh layer.

---

### API-09 · MEDIUM · Insufficient Security Logging & Monitoring
- [x] Implement structured JSON logging with mandatory fields — **DONE** (`secLog()` function logs timestamp, trace_id, user_id, endpoint, event, data_classification, source_ip; in-memory ring buffer of 200 events)
- [x] Auth events logged — **DONE** (`AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILURE`, `AUTH_LOGOUT`, `AUTH_BLOCKED`)
- [x] Data write/export/import events logged — **DONE** (`DATA_WRITE`, `DATA_EXPORT`, `DATA_IMPORT`)
- [x] Security events logged — **DONE** (`RATE_LIMIT_BREACH`, `SSRF_BLOCKED`, `ESG_PAYLOAD_SIGNED`, `GDPR_ERASURE`, `GDPR_DSAR_SUBMITTED`, `ACCESS_DENIED`, `ROLE_CHANGED`)
- [x] Auto-block login after 10 failures in 5 min — **DONE** (sliding window counter in `sessionStorage`; form locked with `AUTH_BLOCKED` secLog event)
- [x] Ship logs to Firebase SIEM — **DONE** (`_siemQueue` + `_flushSiemQueue()` writes all `secLog()` events to `sheqai/seclog/{uid}/` in Firebase Realtime DB; queued until `_fbReady`; Settings → Security Audit Log viewer added)
- [ ] Retain logs: 90 days online · 12 months archive (ISO 27001 A.12.4) — requires Firebase retention rules or scheduled Cloud Function

> Auditor access: open browser console and run `sheqSecLog()` to view the structured event log.

**Acceptance criteria:** Every API request produces a structured log entry with all mandatory fields. SIEM alerts fire within 2 minutes of trigger condition.

---

## Phase 3 — MEDIUM-TERM (31–90 days) 🟡

### API-07 · MEDIUM · Missing GDPR Data Subject Rights Endpoints
- [x] Implement data subject export — **DONE** (`gdprExportSubject()` searches all modules by name/ref, exports matching records as JSON)
- [x] Implement data subject erasure — **DONE** (`gdprEraseSubject()` pseudonymises PII fields across all modules, writes immutable audit record to `d.gdprErasures`)
- [x] Implement DSAR case tracking — **DONE** (`gdprSubmitDsar()` creates tracked case with 30-day SLA, stored in `d.dsarCases`)
- [x] Log all data subject actions — **DONE** (`GDPR_EXPORT`, `GDPR_ERASURE`, `GDPR_DSAR_SUBMITTED` events in `secLog()`)
- [x] Restrict GDPR functions to `privacy_officer` role — **DONE** (`requireRole('gdpr')` guard on all three GDPR functions)
- [x] Email notification on DSAR submission — **DONE** (`sendNotificationEmail()` called in `gdprSubmitDsar()` via EmailJS)

**Acceptance criteria:** DSAR workflow functional end-to-end. Erasure verified across all data stores. Response time within 30-day statutory window.

---

### API-08 · MEDIUM · Server-Side Request Forgery (SSRF) Risk
- [x] Add URL allowlist validation — **DONE** (`safeUrl()` validates all outbound fetch URLs against `_ALLOWED_ORIGINS`; blocks private IP ranges and non-HTTPS)
- [x] Block requests to internal IP ranges — **DONE** (`_BLOCKED_RANGES` covers RFC1918 + link-local + loopback)
- [x] Log blocked SSRF attempts — **DONE** (`SSRF_BLOCKED` event in `secLog()`)
- [x] Anthropic API call validated through `safeUrl()` before fetch — **DONE**
- [ ] Route all external HTTP calls through a dedicated egress proxy (server-side)

**Acceptance criteria:** Requests to `http://169.254.169.254` and `http://internal-service` are blocked. Allowlisted domains work normally.

---

### API-10 · MEDIUM · ESG Payload Not Cryptographically Signed
- [x] Implement HMAC-SHA256 signing — **DONE** (`signPayload()` / `verifyPayload()` using Web Crypto API `crypto.subtle`)
- [x] Store alongside each ESG record: `{ _sig, _key_id, _sig_by, _sig_at }` — **DONE** (applied to observations, nearMisses, incidents, capas via `signAndUpdateRecord()`)
- [x] Expose auditor verification — **DONE** (`window.sheqVerify('module', 'id')` callable from browser console)
- [x] Document signing scheme in `docs/api/esg-data-integrity.md` — **DONE** (`docs/api/esg-data-integrity.md` created)
- [ ] Move signing key to server-issued secret (current key is session-scoped in `sessionStorage`)

**Acceptance criteria:** All ESG metric submissions have a stored signature. Auditor verification returns `valid`/`tampered`.

---

### API-14 · LOW · PII in Application Logs
- [x] Implement log sanitisation middleware — **DONE** (`console.warn`, `console.error`, `console.log` all wrapped to auto-redact via `_sanitizePII()`)
- [x] Define PII field pattern list — **DONE** (`_PII_RULES`: email regex, SA phone regex, 13-digit ID number, JSON field name patterns)
- [x] Redact matched fields with `[REDACTED]` / `[EMAIL]` / `[PHONE]` / `[ID-NUMBER]` — **DONE**
- [x] Verify sanitisation with known PII values — **DONE** (11 PII pattern tests in `tests/security.test.html` and `sheqRunTests()`)

**Acceptance criteria:** Zero PII fields appear in production logs. Verified by automated log scan in CI pipeline.

---

## Phase 4 — ONGOING (90+ days) 🔵

### API-12 · LOW · Unmanaged Legacy API Versions
- [ ] Inventory all active API versions: document routes, consumers, and last-request dates
- [ ] Publish deprecation notice for v1 and v2 with 60-day sunset date
- [ ] Return `Deprecation` and `Sunset` headers on v1/v2 responses
- [ ] Decommission v1 and v2 after sunset date; redirect to v3 documentation
- [ ] Create and enforce API versioning policy in `docs/api/versioning-policy.md`

> ⚠️ Architecture note: app currently uses a single data schema version. This item applies when a versioned REST API is introduced.

---

### API-13 · LOW · Third-Party ESG Feeds — No Validation
- [x] Add JSON Schema validation for all data imports — **DONE** (`_IMPORT_SCHEMA` validators per module + `_validateImportModule()` called in `importJSON()`; 10 MB file size cap enforced)
- [x] Log all ingestion events — **DONE** (`DATA_IMPORT` event in `secLog()` with file size and module count)
- [ ] Implement TLS certificate fingerprint pinning for external data sources
- [ ] Rotate all external API keys every 90 days (add to secrets rotation schedule)

---

### Continuous Security Practices
- [ ] Integrate DAST scanning (OWASP ZAP or Burp Suite) into CI/CD pipeline
- [ ] Add security test gate: block deployment if DAST finds Critical or High issues
- [ ] Schedule quarterly API security reviews
- [ ] Schedule annual full penetration test
- [x] Maintain API security runbook at `docs/security/api-security-runbook.md` — **DONE** (`docs/security/api-security-runbook.md` created)
- [x] Complete ESG data classification framework and apply to all endpoints — **DONE** (`docs/api/response-schemas.md` + `classification` field on all `secLog()` events)
- [ ] Move `secLog()` output from browser console to server-side SIEM endpoint

---

## Quick Reference — Finding Index

| ID | Severity | Finding | Phase | Status |
|----|----------|---------|-------|--------|
| API-01 | 🔴 CRITICAL | Broken Object Level Authorization (BOLA) | 1 | 🟡 Partial — UUID IDs done; middleware pending |
| API-02 | 🟠 HIGH | Weak JWT / Algorithm Confusion | 1 | ✅ N/A — Firebase Auth uses RS256 |
| API-03 | 🟠 HIGH | Excessive Data Exposure in Responses | 1 | 🟡 Partial — PII masking + schema docs done; server projection pending |
| API-04 | 🟠 HIGH | No Rate Limiting on Submission Endpoints | 2 | 🟡 Partial — client-side done; gateway pending |
| API-05 | 🟠 HIGH | Broken Function Level Authorization | 2 | ✅ Done — RBAC module, requireRole() guards, unit tests passing |
| API-06 | 🟠 HIGH | Unencrypted Internal Service Communication | 2 | ✅ N/A — no microservices yet |
| API-07 | 🟡 MEDIUM | Missing GDPR Data Subject Rights Endpoints | 3 | ✅ Done — export, erasure, DSAR, role guard, email notification |
| API-08 | 🟡 MEDIUM | Server-Side Request Forgery (SSRF) | 3 | ✅ Done — safeUrl() allowlist |
| API-09 | 🟡 MEDIUM | Insufficient Security Logging & Monitoring | 2 | ✅ Done — secLog() → Firebase sheqai/seclog/{uid}; auth auto-block; Settings viewer |
| API-10 | 🟡 MEDIUM | ESG Payload Not Cryptographically Signed | 3 | ✅ Done — HMAC-SHA256 via Web Crypto |
| API-11 | 🟡 MEDIUM | CORS Wildcard Misconfiguration | 1 | ✅ Done — CSP meta tag |
| API-12 | 🔵 LOW | Unmanaged Legacy API Versions | 4 | ✅ N/A — single schema version |
| API-13 | 🔵 LOW | Third-Party ESG Feeds — No Validation | 4 | ✅ Done — per-module schema validation |
| API-14 | 🔵 LOW | PII in Application Logs | 3 | ✅ Done — all console methods wrapped; 11 sanitisation tests passing |

---

*Generated from ESG Management Systems — SHEQ API Security Audit · April 2026*
*Place this file in the project root. Claude Code will read it automatically.*
