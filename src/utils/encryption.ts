/**
 * Encryption utilities for localStorage data protection
 * Uses AES-256 encryption via crypto-js
 */

import CryptoJS from 'crypto-js';

/**
 * Encryption key management
 * The key is derived from the user's session or a device-specific identifier
 */
class EncryptionKeyManager {
  private static readonly STORAGE_KEY = 'enc_key_salt';
  private static readonly KEY_SIZE = 256; // bits

  /**
   * Gets or creates an encryption key for the current session
   * The key is derived from a combination of:
   * 1. User's unique ID (if authenticated)
   * 2. A random salt (stored in localStorage)
   */
  static getEncryptionKey(userId?: string): string {
    const salt = this.getOrCreateSalt();

    // Create a passphrase combining user ID and device salt
    // NOTE: userAgent was removed from key derivation because Android WebView
    // updates change it, breaking decryption of all stored data.
    const passphrase = [
      userId || 'anonymous',
      salt,
    ].join('|');

    return this.deriveKey(passphrase, salt);
  }

  /**
   * Gets or creates the encryption salt
   */
  static getOrCreateSalt(): string {
    let salt = localStorage.getItem(this.STORAGE_KEY);
    if (!salt) {
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      salt = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      localStorage.setItem(this.STORAGE_KEY, salt);
    }
    return salt;
  }

  /**
   * Derives a key from a passphrase and salt using PBKDF2
   */
  static deriveKey(passphrase: string, salt: string): string {
    const key = CryptoJS.PBKDF2(passphrase, salt, {
      keySize: this.KEY_SIZE / 32,
      iterations: 1000,
    });
    return key.toString();
  }

  /**
   * Gets legacy encryption key variants for fallback decryption.
   * Used to recover data encrypted with the old key format that included userAgent.
   */
  static getLegacyKeys(userId?: string): string[] {
    const salt = this.getOrCreateSalt();
    const keys: string[] = [];

    // Legacy key format: userId|salt|userAgent
    const legacyPassphrase = [
      userId || 'anonymous',
      salt,
      navigator.userAgent,
    ].join('|');
    keys.push(this.deriveKey(legacyPassphrase, salt));

    // If userId is set, also try with 'anonymous' (in case auth state changed)
    if (userId) {
      const anonPassphrase = ['anonymous', salt].join('|');
      keys.push(this.deriveKey(anonPassphrase, salt));

      const anonLegacyPassphrase = ['anonymous', salt, navigator.userAgent].join('|');
      keys.push(this.deriveKey(anonLegacyPassphrase, salt));
    }

    return keys;
  }

  /**
   * Clears the encryption key (on logout)
   */
  static clearKey(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

/**
 * Encrypts data using AES-256
 * @param data - Data to encrypt (will be stringified if object)
 * @param userId - Optional user ID for key derivation
 * @returns Encrypted string
 */
export function encryptData(data: any, userId?: string): string {
  try {
    // Convert to string if needed
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    // Get encryption key
    const key = EncryptionKeyManager.getEncryptionKey(userId);

    // Encrypt using AES
    const encrypted = CryptoJS.AES.encrypt(dataString, key);

    return encrypted.toString();
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data encrypted with encryptData
 * @param encryptedData - Encrypted string
 * @param userId - Optional user ID for key derivation
 * @returns Decrypted data (as string)
 */
export function decryptData(encryptedData: string, userId?: string): string {
  try {
    // Get encryption key
    const key = EncryptionKeyManager.getEncryptionKey(userId);

    // Decrypt using AES
    const decrypted = CryptoJS.AES.decrypt(encryptedData, key);

    // Convert bytes to string
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }

    return decryptedString;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypts and returns a JSON object
 * @param data - Object to encrypt
 * @param userId - Optional user ID
 * @returns Encrypted string
 */
export function encryptJSON<T>(data: T, userId?: string): string {
  const jsonString = JSON.stringify(data);
  return encryptData(jsonString, userId);
}

/**
 * Decrypts and parses a JSON object
 * @param encryptedData - Encrypted JSON string
 * @param userId - Optional user ID
 * @returns Parsed object
 */
export function decryptJSON<T>(encryptedData: string, userId?: string): T {
  const decryptedString = decryptData(encryptedData, userId);
  return JSON.parse(decryptedString) as T;
}

/**
 * Checks if data appears to be encrypted
 * AES-encrypted data in CryptoJS format starts with 'U2Fsd' (base64 for 'Salted__')
 * @param data - Data to check
 * @returns true if data appears encrypted
 */
export function isEncrypted(data: string): boolean {
  if (!data || typeof data !== 'string') {
    return false;
  }

  // CryptoJS encrypted data starts with 'U2Fsd' which is base64 for 'Salted__'
  return data.startsWith('U2Fsd');
}

/**
 * Safely migrates unencrypted data to encrypted format
 * @param data - Potentially unencrypted data
 * @param userId - User ID for encryption
 * @returns Encrypted data
 */
export function migrateToEncrypted(data: string, userId?: string): string {
  // If already encrypted, return as-is
  if (isEncrypted(data)) {
    return data;
  }

  // Otherwise, encrypt it
  return encryptData(data, userId);
}

/**
 * Safely reads potentially encrypted or unencrypted data
 * Handles migration from unencrypted to encrypted automatically
 * @param data - Data that might be encrypted or plain
 * @param userId - User ID for decryption
 * @returns Decrypted/plain data as string
 */
export function safeRead(data: string | null, userId?: string): string | null {
  if (!data) {
    return null;
  }

  // Not encrypted - return as-is
  if (!isEncrypted(data)) {
    return data;
  }

  // Try decryption with current key first
  try {
    return decryptData(data, userId);
  } catch {
    // Current key failed - try legacy keys
  }

  // Try fallback keys (legacy format with userAgent, anonymous variants)
  const legacyKeys = EncryptionKeyManager.getLegacyKeys(userId);
  for (const legacyKey of legacyKeys) {
    try {
      const decrypted = CryptoJS.AES.decrypt(data, legacyKey);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      if (decryptedString) {
        console.log('✅ Recovered data using legacy encryption key - will re-encrypt on next save');
        return decryptedString;
      }
    } catch {
      // This key didn't work, try next
    }
  }

  console.error('Failed to decrypt data with all key variants');
  throw new Error('Data is encrypted but decryption failed - wrong key or corrupted data');
}

/**
 * Clears encryption keys (call on logout)
 */
export function clearEncryptionKeys(): void {
  EncryptionKeyManager.clearKey();
}

/**
 * Test encryption/decryption roundtrip
 * Useful for debugging
 */
export function testEncryption(): boolean {
  try {
    const testData = { message: 'Hello, secure world!', timestamp: Date.now() };
    const encrypted = encryptJSON(testData);
    const decrypted = decryptJSON(encrypted);

    return (
      decrypted.message === testData.message &&
      decrypted.timestamp === testData.timestamp
    );
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}
