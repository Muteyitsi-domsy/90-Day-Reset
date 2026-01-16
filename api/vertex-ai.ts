import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleAuth } from 'google-auth-library';
import {
  getCorsHeaders,
  SECURITY_HEADERS,
  RATE_LIMIT_CONFIG,
  VALIDATION_LIMITS,
  isOriginAllowed
} from './security-config';

// Rate limiting storage (in-memory for serverless - will reset between cold starts)
// TODO: For production, migrate to Vercel KV for persistent storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Configuration
const DAILY_LIMIT_PER_USER = RATE_LIMIT_CONFIG.DAILY_LIMIT_PER_USER;
const MAX_COST_PER_MONTH = RATE_LIMIT_CONFIG.MAX_COST_PER_MONTH;
const VERTEX_PROJECT_ID = process.env.VERTEX_PROJECT_ID;
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';

// Cost tracking (in-memory - for production use a database)
let monthlySpend = 0;
let lastResetDate = new Date().getMonth();

// Simple cost estimation (based on Gemini 1.5 Flash pricing)
function estimateCost(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_1K = 0.00001875;
  const OUTPUT_COST_PER_1K = 0.000075;

  const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K;
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K;

  return inputCost + outputCost;
}

// Rate limiting check
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userKey = `user:${userId}`;
  const userLimit = rateLimitStore.get(userKey);

  // Reset daily at midnight
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitStore.set(userKey, {
      count: 1,
      resetTime: midnight.getTime()
    });
    return true;
  }

  if (userLimit.count >= DAILY_LIMIT_PER_USER) {
    return false;
  }

  userLimit.count++;
  return true;
}

// Monthly cost tracking
function trackCost(cost: number): boolean {
  const currentMonth = new Date().getMonth();

  // Reset monthly spend on new month
  if (currentMonth !== lastResetDate) {
    monthlySpend = 0;
    lastResetDate = currentMonth;
  }

  monthlySpend += cost;

  // Check if we've exceeded monthly cap
  return monthlySpend <= MAX_COST_PER_MONTH;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Get origin from request
  const origin = req.headers.origin as string | undefined;

  // Validate origin and set secure CORS headers
  if (origin && !isOriginAllowed(origin)) {
    return res.status(403).json({ error: 'Forbidden: Origin not allowed' });
  }

  // Set CORS headers
  const corsHeaders = getCorsHeaders(origin);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Set security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, userId, requestType, config } = req.body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt: must be a non-empty string' });
    }

    if (prompt.length === 0) {
      return res.status(400).json({ error: 'Invalid prompt: cannot be empty' });
    }

    if (prompt.length > RATE_LIMIT_CONFIG.MAX_PROMPT_LENGTH) {
      return res.status(413).json({
        error: `Prompt too long: maximum ${RATE_LIMIT_CONFIG.MAX_PROMPT_LENGTH} characters`,
        maxLength: RATE_LIMIT_CONFIG.MAX_PROMPT_LENGTH
      });
    }

    // Validate requestType
    const validRequestTypes = ['onboarding', 'analysis', 'summary', 'hunch', 'general'];
    if (requestType && !validRequestTypes.includes(requestType)) {
      return res.status(400).json({
        error: 'Invalid request type',
        validTypes: validRequestTypes
      });
    }

    // Validate config parameters
    if (config) {
      if (config.temperature !== undefined) {
        if (typeof config.temperature !== 'number' || config.temperature < 0 || config.temperature > 2) {
          return res.status(400).json({
            error: 'Invalid temperature: must be between 0 and 2'
          });
        }
      }

      if (config.maxOutputTokens !== undefined) {
        if (typeof config.maxOutputTokens !== 'number' ||
            config.maxOutputTokens < 100 ||
            config.maxOutputTokens > RATE_LIMIT_CONFIG.MAX_OUTPUT_TOKENS) {
          return res.status(400).json({
            error: `Invalid maxOutputTokens: must be between 100 and ${RATE_LIMIT_CONFIG.MAX_OUTPUT_TOKENS}`
          });
        }
      }

      if (config.topP !== undefined) {
        if (typeof config.topP !== 'number' || config.topP < 0 || config.topP > 1) {
          return res.status(400).json({
            error: 'Invalid topP: must be between 0 and 1'
          });
        }
      }
    }

    // Validate userId
    if (userId && typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid userId: must be a string' });
    }

    // Use a default userId if not provided (for backward compatibility)
    // NOTE: This should be replaced with server-side authentication
    const effectiveUserId = userId || 'anonymous';

    // Rate limiting check
    if (!checkRateLimit(effectiveUserId)) {
      return res.status(429).json({
        error: 'Daily limit reached. Please try again tomorrow or upgrade to premium.',
        resetTime: new Date(Date.now() + 86400000).toISOString() // 24 hours from now
      });
    }

    // Check monthly spending cap
    if (monthlySpend >= MAX_COST_PER_MONTH) {
      console.error(`Monthly spending cap reached: $${monthlySpend.toFixed(2)}`);
      return res.status(503).json({
        error: 'Service temporarily unavailable. Please try again later.',
        code: 'BUDGET_EXCEEDED'
      });
    }

    // Validate environment variables
    if (!VERTEX_PROJECT_ID) {
      console.error('VERTEX_PROJECT_ID not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
      console.error('GOOGLE_APPLICATION_CREDENTIALS_JSON not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Initialize Google Auth
    const auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform',
      credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
    });

    // Choose model based on request type (can optimize costs by using Flash for most requests)
    const model = requestType === 'summary' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
    const endpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:generateContent`;

    // Get access token
    const accessToken = await auth.getAccessToken();

    if (!accessToken) {
      console.error('Failed to get access token');
      return res.status(500).json({ error: 'Authentication failed' });
    }

    // Make request to Vertex AI
    const startTime = Date.now();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: config?.temperature || 0.7,
          maxOutputTokens: config?.maxOutputTokens || 2048,
          topP: config?.topP || 0.95,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Vertex AI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });

      return res.status(response.status).json({
        error: 'AI service error',
        details: response.statusText
      });
    }

    const data = await response.json();

    // Extract response text
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('No text in response:', JSON.stringify(data, null, 2));
      return res.status(500).json({ error: 'Invalid response from AI service' });
    }

    // Estimate and track cost (rough estimation based on character count)
    const estimatedInputTokens = Math.ceil(prompt.length / 4); // ~4 chars per token
    const estimatedOutputTokens = Math.ceil(text.length / 4);
    const estimatedCost = estimateCost(estimatedInputTokens, estimatedOutputTokens);

    trackCost(estimatedCost);

    // Log for monitoring (remove in production or send to proper logging service)
    console.log({
      requestType,
      userId: effectiveUserId,
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      cost: estimatedCost.toFixed(6),
      monthlySpend: monthlySpend.toFixed(2),
      responseTime: `${responseTime}ms`,
      model
    });

    // Return successful response
    res.status(200).json({
      text,
      metadata: {
        model,
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        estimatedCost: estimatedCost.toFixed(6),
        responseTime,
        monthlySpend: monthlySpend.toFixed(2)
      }
    });

  } catch (error: any) {
    console.error('Vertex AI handler error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}
