/**
 * Security Configuration for API Endpoints
 *
 * IMPORTANT: Update ALLOWED_ORIGINS before deploying to production
 */

// Allowed origins for CORS
export const ALLOWED_ORIGINS = [
  'http://localhost:5173',           // Local development (Vite default)
  'http://localhost:3000',           // Local development (alternative)
  'https://90-day-reset.vercel.app', // Production domain
  // Add your custom domain here when you deploy:
  // 'https://yourdomain.com',
  // 'https://www.yourdomain.com',
];

// Development mode check
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development' ||
                              process.env.VERCEL_ENV === 'development';

/**
 * Validates if the request origin is allowed
 * @param origin - The origin from the request headers
 * @returns true if origin is allowed, false otherwise
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    // Allow requests with no origin (like from Postman, curl, or same-origin)
    // You can make this stricter by returning false
    return true;
  }

  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Gets CORS headers for a response
 * @param origin - The origin from the request
 * @returns CORS headers object
 */
export function getCorsHeaders(origin: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400', // 24 hours
  };

  // Only set origin if it's in the allowed list
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
}

/**
 * Security headers to add to all responses
 */
export const SECURITY_HEADERS = {
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Enable XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',

  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions policy (restrict features)
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

/**
 * Rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
  DAILY_LIMIT_PER_USER: 50,        // Max requests per user per day
  MAX_COST_PER_MONTH: 100,         // Max spending in USD per month
  MAX_PROMPT_LENGTH: 10000,        // Max prompt length in characters
  MAX_OUTPUT_TOKENS: 4096,         // Max output tokens allowed
  PIN_MAX_ATTEMPTS: 3,             // Max PIN attempts before lockout
  PIN_LOCKOUT_MINUTES: 15,         // Lockout duration in minutes
};

/**
 * Input validation limits
 */
export const VALIDATION_LIMITS = {
  EMAIL_MAX_LENGTH: 254,           // RFC 5321
  PASSWORD_MIN_LENGTH: 12,         // Increased from 6
  PASSWORD_MAX_LENGTH: 128,
  DISPLAY_NAME_MAX_LENGTH: 100,
  PIN_LENGTH: 6,                   // Increased from 4
  RECOVERY_CODE_LENGTH: 7,         // Increased from 6
  JOURNAL_ENTRY_MAX_LENGTH: 50000, // ~50KB
};
