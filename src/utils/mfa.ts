/**
 * Multi-Factor Authentication (MFA) Utilities
 * Implements TOTP (Time-based One-Time Password) authentication
 *
 * Features:
 * - Generate TOTP secrets
 * - Generate QR codes for authenticator apps
 * - Verify TOTP codes
 * - Generate backup recovery codes
 *
 * Security: Uses industry-standard TOTP (RFC 6238)
 * Compatible with Google Authenticator, Authy, Microsoft Authenticator, etc.
 */

import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

/**
 * MFA configuration constants
 */
export const MFA_CONFIG = {
  ISSUER: '90-Day Reset',
  ALGORITHM: 'SHA1' as const,
  DIGITS: 6,
  PERIOD: 30, // seconds
  BACKUP_CODES_COUNT: 10,
  BACKUP_CODE_LENGTH: 8,
  TOLERANCE_WINDOW: 1, // Allow 1 period before/after for clock drift
};

/**
 * Interface for MFA setup data
 */
export interface MFASetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  uri: string;
}

/**
 * Interface for MFA verification result
 */
export interface MFAVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Generates a new TOTP secret for MFA setup
 *
 * @returns Base32 encoded secret string
 */
export function generateTOTPSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 }); // 160 bits
  return secret.base32;
}

/**
 * Generates backup recovery codes
 *
 * @returns Array of backup codes (format: XXXX-XXXX)
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];

  for (let i = 0; i < MFA_CONFIG.BACKUP_CODES_COUNT; i++) {
    // Generate 8 random alphanumeric characters
    const randomValues = new Uint32Array(MFA_CONFIG.BACKUP_CODE_LENGTH);
    crypto.getRandomValues(randomValues);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';

    for (let j = 0; j < MFA_CONFIG.BACKUP_CODE_LENGTH; j++) {
      code += chars[randomValues[j] % chars.length];
    }

    // Format as XXXX-XXXX for readability
    const formatted = `${code.slice(0, 4)}-${code.slice(4, 8)}`;
    codes.push(formatted);
  }

  return codes;
}

/**
 * Generates MFA setup data including QR code
 *
 * @param userEmail - User's email address
 * @param userName - User's display name (optional)
 * @returns MFA setup data with secret, QR code URL, and backup codes
 */
export async function generateMFASetup(
  userEmail: string,
  userName?: string
): Promise<MFASetupData> {
  // Generate secret
  const secret = generateTOTPSecret();

  // Create TOTP instance
  const totp = new OTPAuth.TOTP({
    issuer: MFA_CONFIG.ISSUER,
    label: userName || userEmail,
    algorithm: MFA_CONFIG.ALGORITHM,
    digits: MFA_CONFIG.DIGITS,
    period: MFA_CONFIG.PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // Generate URI for QR code
  const uri = totp.toString();

  // Generate QR code as data URL
  const qrCodeUrl = await QRCode.toDataURL(uri, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  // Generate backup codes
  const backupCodes = generateBackupCodes();

  return {
    secret,
    qrCodeUrl,
    backupCodes,
    uri,
  };
}

/**
 * Verifies a TOTP code against a secret
 *
 * @param code - 6-digit code from authenticator app
 * @param secret - Base32 encoded secret
 * @param window - Tolerance window for clock drift (default: 1)
 * @returns Verification result
 */
export function verifyTOTPCode(
  code: string,
  secret: string,
  window: number = MFA_CONFIG.TOLERANCE_WINDOW
): MFAVerificationResult {
  try {
    // Validate input
    if (!code || !secret) {
      return {
        valid: false,
        error: 'Code and secret are required',
      };
    }

    // Remove spaces and validate format
    const cleanCode = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(cleanCode)) {
      return {
        valid: false,
        error: 'Code must be 6 digits',
      };
    }

    // Create TOTP instance
    const totp = new OTPAuth.TOTP({
      issuer: MFA_CONFIG.ISSUER,
      algorithm: MFA_CONFIG.ALGORITHM,
      digits: MFA_CONFIG.DIGITS,
      period: MFA_CONFIG.PERIOD,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    // Verify code with tolerance window
    const delta = totp.validate({
      token: cleanCode,
      window,
    });

    // delta will be null if invalid, or a number indicating the time step difference
    if (delta !== null) {
      return { valid: true };
    }

    return {
      valid: false,
      error: 'Invalid code',
    };
  } catch (error) {
    console.error('TOTP verification error:', error);
    return {
      valid: false,
      error: 'Verification failed',
    };
  }
}

/**
 * Verifies a backup recovery code
 *
 * @param code - Backup code to verify
 * @param validCodes - Array of valid unused backup codes
 * @returns Verification result with remaining codes
 */
export function verifyBackupCode(
  code: string,
  validCodes: string[]
): { valid: boolean; remainingCodes?: string[]; error?: string } {
  try {
    // Normalize input (remove spaces, uppercase)
    const cleanCode = code.replace(/\s/g, '').toUpperCase();
    const normalizedCode = cleanCode.includes('-')
      ? cleanCode
      : `${cleanCode.slice(0, 4)}-${cleanCode.slice(4, 8)}`;

    // Check if code exists in valid codes
    const codeIndex = validCodes.findIndex(
      (c) => c.toUpperCase() === normalizedCode
    );

    if (codeIndex === -1) {
      return {
        valid: false,
        error: 'Invalid or already used backup code',
      };
    }

    // Remove used code and return remaining codes
    const remainingCodes = validCodes.filter((_, i) => i !== codeIndex);

    return {
      valid: true,
      remainingCodes,
    };
  } catch (error) {
    console.error('Backup code verification error:', error);
    return {
      valid: false,
      error: 'Verification failed',
    };
  }
}

/**
 * Hash backup codes for secure storage
 * Note: For this app, we'll store hashed versions in Firestore
 *
 * @param codes - Array of backup codes
 * @returns Array of hashed codes
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  const hashed: string[] = [];

  for (const code of codes) {
    // Use Web Crypto API for hashing
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    hashed.push(hashHex);
  }

  return hashed;
}

/**
 * Verifies a backup code against hashed codes
 *
 * @param code - Code to verify
 * @param hashedCodes - Array of hashed valid codes
 * @returns Verification result with remaining hashed codes
 */
export async function verifyHashedBackupCode(
  code: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; remainingCodes?: string[]; error?: string }> {
  try {
    // Normalize input
    const cleanCode = code.replace(/\s/g, '').toUpperCase();
    const normalizedCode = cleanCode.includes('-')
      ? cleanCode
      : `${cleanCode.slice(0, 4)}-${cleanCode.slice(4, 8)}`;

    // Hash the provided code
    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedCode);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const codeHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Find matching hash
    const codeIndex = hashedCodes.findIndex((h) => h === codeHash);

    if (codeIndex === -1) {
      return {
        valid: false,
        error: 'Invalid or already used backup code',
      };
    }

    // Remove used code
    const remainingCodes = hashedCodes.filter((_, i) => i !== codeIndex);

    return {
      valid: true,
      remainingCodes,
    };
  } catch (error) {
    console.error('Hashed backup code verification error:', error);
    return {
      valid: false,
      error: 'Verification failed',
    };
  }
}

/**
 * Generates the current TOTP code for a secret (useful for testing)
 *
 * @param secret - Base32 encoded secret
 * @returns Current 6-digit TOTP code
 */
export function getCurrentTOTPCode(secret: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: MFA_CONFIG.ISSUER,
    algorithm: MFA_CONFIG.ALGORITHM,
    digits: MFA_CONFIG.DIGITS,
    period: MFA_CONFIG.PERIOD,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  return totp.generate();
}

/**
 * Gets time remaining until current TOTP code expires
 *
 * @returns Seconds remaining (0-30)
 */
export function getTOTPTimeRemaining(): number {
  const now = Math.floor(Date.now() / 1000);
  return MFA_CONFIG.PERIOD - (now % MFA_CONFIG.PERIOD);
}
