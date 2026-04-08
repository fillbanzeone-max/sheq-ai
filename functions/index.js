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
// 1. SCHEDULED LOG RETENTION
//    Runs every day at 02:00 UTC.
//    Deletes sheqai/seclog/{uid} entries older than 90 days.
//    After 365 days the record is fully removed (12-month archive
//    requires exporting to Cloud Storage first — see TODO below).
// ============================================================
exports.pruneSecLogs = onSchedule('every 24 hours', async () => {
  const RETAIN_DAYS   = 90;
  const ARCHIVE_DAYS  = 365;
  const now           = Date.now();
  const pruneCutoff   = new Date(now - RETAIN_DAYS  * 86400000).toISOString();
  const archiveCutoff = new Date(now - ARCHIVE_DAYS * 86400000).toISOString();

  const db        = admin.database();
  const usersSnap = await db.ref('sheqai/seclog').once('value');
  const users     = usersSnap.val() || {};

  let pruned = 0;

  for (const uid of Object.keys(users)) {
    const logRef = db.ref(`sheqai/seclog/${uid}`);

    // Delete entries older than ARCHIVE_DAYS (hard delete)
    const archiveSnap = await logRef
      .orderByChild('timestamp')
      .endAt(archiveCutoff)
      .once('value');
    const archiveDels = [];
    archiveSnap.forEach(snap => { archiveDels.push(snap.ref.remove()); pruned++; });
    await Promise.all(archiveDels);

    // TODO: Before deleting 90–365 day entries, export to
    // Cloud Storage bucket for ISO 27001 A.12.4 12-month archive:
    //   const bucket = admin.storage().bucket();
    //   await bucket.file(`seclog/${uid}/${Date.now()}.json`)
    //               .save(JSON.stringify(batchData));
    // Then delete from Realtime DB.
  }

  console.log(`pruneSecLogs: removed ${pruned} log entries`);
});

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
