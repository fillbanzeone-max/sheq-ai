/**
 * ESG Management Systems — SHEQ Cloud Functions
 * Firebase Functions v2 · Node 20
 *
 * Functions:
 *   pruneSecLogs  — scheduled daily, deletes seclog entries older than 90 days
 *   sendEmail     — callable, server-side email via Nodemailer (replaces EmailJS)
 *
 * Environment variables (set via Firebase CLI before deploying):
 *   firebase functions:secrets:set SMTP_HOST
 *   firebase functions:secrets:set SMTP_PORT   (default: 587)
 *   firebase functions:secrets:set SMTP_SECURE (default: false)
 *   firebase functions:secrets:set SMTP_USER
 *   firebase functions:secrets:set SMTP_PASS
 *
 * Deploy:
 *   cd functions && npm install
 *   cd .. && firebase deploy --only functions
 */

const { onSchedule }        = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret }       = require('firebase-functions/params');
const admin                  = require('firebase-admin');
const nodemailer             = require('nodemailer');

admin.initializeApp();

// ── Secrets (stored in Google Secret Manager, never in code) ─
const SMTP_HOST   = defineSecret('SMTP_HOST');
const SMTP_PORT   = defineSecret('SMTP_PORT');
const SMTP_SECURE = defineSecret('SMTP_SECURE');
const SMTP_USER   = defineSecret('SMTP_USER');
const SMTP_PASS   = defineSecret('SMTP_PASS');

// ============================================================
// 1. SCHEDULED LOG RETENTION  (ISO 27001 A.12.4)
//    Runs daily at 02:00 UTC.
//    Tier 1 (online, hot):     0–90 days   — Realtime Database
//    Tier 2 (archive, cold):   90–365 days — Cloud Storage NDJSON
//    Tier 3 (delete):          365+ days   — hard delete from both
//
//    Idempotent: re-running on the same day is safe (writes are
//    keyed on log entry path; archive uses a date-bucketed prefix).
// ============================================================
exports.pruneSecLogs = onSchedule(
  { schedule: 'every 24 hours', timeZone: 'UTC', retryCount: 1 },
  async () => {
    const RETAIN_DAYS   = 90;
    const ARCHIVE_DAYS  = 365;
    const now           = Date.now();
    const archiveCutoff = new Date(now - RETAIN_DAYS  * 86400000).toISOString();
    const deleteCutoff  = new Date(now - ARCHIVE_DAYS * 86400000).toISOString();

    const db          = admin.database();
    const bucket      = admin.storage().bucket();
    const archiveRoot = 'seclog-archive';
    const runId       = new Date().toISOString().substring(0, 10);

    const usersSnap = await db.ref('sheqai/seclog').once('value');
    const users     = usersSnap.val() || {};

    let archivedCount = 0;
    let archivedBytes = 0;
    let deletedCount  = 0;
    let usersTouched  = 0;
    const errors      = [];

    for (const uid of Object.keys(users)) {
      const logRef = db.ref(`sheqai/seclog/${uid}`);

      try {
        // ── Tier 2: archive entries older than 90 days ──────────
        const archSnap = await logRef
          .orderByChild('timestamp')
          .endAt(archiveCutoff)
          .once('value');

        const toArchive = [];
        archSnap.forEach(snap => {
          const v = snap.val() || {};
          // Skip entries already older than 365 days — those go to Tier 3
          if (v.timestamp && v.timestamp < deleteCutoff) return;
          toArchive.push({ key: snap.key, val: v });
        });

        if (toArchive.length > 0) {
          // NDJSON append-friendly format. One file per (user, day) so re-runs
          // don't produce duplicates within the same day.
          const ndjson = toArchive
            .map(e => JSON.stringify({ _key: e.key, ...e.val }))
            .join('\n') + '\n';
          const file = bucket.file(`${archiveRoot}/${uid}/${runId}.ndjson`);
          await file.save(ndjson, {
            contentType: 'application/x-ndjson',
            resumable:   false,
            metadata:    { metadata: { uid, runId, count: String(toArchive.length) } },
          });
          archivedBytes += Buffer.byteLength(ndjson);

          // Delete originals from Realtime DB only after successful upload
          const updates = {};
          toArchive.forEach(e => { updates[e.key] = null; });
          await logRef.update(updates);

          archivedCount += toArchive.length;
          usersTouched++;
        }

        // ── Tier 3: hard-delete entries older than 365 days ─────
        const delSnap = await logRef
          .orderByChild('timestamp')
          .endAt(deleteCutoff)
          .once('value');
        const delUpdates = {};
        let delThisUser = 0;
        delSnap.forEach(snap => { delUpdates[snap.key] = null; delThisUser++; });
        if (delThisUser > 0) {
          await logRef.update(delUpdates);
          deletedCount += delThisUser;
        }

        // Also purge archive files older than 365 days (Tier 3 in Storage)
        const [files] = await bucket.getFiles({ prefix: `${archiveRoot}/${uid}/` });
        const archiveDeletes = files.filter(f => {
          // Filename is YYYY-MM-DD.ndjson — parseable
          const m = f.name.match(/(\d{4}-\d{2}-\d{2})\.ndjson$/);
          return m && new Date(m[1]).toISOString() < deleteCutoff;
        });
        if (archiveDeletes.length > 0) {
          await Promise.all(archiveDeletes.map(f => f.delete().catch(() => {})));
          deletedCount += archiveDeletes.length;
        }
      } catch (e) {
        errors.push(`${uid}: ${e.message || e}`);
      }
    }

    const summary = {
      runId,
      usersScanned: Object.keys(users).length,
      usersTouched,
      archivedCount,
      archivedBytes,
      deletedCount,
      errorCount: errors.length,
    };

    // Audit trail: write the run summary back to RTDB so admins can see it
    await db.ref('sheqai/admin/seclogRetention').push({
      ...summary,
      errors:    errors.slice(0, 20),    // cap log noise
      completed: new Date().toISOString(),
    }).catch(() => {});

    console.log('pruneSecLogs:', JSON.stringify(summary));
    if (errors.length > 0) {
      console.warn('pruneSecLogs errors:', errors.slice(0, 5));
    }
  }
);

// ============================================================
// 2. SERVER-SIDE EMAIL (replaces EmailJS)
//    Callable from the frontend via:
//      firebase.functions().httpsCallable('sendEmail')({...})
//
//    Request payload:
//      { to: string|string[], subject: string, html: string,
//        moduleName: string, recordId: string }
//
//    Requires the caller to be authenticated (Firebase Auth).
// ============================================================
exports.sendEmail = onCall(
  { secrets: [SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS] },
  async (request) => {
    // Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Must be signed in to send notifications.');
    }

    const { to, subject, html, text } = request.data;

    if (!to || !subject) {
      throw new HttpsError('invalid-argument', '"to" and "subject" are required.');
    }

    const host   = SMTP_HOST.value();
    const user   = SMTP_USER.value();
    const pass   = SMTP_PASS.value();
    const port   = parseInt(SMTP_PORT.value() || '587');
    const secure = SMTP_SECURE.value() === 'true';

    if (!host || !user || !pass) {
      throw new HttpsError(
        'failed-precondition',
        'SMTP secrets not configured. Run: firebase functions:secrets:set SMTP_HOST / SMTP_USER / SMTP_PASS'
      );
    }

    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });

    const recipients = Array.isArray(to) ? to : [to];

    const results = await Promise.allSettled(
      recipients.map(addr =>
        transporter.sendMail({
          from:    `"ESG Management Systems - SHEQ" <${user}>`,
          to:      addr,
          subject,
          html:    html || text || '',
          text:    text || '',
        })
      )
    );

    const failed = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message || 'unknown error');

    const sent = recipients.length - failed.length;

    // Log to Realtime DB for audit trail
    const uid = request.auth.uid.replace(/[.#$[\]]/g, '_');
    await admin.database().ref(`sheqai/seclog/${uid}`).push({
      timestamp:           new Date().toISOString(),
      event:               'EMAIL_SENT',
      user_id:             request.auth.token.email || request.auth.uid,
      data_classification: 'Internal',
      recipients_count:    sent,
      subject,
    }).catch(() => {});

    if (failed.length > 0) {
      console.warn(`sendEmail: ${failed.length} failed:`, failed);
    }

    return { sent, failed: failed.length, errors: failed };
  }
);
