"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBetaCodeHttp = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const ALLOWED_ORIGINS = [
    'https://www.renew90.app',
    'https://renew90.app',
    'capacitor://localhost',
    'http://localhost',
    'http://localhost:5173',
];
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
 * Returns: { success: true, durationDays: number } or { success: false, error: string }
 */
exports.validateBetaCodeHttp = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    // CORS
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    }
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    const rawCode = req.body?.code;
    if (typeof rawCode !== 'string' || rawCode.trim().length === 0) {
        res.status(400).json({ success: false, error: 'A code is required.' });
        return;
    }
    const code = rawCode.trim().toUpperCase();
    const codeRef = db.collection('betaCodes').doc(code);
    try {
        const snap = await codeRef.get();
        if (!snap.exists) {
            res.status(404).json({ success: false, error: 'Invalid code.' });
            return;
        }
        const data = snap.data();
        if (!data.active) {
            res.status(403).json({ success: false, error: 'This code is no longer active.' });
            return;
        }
        const expiresAt = data.expiresAt;
        if (expiresAt && expiresAt.toMillis() < Date.now()) {
            res.status(403).json({ success: false, error: 'This code has expired.' });
            return;
        }
        const usageLimit = data.usageLimit ?? 0;
        const usageCount = data.usageCount ?? 0;
        if (usageLimit > 0 && usageCount >= usageLimit) {
            res.status(429).json({ success: false, error: 'This code has reached its usage limit.' });
            return;
        }
        // Atomically increment usage count
        await codeRef.update({ usageCount: firestore_1.FieldValue.increment(1) });
        const durationDays = data.durationDays ?? 90;
        res.status(200).json({ success: true, durationDays });
    }
    catch (err) {
        console.error('validateBetaCode error:', err);
        res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
    }
});
//# sourceMappingURL=index.js.map