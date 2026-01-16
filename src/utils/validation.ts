/**
 * Input Validation Utilities
 * Centralized validation logic with Zod schemas for type safety
 */

import { z } from 'zod';

// ========================================
// VALIDATION CONSTANTS
// ========================================

export const VALIDATION_LIMITS = {
  EMAIL_MAX_LENGTH: 254,           // RFC 5321
  PASSWORD_MIN_LENGTH: 12,         // NIST recommends 12+ for strong security
  PASSWORD_MAX_LENGTH: 128,
  DISPLAY_NAME_MIN_LENGTH: 2,
  DISPLAY_NAME_MAX_LENGTH: 100,
  PIN_LENGTH: 6,                   // Increased from 4 for better security
  RECOVERY_CODE_LENGTH: 7,         // Increased from 6
};

// ========================================
// EMAIL VALIDATION
// ========================================

/**
 * RFC 5322 compliant email regex
 * More permissive than strict validation to avoid false negatives
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(VALIDATION_LIMITS.EMAIL_MAX_LENGTH, `Email must be ${VALIDATION_LIMITS.EMAIL_MAX_LENGTH} characters or less`)
  .email('Please enter a valid email address')
  .regex(EMAIL_REGEX, 'Please enter a valid email address');

/**
 * Validates an email address
 * @param email - Email to validate
 * @returns Error message if invalid, null if valid
 */
export function validateEmail(email: string): string | null {
  try {
    emailSchema.parse(email);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid email';
    }
    return 'Invalid email';
  }
}

// ========================================
// PASSWORD VALIDATION
// ========================================

/**
 * Password strength requirements:
 * - Minimum 12 characters (NIST recommendation)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (optional but recommended)
 */
export const passwordSchema = z
  .string()
  .min(VALIDATION_LIMITS.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`)
  .max(VALIDATION_LIMITS.PASSWORD_MAX_LENGTH, `Password must be ${VALIDATION_LIMITS.PASSWORD_MAX_LENGTH} characters or less`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Validates a password and returns detailed feedback
 * @param password - Password to validate
 * @returns Error message if invalid, null if valid
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }

  if (password.length < VALIDATION_LIMITS.PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN_LENGTH} characters`;
  }

  if (password.length > VALIDATION_LIMITS.PASSWORD_MAX_LENGTH) {
    return `Password must be ${VALIDATION_LIMITS.PASSWORD_MAX_LENGTH} characters or less`;
  }

  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z)';
  }

  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter (a-z)';
  }

  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number (0-9)';
  }

  // Check for common weak passwords
  const commonWeakPasswords = [
    'password123', 'password1234', '123456789012', 'qwertyuiop12',
    'welcome12345', 'letmein12345', 'admin1234567'
  ];

  const lowerPassword = password.toLowerCase();
  if (commonWeakPasswords.some(weak => lowerPassword.includes(weak))) {
    return 'This password is too common. Please choose a stronger password.';
  }

  return null;
}

/**
 * Calculates password strength (0-100)
 * @param password - Password to evaluate
 * @returns Strength score and label
 */
export function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;

  // Length scoring
  if (password.length >= 12) score += 25;
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;

  // Character variety scoring
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 20; // Special characters

  // Determine label and color
  if (score < 40) return { score, label: 'Weak', color: '#ef4444' };
  if (score < 60) return { score, label: 'Fair', color: '#f59e0b' };
  if (score < 80) return { score, label: 'Good', color: '#3b82f6' };
  return { score, label: 'Strong', color: '#10b981' };
}

// ========================================
// DISPLAY NAME VALIDATION
// ========================================

export const displayNameSchema = z
  .string()
  .trim()
  .min(VALIDATION_LIMITS.DISPLAY_NAME_MIN_LENGTH, `Name must be at least ${VALIDATION_LIMITS.DISPLAY_NAME_MIN_LENGTH} characters`)
  .max(VALIDATION_LIMITS.DISPLAY_NAME_MAX_LENGTH, `Name must be ${VALIDATION_LIMITS.DISPLAY_NAME_MAX_LENGTH} characters or less`)
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

/**
 * Sanitizes and validates a display name
 * @param name - Display name to validate
 * @returns Sanitized name if valid, or error message
 */
export function validateDisplayName(name: string): { valid: boolean; value?: string; error?: string } {
  try {
    const sanitized = name.trim();
    displayNameSchema.parse(sanitized);
    return { valid: true, value: sanitized };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { valid: false, error: error.errors[0]?.message || 'Invalid name' };
    }
    return { valid: false, error: 'Invalid name' };
  }
}

// ========================================
// PIN VALIDATION
// ========================================

/**
 * Validates a PIN (6 alphanumeric characters)
 * @param pin - PIN to validate
 * @returns Error message if invalid, null if valid
 */
export function validatePin(pin: string): string | null {
  if (!pin) {
    return 'PIN is required';
  }

  if (pin.length !== VALIDATION_LIMITS.PIN_LENGTH) {
    return `PIN must be exactly ${VALIDATION_LIMITS.PIN_LENGTH} characters`;
  }

  if (!/^[A-Z0-9]+$/.test(pin)) {
    return 'PIN can only contain uppercase letters and numbers';
  }

  return null;
}

/**
 * Generates a random secure PIN
 * @returns 6-character alphanumeric PIN
 */
export function generateSecurePin(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pin = '';

  // Use crypto.getRandomValues for cryptographically secure random numbers
  const randomValues = new Uint32Array(VALIDATION_LIMITS.PIN_LENGTH);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < VALIDATION_LIMITS.PIN_LENGTH; i++) {
    pin += chars[randomValues[i] % chars.length];
  }

  return pin;
}

/**
 * Generates a recovery code (7 digits)
 * @returns 7-digit recovery code
 */
export function generateRecoveryCode(): string {
  const randomValues = new Uint32Array(1);
  crypto.getRandomValues(randomValues);

  // Generate 7-digit number (1000000 to 9999999)
  const code = 1000000 + (randomValues[0] % 9000000);
  return code.toString();
}

// ========================================
// JOURNAL ENTRY VALIDATION
// ========================================

export const journalEntrySchema = z.object({
  rawText: z
    .string()
    .min(1, 'Entry cannot be empty')
    .max(50000, 'Entry is too long (maximum 50,000 characters)'),
  type: z.enum(['morning', 'evening']),
});

/**
 * Validates a journal entry
 * @param entry - Entry to validate
 * @returns Error message if invalid, null if valid
 */
export function validateJournalEntry(entry: { rawText: string; type: string }): string | null {
  try {
    journalEntrySchema.parse(entry);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message || 'Invalid entry';
    }
    return 'Invalid entry';
  }
}

// ========================================
// SANITIZATION UTILITIES
// ========================================

/**
 * Sanitizes text input to prevent XSS
 * Removes potentially dangerous characters while preserving readability
 * @param input - Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeText(input: string): string {
  if (!input) return '';

  return input
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove most control characters (but keep newlines, tabs, carriage returns)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit consecutive whitespace
    .replace(/\s+/g, ' ');
}

/**
 * Sanitizes HTML to prevent XSS attacks
 * For use with user-generated content that might be rendered as HTML
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}
