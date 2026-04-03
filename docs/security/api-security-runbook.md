# API Security Runbook
> ESG Management Systems — SHEQ Platform
> Last updated: 2026-04-03

## Alert Response Procedures

### P1 — Auth Failures > 10 in 5 min per IP

**Trigger:** `sheqSecLog()` shows `AUTH_BLOCKED` or `AUTH_LOGIN_FAILURE` count ≥ 10 within a 5-minute window.

**Response:**
1. Review `sheqSecLog()` in browser console for the affected `user` field.
2. Check Firebase Auth console for concurrent failed sign-in events.
3. If brute-force is confirmed, disable the targeted Firebase user account temporarily.
4. Notify the user via their registered email.
5. If attack is ongoing, enable Firebase App Check to require reCAPTCHA.

---

### P2 — Admin Endpoint Access Outside Business Hours

**Trigger:** `secLog` event with `endpoint` matching `/api/admin/*` outside 07:00–19:00 local time.

**Response:**
1. Identify `user_id` and `tenant_id` from the log entry.
2. Verify with the user whether the access was intentional.
3. If unrecognised, revoke the user's session immediately via Firebase Auth.
4. Escalate to security team if access was unauthorised.

---

### P2 — 5xx Error Rate > 2% over 5 min

**Trigger:** Multiple `status_code` 5xx entries in `sheqSecLog()` within a 5-minute window.

**Response:**
1. Check browser console for uncaught exceptions.
2. Check Firebase Realtime Database rules for permission errors.
3. Review recent deployments for regressions.
4. If Firebase is the source, check Firebase Status page.

---

## Security Log Access

In any browser console session:

```javascript
// View all security events
sheqSecLog()

// Check current role
sheqRole()

// Change role (admin only in prod)
sheqSetRole('sheq_manager')

// Verify ESG record signature
sheqVerify('observations', 'OBS-2026-XXXXXXXX').then(console.log)
```

---

## DSAR Response Procedure (API-07)

1. DSAR case is auto-created with 30-day SLA on `gdprSubmitDsar()`.
2. Privacy Officer receives EmailJS notification.
3. Privacy Officer logs in and uses GDPR panel (Settings → GDPR) to export or erase subject data.
4. Close case by updating `status` to `Closed` directly in Firebase or via admin tooling.
5. All actions are logged with `classification: 'Personal'` in the security log.

---

## Incident Severity Definitions

| Severity | Definition |
|----------|------------|
| P1 | Active security incident; data breach possible |
| P2 | Anomalous activity; investigation required |
| P3 | Policy violation; no immediate data risk |

---

## Key Contacts

- Privacy Officer: Configure in Settings → EmailJS
- SHEQ Manager: Configure in Settings → EmailJS
- Firebase Console: https://console.firebase.google.com
