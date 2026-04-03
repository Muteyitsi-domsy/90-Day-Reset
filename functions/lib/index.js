"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBetaCodeHttp = exports.vertexAiProxy = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const app_check_1 = require("firebase-admin/app-check");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const google_auth_library_1 = require("google-auth-library");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------
const DAILY_LIMIT_PER_USER = 50;
const MAX_COST_PER_MONTH = 100; // USD
const MAX_PROMPT_LENGTH = 10000;
const MAX_OUTPUT_TOKENS = 4096;
const VERTEX_PROJECT_ID = process.env.VERTEX_PROJECT_ID || 'gen-lang-client-0241198831';
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
const ALLOWED_ORIGINS = [
    'https://www.renew90.app',
    'https://renew90.app',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost',
    'http://localhost:5173',
    'https://localhost:5173',
];
class HttpError extends Error {
    constructor(message, httpStatus) {
        super(message);
        this.httpStatus = httpStatus;
        this.name = 'HttpError';
    }
}
function setCorsHeaders(res, origin) {
    const allowed = !origin || ALLOWED_ORIGINS.includes(origin);
    res.set('Access-Control-Allow-Origin', allowed ? (origin || '*') : 'null');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Firebase-AppCheck');
}
// ---------------------------------------------------------------------------
// Vertex AI proxy helpers
// ---------------------------------------------------------------------------
function estimateCost(inputTokens, outputTokens) {
    return (inputTokens / 1000) * 0.00001875 + (outputTokens / 1000) * 0.000075;
}
/**
 * Atomically increment the user's daily request count in Firestore.
 * Returns false if the user has hit the daily limit.
 * Resets the counter automatically when the date rolls over.
 */
async function checkRateLimit(userId) {
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    const ref = db.collection('rateLimits').doc(userId);
    return db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        const data = snap.exists ? snap.data() : {};
        const count = data.date === today ? (data.count ?? 0) : 0;
        if (count >= DAILY_LIMIT_PER_USER)
            return false;
        t.set(ref, { date: today, count: count + 1 }, { merge: true });
        return true;
    });
}
/**
 * Atomically add to the monthly spend tracker and return false if the cap is hit.
 */
async function trackCost(cost) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const ref = db.collection('rateLimits').doc('_spend_');
    return db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        const data = snap.exists ? snap.data() : {};
        const current = data[monthKey] ?? 0;
        const updated = current + cost;
        t.set(ref, { [monthKey]: updated }, { merge: true });
        return updated <= MAX_COST_PER_MONTH;
    });
}
/**
 * Verify a Firebase App Check token.
 * Returns true if valid; false if missing or invalid.
 * We fail open (return true) when no token is present in dev mode so local
 * testing still works — tighten this to hard-fail once App Check is enforced
 * in the Firebase console.
 */
async function verifyAppCheck(token) {
    if (!token)
        return true; // dev/debug mode — enforce via Firebase console toggle
    try {
        await (0, app_check_1.getAppCheck)().verifyToken(token);
        return true;
    }
    catch {
        return false;
    }
}
// ---------------------------------------------------------------------------
// vertexAiProxy — hardened Vertex AI serverless function
// ---------------------------------------------------------------------------
exports.vertexAiProxy = (0, https_1.onRequest)({ region: 'us-central1', memory: '256MiB', timeoutSeconds: 60 }, async (req, res) => {
    const origin = req.headers.origin || '';
    setCorsHeaders(res, origin);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    // 1. App Check — proves request is from the genuine app binary
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (!await verifyAppCheck(appCheckToken)) {
        res.status(401).json({ error: 'App Check verification failed' });
        return;
    }
    // 2. Firebase ID token — proves request is from an authenticated user
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    let uid;
    try {
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(idToken);
        uid = decoded.uid;
    }
    catch {
        res.status(401).json({ error: 'Invalid or expired authentication token' });
        return;
    }
    // 3. Input validation
    const { prompt, requestType, config } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.length === 0) {
        res.status(400).json({ error: 'Invalid prompt: must be a non-empty string' });
        return;
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
        res.status(413).json({ error: `Prompt too long: maximum ${MAX_PROMPT_LENGTH} characters`, maxLength: MAX_PROMPT_LENGTH });
        return;
    }
    const validRequestTypes = ['onboarding', 'analysis', 'summary', 'hunch', 'general'];
    if (requestType && !validRequestTypes.includes(requestType)) {
        res.status(400).json({ error: 'Invalid request type', validTypes: validRequestTypes });
        return;
    }
    if (config) {
        if (config.temperature !== undefined &&
            (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2)) {
            res.status(400).json({ error: 'Invalid temperature: must be between 0 and 2' });
            return;
        }
        if (config.maxOutputTokens !== undefined &&
            (typeof config.maxOutputTokens !== 'number' || config.maxOutputTokens < 100 || config.maxOutputTokens > MAX_OUTPUT_TOKENS)) {
            res.status(400).json({ error: `Invalid maxOutputTokens: must be between 100 and ${MAX_OUTPUT_TOKENS}` });
            return;
        }
        if (config.topP !== undefined &&
            (typeof config.topP !== 'number' || config.topP < 0 || config.topP > 1)) {
            res.status(400).json({ error: 'Invalid topP: must be between 0 and 1' });
            return;
        }
    }
    // 4. Rate limiting — per-user daily cap (Firestore, atomic)
    if (!await checkRateLimit(uid)) {
        res.status(429).json({
            error: 'Daily limit reached. Please try again tomorrow or upgrade to premium.',
            resetTime: new Date(Date.now() + 86400000).toISOString(),
        });
        return;
    }
    // 5. Monthly spend pre-check
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const spendSnap = await db.collection('rateLimits').doc('_spend_').get();
    const currentSpend = spendSnap.exists ? (spendSnap.data()[monthKey] ?? 0) : 0;
    if (currentSpend >= MAX_COST_PER_MONTH) {
        console.error(`Monthly spending cap reached: $${currentSpend.toFixed(2)}`);
        res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.', code: 'BUDGET_EXCEEDED' });
        return;
    }
    // 6. Call Vertex AI — uses ambient GCP service account (no credentials JSON needed)
    const model = requestType === 'summary' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`;
    const googleAuth = new google_auth_library_1.GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
    const accessToken = await googleAuth.getAccessToken();
    if (!accessToken) {
        console.error('Failed to obtain GCP access token');
        res.status(500).json({ error: 'Authentication failed' });
        return;
    }
    const startTime = Date.now();
    const aiResponse = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: config?.temperature ?? 0.7,
                maxOutputTokens: config?.maxOutputTokens ?? 2048,
                topP: config?.topP ?? 0.95,
                ...(requestType !== 'summary' && { thinkingConfig: { thinkingBudget: 0 } }),
            },
            safetySettings: [
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            ],
        }),
    });
    if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('Vertex AI error:', { status: aiResponse.status, error: errorText });
        res.status(aiResponse.status).json({ error: 'AI service error', details: aiResponse.statusText });
        return;
    }
    const data = await aiResponse.json();
    // Skip thinking parts (thought: true) emitted by Gemini 2.5 Flash
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.find((p) => !p.thought)?.text ?? parts[0]?.text;
    if (!text) {
        console.error('No text in Vertex AI response:', JSON.stringify(data));
        res.status(500).json({ error: 'Invalid response from AI service' });
        return;
    }
    // 7. Cost tracking
    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil(text.length / 4);
    const cost = estimateCost(estimatedInputTokens, estimatedOutputTokens);
    const responseTime = Date.now() - startTime;
    await trackCost(cost);
    console.log({ requestType, userId: uid, inputTokens: estimatedInputTokens, outputTokens: estimatedOutputTokens, cost: cost.toFixed(6), responseTime: `${responseTime}ms`, model });
    res.status(200).json({
        text,
        metadata: { model, inputTokens: estimatedInputTokens, outputTokens: estimatedOutputTokens, responseTime },
    });
});
// ---------------------------------------------------------------------------
// validateBetaCodeHttp — beta access code validator
// ---------------------------------------------------------------------------
exports.validateBetaCodeHttp = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    const origin = req.headers.origin || '';
    setCorsHeaders(res, origin);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, error: 'Method not allowed' });
        return;
    }
    // App Check — gates the beta code endpoint against scripted abuse
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (!await verifyAppCheck(appCheckToken)) {
        res.status(401).json({ success: false, error: 'App Check verification failed' });
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
        let durationDays;
        await db.runTransaction(async (t) => {
            const snap = await t.get(codeRef);
            if (!snap.exists)
                throw new HttpError('Invalid code.', 404);
            const data = snap.data();
            if (!data.active)
                throw new HttpError('This code is no longer active.', 403);
            const expiresAt = data.expiresAt;
            if (expiresAt && expiresAt.toMillis() < Date.now())
                throw new HttpError('This code has expired.', 403);
            const usageLimit = data.usageLimit ?? 0;
            const usageCount = data.usageCount ?? 0;
            if (usageLimit > 0 && usageCount >= usageLimit) {
                throw new HttpError('This code has reached its usage limit.', 429);
            }
            t.update(codeRef, { usageCount: firestore_1.FieldValue.increment(1) });
            durationDays = data.durationDays ?? 90;
        });
        res.status(200).json({ success: true, durationDays });
    }
    catch (err) {
        if (err instanceof HttpError) {
            res.status(err.httpStatus).json({ success: false, error: err.message });
            return;
        }
        console.error('validateBetaCode error:', err);
        res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
    }
});
//# sourceMappingURL=index.js.map