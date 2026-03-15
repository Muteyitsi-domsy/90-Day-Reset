import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

initializeApp();
const db = getFirestore();

/**
 * Validates a beta access code server-side.
 *
 * Codes live in Firestore: betaCodes/{uppercased_code}
 * Document shape:
 *   active:      boolean   — can be toggled to revoke a code instantly
 *   expiresAt:   Timestamp — when the code stops working
 *   usageLimit:  number    — max total redemptions (0 = unlimited)
 *   usageCount:  number    — how many times it has been redeemed
 *   durationDays: number   — how many days of access to grant (default 90)
 *
 * Returns: { success: true, durationDays: number } or throws HttpsError.
 */
export const validateBetaCode = onCall(
  {
    region: 'us-central1',
    enforceAppCheck: false,
    cors: [
      'https://www.renew90.app',
      'https://renew90.app',
      'capacitor://localhost',
      'http://localhost',
    ],
  },
  async (request) => {
    const rawCode = request.data?.code;
    if (typeof rawCode !== 'string' || rawCode.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'A code is required.');
    }

    const code = rawCode.trim().toUpperCase();
    const codeRef = db.collection('betaCodes').doc(code);

    try {
      const snap = await codeRef.get();

      if (!snap.exists) {
        throw new HttpsError('not-found', 'Invalid code.');
      }

      const data = snap.data()!;

      if (!data.active) {
        throw new HttpsError('failed-precondition', 'This code is no longer active.');
      }

      const expiresAt: FirebaseFirestore.Timestamp = data.expiresAt;
      if (expiresAt && expiresAt.toMillis() < Date.now()) {
        throw new HttpsError('failed-precondition', 'This code has expired.');
      }

      const usageLimit: number = data.usageLimit ?? 0;
      const usageCount: number = data.usageCount ?? 0;
      if (usageLimit > 0 && usageCount >= usageLimit) {
        throw new HttpsError('resource-exhausted', 'This code has reached its usage limit.');
      }

      // Atomically increment usage count
      await codeRef.update({ usageCount: FieldValue.increment(1) });

      const durationDays: number = data.durationDays ?? 90;
      return { success: true, durationDays };
    } catch (err) {
      // Re-throw HttpsErrors as-is; wrap anything else
      if (err instanceof HttpsError) throw err;
      console.error('validateBetaCode error:', err);
      throw new HttpsError('internal', 'Something went wrong. Please try again.');
    }
  }
);
