import { Capacitor } from '@capacitor/core';
import { getToken } from 'firebase/app-check';
import { appCheck } from '../config/firebase';

/** Header name used to pass App Check tokens to Cloud Functions. */
export const APP_CHECK_HEADER = 'X-Firebase-AppCheck';

/**
 * Returns an App Check token for the current platform, or null if unavailable.
 * Non-fatal — callers should attach the token when present but not block on failure;
 * server-side enforcement handles invalid or missing tokens.
 *
 * Native (Android/iOS): Play Integrity (Android) / App Attest (iOS) via Capacitor plugin.
 * Web: reCAPTCHA v3 via Firebase JS SDK.
 */
export async function getAppCheckToken(): Promise<string | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { FirebaseAppCheck } = await import('@capacitor-firebase/app-check');
      return (await FirebaseAppCheck.getToken()).token;
    }
    if (appCheck) {
      return (await getToken(appCheck, false)).token;
    }
    return null;
  } catch {
    return null;
  }
}
