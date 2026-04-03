# ESG Data Integrity — Payload Signing Scheme
> ESG Management Systems — SHEQ Platform
> Last updated: 2026-04-03 | Finding: API-10

## Overview

All ESG metric submissions are signed with HMAC-SHA256 to provide an auditable chain of custody. The signature proves that a record has not been tampered with since it was submitted.

## Signing Process

1. On save, the following payload object is constructed:
   ```json
   {
     "id": "<record-id>",
     "module": "<module-key>",
     "submitted_by": "<user-email>",
     "submitted_at": "<ISO8601-timestamp>"
   }
   ```
2. The payload is JSON-serialised and UTF-8 encoded.
3. A session-scoped HMAC-SHA256 key is derived via `crypto.subtle.importKey`.
4. The signature is computed via `crypto.subtle.sign('HMAC', key, encodedPayload)`.
5. The hex-encoded signature is stored on the record as `_sig`, alongside `_sig_by` and `_sig_at`.

## Verification

Auditors can verify any record using the browser console:

```javascript
sheqVerify('observations', 'OBS-2026-XXXXXXXX').then(console.log);
// Returns: 'valid' | 'tampered' | 'unsigned'
```

Or call `GET /api/audit/verify/{submissionId}` (future server-side endpoint).

## Signed Modules

- `observations`
- `nearMisses`
- `incidents`
- `capas`

## Limitations (Current Implementation)

- The signing key is session-scoped (`sessionStorage`) and not persisted. A production deployment should use a server-issued key per authenticated session to ensure non-repudiation across sessions.
- Signature verification after a browser restart will return `'tampered'` for records signed in a prior session due to key rotation. This will be resolved when the server-side key management endpoint is implemented.

## Fields Stored Per Record

| Field | Description |
|-------|-------------|
| `_sig` | Hex-encoded HMAC-SHA256 signature |
| `_sig_by` | Email of the user who submitted the record |
| `_sig_at` | ISO8601 timestamp of submission |
