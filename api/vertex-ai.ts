import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleAuth } from 'google-auth-library';
import { Redis } from '@upstash/redis';
import {
  getCorsHeaders,
  SECURITY_HEADERS,
  RATE_LIMIT_CONFIG,
  isOriginAllowed
} from './security-config';

// Persistent Redis client — survives cold starts and works across all instances.
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

// Cache verified UIDs for 5 minutes so repeated requests from the same user
// don't each trigger a round-trip to identitytoolkit.googleapis.com.
const tokenCache = new Map<string, { uid: string; expiresAt: number }>();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

const DAILY_LIMIT_PER_USER = RATE_LIMIT_CONFIG.DAILY_LIMIT_PER_USER;
const MAX_COST_PER_MONTH = RATE_LIMIT_CONFIG.MAX_COST_PER_MONTH;
const VERTEX_PROJECT_ID = process.env.VERTEX_PROJECT_ID;
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';

function estimateCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * 0.00001875 + (outputTokens / 1000) * 0.000075;
}

// Returns true if the request is within the daily limit.
// Uses Redis INCR + EXPIREAT so the count is atomic and persists across instances.
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const ttl = Math.floor((midnight.getTime() - Date.now()) / 1000);

  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, ttl);
  const [count] = await pipeline.exec() as [number, number];

  return count <= DAILY_LIMIT_PER_USER;
}

async function trackCost(cost: number): Promise<boolean> {
  const now = new Date();
  const key = `monthlyspend:${now.getFullYear()}-${now.getMonth()}`;
  const newSpend = await redis.incrbyfloat(key, cost);
  // Set expiry on first write so the key cleans itself up after 35 days
  if (newSpend === cost) await redis.expire(key, 35 * 24 * 60 * 60);
  return newSpend <= MAX_COST_PER_MONTH;
}

/**
 * Verifies a Firebase ID token via the Identity Toolkit REST API.
 * FIREBASE_API_KEY is the Firebase Web API key — intentionally public by Google's design.
 * Set it as a server-side env var in Vercel (same value as VITE_FIREBASE_API_KEY).
 */
async function verifyFirebaseToken(idToken: string): Promise<string | null> {
  const cached = tokenCache.get(idToken);
  if (cached && Date.now() < cached.expiresAt) return cached.uid;

  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) throw new Error('FIREBASE_API_KEY not configured');

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
    );
    if (!response.ok) return null;
    const data = await response.json();
    const uid: string | undefined = data.users?.[0]?.localId;
    if (uid) tokenCache.set(idToken, { uid, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
    return uid ?? null;
  } catch (err: any) {
    // Re-throw config errors; swallow network/parse errors (→ 401)
    if (err.message === 'FIREBASE_API_KEY not configured') throw err;
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | undefined;

  if (origin && !isOriginAllowed(origin)) {
    return res.status(403).json({ error: 'Forbidden: Origin not allowed' });
  }

  const corsHeaders = getCorsHeaders(origin);
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Require a valid Firebase ID token in the Authorization header.
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!idToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const verifiedUserId = await verifyFirebaseToken(idToken);
    if (!verifiedUserId) {
      return res.status(401).json({ error: 'Invalid or expired authentication token' });
    }

    const { prompt, requestType, config } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.length === 0) {
      return res.status(400).json({ error: 'Invalid prompt: must be a non-empty string' });
    }

    if (prompt.length > RATE_LIMIT_CONFIG.MAX_PROMPT_LENGTH) {
      return res.status(413).json({
        error: `Prompt too long: maximum ${RATE_LIMIT_CONFIG.MAX_PROMPT_LENGTH} characters`,
        maxLength: RATE_LIMIT_CONFIG.MAX_PROMPT_LENGTH
      });
    }

    const validRequestTypes = ['onboarding', 'analysis', 'summary', 'hunch', 'general'];
    if (requestType && !validRequestTypes.includes(requestType)) {
      return res.status(400).json({ error: 'Invalid request type', validTypes: validRequestTypes });
    }

    if (config) {
      if (config.temperature !== undefined &&
          (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2)) {
        return res.status(400).json({ error: 'Invalid temperature: must be between 0 and 2' });
      }
      if (config.maxOutputTokens !== undefined &&
          (typeof config.maxOutputTokens !== 'number' ||
           config.maxOutputTokens < 100 ||
           config.maxOutputTokens > RATE_LIMIT_CONFIG.MAX_OUTPUT_TOKENS)) {
        return res.status(400).json({
          error: `Invalid maxOutputTokens: must be between 100 and ${RATE_LIMIT_CONFIG.MAX_OUTPUT_TOKENS}`
        });
      }
      if (config.topP !== undefined &&
          (typeof config.topP !== 'number' || config.topP < 0 || config.topP > 1)) {
        return res.status(400).json({ error: 'Invalid topP: must be between 0 and 1' });
      }
    }

    if (!await checkRateLimit(verifiedUserId)) {
      return res.status(429).json({
        error: 'Daily limit reached. Please try again tomorrow or upgrade to premium.',
        resetTime: new Date(Date.now() + 86400000).toISOString()
      });
    }

    const now = new Date();
    const spendKey = `monthlyspend:${now.getFullYear()}-${now.getMonth()}`;
    const monthlySpend = (await redis.get<number>(spendKey)) ?? 0;
    if (monthlySpend >= MAX_COST_PER_MONTH) {
      console.error(`Monthly spending cap reached: $${monthlySpend.toFixed(2)}`);
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again later.', code: 'BUDGET_EXCEEDED' });
    }

    if (!VERTEX_PROJECT_ID) {
      console.error('VERTEX_PROJECT_ID not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    });

    // Use Pro for summaries; Flash for everything else (cost optimisation)
    const model = requestType === 'summary' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
    const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`;

    const accessToken = await auth.getAccessToken();
    if (!accessToken) {
      console.error('Failed to get access token');
      return res.status(500).json({ error: 'Authentication failed' });
    }

    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config?.temperature ?? 0.7,
          maxOutputTokens: config?.maxOutputTokens ?? 2048,
          topP: config?.topP ?? 0.95,
          // Disable thinking for non-summary requests — thinking tokens share the
          // maxOutputTokens budget on Gemini 2.5 Flash, which truncates the answer.
          ...(requestType !== 'summary' && { thinkingConfig: { thinkingBudget: 0 } }),
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT',  threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',  threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT',         threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI API error:', { status: response.status, error: errorText });
      return res.status(response.status).json({ error: 'AI service error', details: response.statusText });
    }

    const data = await response.json();

    // Skip thinking parts (thought: true) added by Gemini 2.5 Flash
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.find((p: { thought?: boolean; text?: string }) => !p.thought)?.text ?? parts[0]?.text;

    if (!text) {
      console.error('No text in Vertex AI response:', JSON.stringify(data));
      return res.status(500).json({ error: 'Invalid response from AI service' });
    }

    const estimatedInputTokens = Math.ceil(prompt.length / 4);
    const estimatedOutputTokens = Math.ceil(text.length / 4);
    const cost = estimateCost(estimatedInputTokens, estimatedOutputTokens);
    const responseTime = Date.now() - startTime;
    await trackCost(cost);

    console.log({
      requestType,
      userId: verifiedUserId,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      cost: cost.toFixed(6),
      responseTime: `${responseTime}ms`,
      model,
    });

    return res.status(200).json({
      text,
      metadata: { model, inputTokens: estimatedInputTokens, outputTokens: estimatedOutputTokens, responseTime },
    });

  } catch (error: any) {
    console.error('Vertex AI handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
