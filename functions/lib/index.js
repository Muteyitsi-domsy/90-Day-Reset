"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBetaCode = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
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
exports.validateBetaCode = (0, https_1.onCall)({
    region: 'us-central1',
    enforceAppCheck: false,
    cors: [
        'https://www.renew90.app',
        'https://renew90.app',
        'capacitor://localhost',
        'http://localhost',
    ],
}, async (request) => {
    const rawCode = request.data?.code;
    if (typeof rawCode !== 'string' || rawCode.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'A code is required.');
    }
    const code = rawCode.trim().toUpperCase();
    const codeRef = db.collection('betaCodes').doc(code);
    try {
        const snap = await codeRef.get();
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Invalid code.');
        }
        const data = snap.data();
        if (!data.active) {
            throw new https_1.HttpsError('failed-precondition', 'This code is no longer active.');
        }
        const expiresAt = data.expiresAt;
        if (expiresAt && expiresAt.toMillis() < Date.now()) {
            throw new https_1.HttpsError('failed-precondition', 'This code has expired.');
        }
        const usageLimit = data.usageLimit ?? 0;
        const usageCount = data.usageCount ?? 0;
        if (usageLimit > 0 && usageCount >= usageLimit) {
            throw new https_1.HttpsError('resource-exhausted', 'This code has reached its usage limit.');
        }
        // Atomically increment usage count
        await codeRef.update({ usageCount: firestore_1.FieldValue.increment(1) });
        const durationDays = data.durationDays ?? 90;
        return { success: true, durationDays };
    }
    catch (err) {
        // Re-throw HttpsErrors as-is; wrap anything else
        if (err instanceof https_1.HttpsError)
            throw err;
        console.error('validateBetaCode error:', err);
        throw new https_1.HttpsError('internal', 'Something went wrong. Please try again.');
    }
});
//# sourceMappingURL=index.js.map