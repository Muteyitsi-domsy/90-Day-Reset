import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAppCheck } from 'firebase-admin/app-check';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { GoogleAuth } from 'google-auth-library';

initializeApp();
const db = getFirestore();

// Module-level singleton — initialized once per cold start, reused across warm requests.
const googleAuth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });

const DAILY_LIMIT_PER_USER = 50;
const MAX_COST_PER_MONTH   = 100;   // USD
const MAX_PROMPT_LENGTH    = 10000;
const MAX_OUTPUT_TOKENS    = 4096;

const VERTEX_PROJECT_ID = process.env.VERTEX_PROJECT_ID || 'gen-lang-client-0241198831';
const VERTEX_LOCATION   = process.env.VERTEX_LOCATION   || 'us-central1';

const APP_CHECK_HEADER = 'x-firebase-appcheck';

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
  { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
];

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
  constructor(message: string, public httpStatus: number) {
    super(message);
    this.name = 'HttpError';
  }
}

function setCorsHeaders(res: any, origin: string): void {
  const allowed = !origin || ALLOWED_ORIGINS.includes(origin);
  res.set('Access-Control-Allow-Origin', allowed ? (origin || '*') : 'null');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Firebase-AppCheck');
}

// ---------------------------------------------------------------------------
// Vertex AI proxy helpers
// ---------------------------------------------------------------------------

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * 0.00001875 + (outputTokens / 1000) * 0.000075;
}

/**
 * Atomically increment the user's daily request count in Firestore.
 * Returns false if the user has hit the daily limit.
 * Resets the counter automatically when the date rolls over.
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const ref = db.collection('rateLimits').doc(userId);

  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const data = snap.exists ? snap.data()! : {};
    const count: number = data.date === today ? (data.count ?? 0) : 0;

    if (count >= DAILY_LIMIT_PER_USER) return false;

    t.set(ref, { date: today, count: count + 1 }, { merge: true });
    return true;
  });
}

/**
 * Atomically add to the monthly spend tracker and return false if the cap is hit.
 */
async function trackCost(cost: number): Promise<boolean> {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const ref = db.collection('rateLimits').doc('_spend_');

  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const data = snap.exists ? snap.data()! : {};
    const current: number = data[monthKey] ?? 0;
    const updated = current + cost;

    t.set(ref, { [monthKey]: updated }, { merge: true });
    return updated <= MAX_COST_PER_MONTH;
  });
}

/**
 * Verifies a Firebase App Check token.
 * Fails open (returns true) when no token is supplied so local dev works without
 * App Check configured. Production enforcement is controlled by the Firebase
 * Console toggle — flip each app to "Enforce" once you see clean traffic in
 * the App Check monitoring view.
 */
async function verifyAppCheck(token: string | undefined): Promise<boolean> {
  if (!token) return true;
  try {
    await getAppCheck().verifyToken(token);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// vertexAiProxy — hardened Vertex AI serverless function
// ---------------------------------------------------------------------------

export const vertexAiProxy = onRequest(
  { region: 'us-central1', memory: '256MiB', timeoutSeconds: 60 },
  async (req, res) => {
    const origin = req.headers.origin || '';
    setCorsHeaders(res, origin);

    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const appCheckToken = req.headers[APP_CHECK_HEADER] as string | undefined;
    if (!await verifyAppCheck(appCheckToken)) {
      res.status(401).json({ error: 'App Check verification failed' });
      return;
    }

    const authHeader = req.headers.authorization;
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) { res.status(401).json({ error: 'Authentication required' }); return; }

    let uid: string;
    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch {
      res.status(401).json({ error: 'Invalid or expired authentication token' }); return;
    }

    const { prompt, requestType, config } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.length === 0) {
      res.status(400).json({ error: 'Invalid prompt: must be a non-empty string' }); return;
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      res.status(413).json({ error: `Prompt too long: maximum ${MAX_PROMPT_LENGTH} characters`, maxLength: MAX_PROMPT_LENGTH }); return;
    }

    const validRequestTypes = ['onboarding', 'analysis', 'summary', 'hunch', 'general'];
    if (requestType && !validRequestTypes.includes(requestType)) {
      res.status(400).json({ error: 'Invalid request type', validTypes: validRequestTypes }); return;
    }

    if (config) {
      if (config.temperature !== undefined &&
          (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2)) {
        res.status(400).json({ error: 'Invalid temperature: must be between 0 and 2' }); return;
      }
      if (config.maxOutputTokens !== undefined &&
          (typeof config.maxOutputTokens !== 'number' || config.maxOutputTokens < 100 || config.maxOutputTokens > MAX_OUTPUT_TOKENS)) {
        res.status(400).json({ error: `Invalid maxOutputTokens: must be between 100 and ${MAX_OUTPUT_TOKENS}` }); return;
      }
      if (config.topP !== undefined &&
          (typeof config.topP !== 'number' || config.topP < 0 || config.topP > 1)) {
        res.status(400).json({ error: 'Invalid topP: must be between 0 and 1' }); return;
      }
    }

    if (!await checkRateLimit(uid)) {
      res.status(429).json({
        error: 'Daily limit reached. Please try again tomorrow or upgrade to premium.',
        resetTime: new Date(Date.now() + 86400000).toISOString(),
      });
      return;
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const spendSnap = await db.collection('rateLimits').doc('_spend_').get();
    const currentSpend: number = spendSnap.exists ? (spendSnap.data()![monthKey] ?? 0) : 0;
    if (currentSpend >= MAX_COST_PER_MONTH) {
      console.error(`Monthly spending cap reached: $${currentSpend.toFixed(2)}`);
      res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.', code: 'BUDGET_EXCEEDED' });
      return;
    }

    const model = requestType === 'summary' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`;

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
        safetySettings: SAFETY_SETTINGS,
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
    const text: string | undefined = parts.find((p: { thought?: boolean; text?: string }) => !p.thought)?.text ?? parts[0]?.text;

    if (!text) {
      console.error('No text in Vertex AI response:', JSON.stringify(data));
      res.status(500).json({ error: 'Invalid response from AI service' });
      return;
    }

    const estimatedInputTokens  = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil(text.length / 4);
    const cost = estimateCost(estimatedInputTokens, estimatedOutputTokens);
    const responseTime = Date.now() - startTime;
    await trackCost(cost);

    console.log({ requestType, userId: uid, inputTokens: estimatedInputTokens, outputTokens: estimatedOutputTokens, cost: cost.toFixed(6), responseTime: `${responseTime}ms`, model });

    res.status(200).json({
      text,
      metadata: { model, inputTokens: estimatedInputTokens, outputTokens: estimatedOutputTokens, responseTime },
    });
  }
);

// ---------------------------------------------------------------------------
// validateBetaCodeHttp — beta access code validator
// ---------------------------------------------------------------------------

export const validateBetaCodeHttp = onRequest(
  { region: 'us-central1' },
  async (req, res) => {
    const origin = req.headers.origin || '';
    setCorsHeaders(res, origin);

    if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
    if (req.method !== 'POST') { res.status(405).json({ success: false, error: 'Method not allowed' }); return; }

    const appCheckToken = req.headers[APP_CHECK_HEADER] as string | undefined;
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
      let durationDays!: number;

      await db.runTransaction(async (t) => {
        const snap = await t.get(codeRef);

        if (!snap.exists) throw new HttpError('Invalid code.', 404);

        const data = snap.data()!;

        if (!data.active) throw new HttpError('This code is no longer active.', 403);

        const expiresAt: FirebaseFirestore.Timestamp = data.expiresAt;
        if (expiresAt && expiresAt.toMillis() < Date.now()) throw new HttpError('This code has expired.', 403);

        const usageLimit: number = data.usageLimit ?? 0;
        const usageCount: number = data.usageCount ?? 0;
        if (usageLimit > 0 && usageCount >= usageLimit) {
          throw new HttpError('This code has reached its usage limit.', 429);
        }

        t.update(codeRef, { usageCount: FieldValue.increment(1) });
        durationDays = data.durationDays ?? 90;
      });

      res.status(200).json({ success: true, durationDays });
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.httpStatus).json({ success: false, error: err.message });
        return;
      }
      console.error('validateBetaCode error:', err);
      res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
    }
  }
);
