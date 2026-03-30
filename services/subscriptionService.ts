/**
 * Subscription Service - RevenueCat Integration
 *
 * Handles all subscription-related functionality including:
 * - Initializing RevenueCat
 * - Checking subscription status
 * - Purchasing subscriptions
 * - Restoring purchases
 * - Handling beta/promo codes
 */

import { Capacitor } from '@capacitor/core';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../src/config/firebase';
import type {
  SubscriptionState,
  SubscriptionStatus,
  SubscriptionTier,
  SubscriptionProduct,
  SubscriptionOffering
} from '../types';

const VALIDATE_BETA_CODE_URL =
  'https://us-central1-identity-reset-journal.cloudfunctions.net/validateBetaCodeHttp';

// RevenueCat types (will be available when running on device)
let Purchases: typeof import('@revenuecat/purchases-capacitor').Purchases | null = null;

// Product identifiers - must match what you set up in RevenueCat/App Store/Play Console
export const PRODUCT_IDS = {
  MONTHLY: 'pro_monthly',
  YEARLY: 'pro_annual',
  JOURNEY_90_IOS: 'pro_journey_90_nr',              // iOS non-renewing subscription
  JOURNEY_90_ANDROID: 'pro_journey_90:journey90-prepaid', // Android prepaid (no auto-renewal)
} as const;

// Helper — matches either platform's journey90 product identifier
export const isJourney90Product = (id: string): boolean =>
  id === PRODUCT_IDS.JOURNEY_90_IOS || id === PRODUCT_IDS.JOURNEY_90_ANDROID;

// RevenueCat API keys (set these in your environment)
const REVENUECAT_API_KEY_ANDROID = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';
const REVENUECAT_API_KEY_IOS = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';

// Beta codes storage keys
const BETA_CODE_STORAGE_KEY = 'renew90_beta_code';
const BETA_EXPIRY_STORAGE_KEY = 'renew90_beta_expiry';

/**
 * Check if running on a native platform (not web)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Initialize RevenueCat SDK
 * Should be called early in app startup
 */
export const initializeRevenueCat = async (userId?: string): Promise<boolean> => {
  if (!isNativePlatform()) {
    console.log('RevenueCat: Running on web, skipping initialization');
    return false;
  }

  try {
    // Dynamically import RevenueCat (only works on native)
    const purchasesModule = await import('@revenuecat/purchases-capacitor');
    Purchases = purchasesModule.Purchases;

    const apiKey = Capacitor.getPlatform() === 'android'
      ? REVENUECAT_API_KEY_ANDROID
      : REVENUECAT_API_KEY_IOS;

    if (!apiKey) {
      console.error('RevenueCat: API key not configured');
      return false;
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId || null, // null = anonymous user
    });

    console.log('RevenueCat: Initialized successfully');
    return true;
  } catch (error) {
    console.error('RevenueCat: Failed to initialize', error);
    return false;
  }
};

/**
 * Set the user ID for RevenueCat (call after login)
 */
export const setRevenueCatUserId = async (userId: string): Promise<void> => {
  if (!isNativePlatform() || !Purchases) return;

  try {
    await Purchases.logIn({ appUserID: userId });
    console.log('RevenueCat: User ID set', userId);
  } catch (error) {
    console.error('RevenueCat: Failed to set user ID', error);
  }
};

/**
 * Log out the current user from RevenueCat
 */
export const logOutRevenueCat = async (): Promise<void> => {
  if (!isNativePlatform() || !Purchases) return;

  try {
    await Purchases.logOut();
    console.log('RevenueCat: User logged out');
  } catch (error) {
    console.error('RevenueCat: Failed to log out', error);
  }
};

/**
 * Get current subscription state
 */
export const getSubscriptionState = async (): Promise<SubscriptionState> => {
  // Default state for web or when not subscribed
  const defaultState: SubscriptionState = {
    status: 'none',
    tier: 'free',
    isActive: false,
    expirationDate: null,
    trialEndDate: null,
    isBetaUser: false,
    betaCodeUsed: null,
    willRenew: false,
    productId: null,
    gracePeriodEndDate: null,
  };

  // Check for beta access first
  const betaState = checkBetaAccess();
  if (betaState.isActive) {
    return betaState;
  }

  // For web, return default state (or check server-side)
  if (!isNativePlatform() || !Purchases) {
    return defaultState;
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();

    // Check for active entitlements (RevenueCat keeps these alive during grace period)
    const activeEntitlements = customerInfo.customerInfo.entitlements.active;
    const premiumEntitlement = activeEntitlements['premium'] || activeEntitlements['pro'];

    if (premiumEntitlement) {
      const pid = premiumEntitlement.productIdentifier;
      const tier =
        pid === PRODUCT_IDS.MONTHLY ? 'monthly' :
        isJourney90Product(pid) ? 'journey90' :
        'yearly';

      // Check if payment has failed and we're in the platform grace period.
      // billingIssueDetectedAt is set by RevenueCat when Apple/Google signals a
      // billing failure. The entitlement stays active while they retry, giving
      // 3 days (iOS) or 7 days (Android) before access is removed.
      const billingIssueAt = (premiumEntitlement as any).billingIssueDetectedAt as string | null | undefined;
      if (billingIssueAt && tier !== 'journey90') {
        const graceDays = Capacitor.getPlatform() === 'ios' ? 3 : 7;
        const endDate = new Date(billingIssueAt);
        endDate.setDate(endDate.getDate() + graceDays);
        return {
          status: 'grace_period',
          tier,
          isActive: true,
          expirationDate: premiumEntitlement.expirationDate || null,
          trialEndDate: null,
          isBetaUser: false,
          betaCodeUsed: null,
          willRenew: false,
          productId: pid,
          gracePeriodEndDate: endDate.toISOString(),
        };
      }

      return {
        status: premiumEntitlement.willRenew ? 'active' : 'cancelled',
        tier,
        isActive: true,
        expirationDate: premiumEntitlement.expirationDate || null,
        trialEndDate: null,
        isBetaUser: false,
        betaCodeUsed: null,
        willRenew: premiumEntitlement.willRenew,
        productId: pid,
        gracePeriodEndDate: null,
      };
    }

    // No active entitlement — check if they previously had a subscription that lapsed
    // (entitlements.all includes expired ones with their product identifiers).
    // This lets us return the correct tier on expiry so the caller can decide
    // whether to auto-pause the journey.
    const allEntitlements = customerInfo.customerInfo.entitlements.all;
    const lapsedEntitlement = allEntitlements['premium'] || allEntitlements['pro'];
    if (lapsedEntitlement && !(lapsedEntitlement as any).isActive) {
      const pid = (lapsedEntitlement as any).productIdentifier as string;
      const tier =
        pid === PRODUCT_IDS.MONTHLY ? 'monthly' :
        isJourney90Product(pid) ? 'journey90' :
        'yearly';
      return {
        status: 'expired',
        tier,
        isActive: false,
        expirationDate: (lapsedEntitlement as any).expirationDate || null,
        trialEndDate: null,
        isBetaUser: false,
        betaCodeUsed: null,
        willRenew: false,
        productId: pid,
        gracePeriodEndDate: null,
      };
    }

    return defaultState;
  } catch (error) {
    console.error('RevenueCat: Failed to get subscription state', error);
    return defaultState;
  }
};

/**
 * Get available subscription products/offerings
 */
export const getOfferings = async (): Promise<SubscriptionOffering | null> => {
  if (!isNativePlatform() || !Purchases) {
    // Return mock offerings for web development
    return getMockOfferings();
  }

  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;

    if (!currentOffering) {
      console.log('RevenueCat: No current offering available');
      return null;
    }

    const monthly = currentOffering.monthly;
    const yearly = currentOffering.annual;

    // journey90 is a custom package — find it by product identifier in availablePackages
    // iOS: 'pro_journey_90_nr' (non-renewing); Android: 'pro_journey_90:journey90-prepaid'
    const journey90Pkg = (currentOffering.availablePackages || []).find(
      pkg => isJourney90Product(pkg.product.identifier)
    );

    return {
      identifier: currentOffering.identifier,
      serverDescription: currentOffering.serverDescription || '',
      monthly: monthly ? {
        id: monthly.product.identifier,
        title: monthly.product.title,
        description: monthly.product.description,
        price: monthly.product.priceString,
        priceAmount: monthly.product.price,
        currency: monthly.product.currencyCode,
        period: 'monthly',
        trialDays: 0,
      } : null,
      yearly: yearly ? {
        id: yearly.product.identifier,
        title: yearly.product.title,
        description: yearly.product.description,
        price: yearly.product.priceString,
        priceAmount: yearly.product.price,
        currency: yearly.product.currencyCode,
        period: 'yearly',
        trialDays: 0,
      } : null,
      journey90: journey90Pkg ? {
        id: journey90Pkg.product.identifier,
        title: journey90Pkg.product.title,
        description: journey90Pkg.product.description,
        price: journey90Pkg.product.priceString,
        priceAmount: journey90Pkg.product.price,
        currency: journey90Pkg.product.currencyCode,
        period: 'once',
        trialDays: 0,
      } : null,
    };
  } catch (error) {
    console.error('RevenueCat: Failed to get offerings', error);
    return null;
  }
};

/**
 * Purchase a subscription
 */
export const purchaseSubscription = async (
  productId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isNativePlatform() || !Purchases) {
    return { success: false, error: 'Purchases not available on web' };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const currentOffering = offerings.current;

    if (!currentOffering) {
      return { success: false, error: 'No offerings available' };
    }

    // Find the package with this product
    const allPackages = [
      currentOffering.monthly,
      currentOffering.annual,
      ...(currentOffering.availablePackages || []),
    ].filter(Boolean);

    const packageToPurchase = allPackages.find(
      pkg => pkg?.product.identifier === productId
    );

    if (!packageToPurchase) {
      return { success: false, error: 'Product not found' };
    }

    const purchaseResult = await Purchases.purchasePackage({
      aPackage: packageToPurchase,
    });

    // Check if purchase was successful
    const entitlements = purchaseResult.customerInfo.entitlements.active;
    if (Object.keys(entitlements).length > 0) {
      return { success: true };
    }

    return { success: false, error: 'Purchase did not grant entitlement' };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check for user cancellation
    if (errorMessage.includes('cancelled') || errorMessage.includes('canceled')) {
      return { success: false, error: 'Purchase cancelled' };
    }

    console.error('RevenueCat: Purchase failed', error);
    return { success: false, error: errorMessage };
  }
};

/**
 * Restore previous purchases
 */
export const restorePurchases = async (): Promise<{
  success: boolean;
  hasActiveSubscription: boolean;
  error?: string
}> => {
  if (!isNativePlatform() || !Purchases) {
    return { success: false, hasActiveSubscription: false, error: 'Not available on web' };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasActive = Object.keys(customerInfo.customerInfo.entitlements.active).length > 0;

    return {
      success: true,
      hasActiveSubscription: hasActive,
    };
  } catch (error) {
    console.error('RevenueCat: Failed to restore purchases', error);
    return {
      success: false,
      hasActiveSubscription: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Validate and apply a beta code.
 * Validation is performed server-side via a Cloud Function — no codes exist in this bundle.
 * If userId is provided, beta access is also saved to Firestore so it persists across devices.
 */
export const applyBetaCode = async (code: string, userId?: string): Promise<{
  success: boolean;
  error?: string;
  expiryDate?: string;
}> => {
  // Check if already used a beta code on this device
  const existingCode = localStorage.getItem(BETA_CODE_STORAGE_KEY);
  if (existingCode) {
    return { success: false, error: 'A beta code has already been applied to this device' };
  }

  try {
    const response = await fetch(VALIDATE_BETA_CODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() }),
    });
    const result = await response.json();
    if (!result.success) {
      return { success: false, error: result.error || 'Invalid code' };
    }
    const { durationDays } = result;

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);
    const expiryString = expiryDate.toISOString();
    const normalizedCode = code.trim().toUpperCase();

    localStorage.setItem(BETA_CODE_STORAGE_KEY, normalizedCode);
    localStorage.setItem(BETA_EXPIRY_STORAGE_KEY, expiryString);

    // Persist to Firestore so beta access survives reinstalls and device changes
    if (userId) {
      try {
        await setDoc(
          doc(db, 'users', userId),
          { betaAccess: { code: normalizedCode, expiry: expiryString, appliedAt: new Date().toISOString() } },
          { merge: true }
        );
      } catch (firestoreErr) {
        console.error('Beta: failed to save to Firestore (local access still granted)', firestoreErr);
      }
    }

    return { success: true, expiryDate: expiryString };
  } catch (err: any) {
    const message = err?.message || 'Invalid code';
    return { success: false, error: message };
  }
};

/**
 * Sync beta access from Firestore to localStorage.
 * Call this after login so beta status is restored on new devices / reinstalls.
 */
export const syncBetaFromFirestore = async (userId: string): Promise<void> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (!snap.exists()) return;

    const betaAccess = snap.data()?.betaAccess;
    if (!betaAccess?.code || !betaAccess?.expiry) return;

    // Only restore if still valid
    const isStillValid = new Date(betaAccess.expiry) > new Date();
    if (!isStillValid) return;

    // Restore to localStorage if not already there
    const localCode = localStorage.getItem(BETA_CODE_STORAGE_KEY);
    if (!localCode) {
      localStorage.setItem(BETA_CODE_STORAGE_KEY, betaAccess.code);
      localStorage.setItem(BETA_EXPIRY_STORAGE_KEY, betaAccess.expiry);
      console.log('Beta: restored from Firestore');
    }
  } catch (err) {
    console.error('Beta: failed to sync from Firestore', err);
  }
};

/**
 * Check if user has active beta access
 */
export const checkBetaAccess = (): SubscriptionState => {
  const betaCode = localStorage.getItem(BETA_CODE_STORAGE_KEY);
  const betaExpiry = localStorage.getItem(BETA_EXPIRY_STORAGE_KEY);

  if (!betaCode || !betaExpiry) {
    return {
      status: 'none',
      tier: 'free',
      isActive: false,
      expirationDate: null,
      trialEndDate: null,
      isBetaUser: false,
      betaCodeUsed: null,
      willRenew: false,
      productId: null,
      gracePeriodEndDate: null,
    };
  }

  const expiryDate = new Date(betaExpiry);
  const isActive = expiryDate > new Date();

  return {
    status: isActive ? 'active' : 'expired',
    tier: 'beta',
    isActive,
    expirationDate: betaExpiry,
    trialEndDate: null,
    isBetaUser: true,
    betaCodeUsed: betaCode,
    willRenew: false,
    productId: null,
    gracePeriodEndDate: null,
  };
};

/**
 * Get days remaining on beta access
 */
export const getBetaDaysRemaining = (): number | null => {
  const betaExpiry = localStorage.getItem(BETA_EXPIRY_STORAGE_KEY);
  if (!betaExpiry) return null;

  const expiryDate = new Date(betaExpiry);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
};

/**
 * Mock offerings for web development
 */
const getMockOfferings = (): SubscriptionOffering => {
  return {
    identifier: 'default',
    serverDescription: 'Default Offering',
    monthly: {
      id: PRODUCT_IDS.MONTHLY,
      title: 'Renew90 Monthly',
      description: 'Full access to all features',
      price: '$24.99',
      priceAmount: 24.99,
      currency: 'USD',
      period: 'monthly',
      trialDays: 0,
    },
    yearly: {
      id: PRODUCT_IDS.YEARLY,
      title: 'Renew90 Yearly',
      description: 'Full access - Best Value!',
      price: '$159.00',
      priceAmount: 159.00,
      currency: 'USD',
      period: 'yearly',
      trialDays: 0,
    },
    journey90: {
      id: PRODUCT_IDS.JOURNEY_90,
      title: '90-Day Journey',
      description: 'One full arc, one payment — 90 days of full access',
      price: '$69.99',
      priceAmount: 69.99,
      currency: 'USD',
      period: 'once',
      trialDays: 0,
    },
  };
};

/**
 * Check if user should see paywall
 * Returns true if user needs to subscribe
 */
export const shouldShowPaywall = async (): Promise<boolean> => {
  const state = await getSubscriptionState();
  return !state.isActive;
};

/**
 * Subscription service singleton for easy access
 */
export const subscriptionService = {
  initialize: initializeRevenueCat,
  setUserId: setRevenueCatUserId,
  logOut: logOutRevenueCat,
  getState: getSubscriptionState,
  getOfferings,
  purchase: purchaseSubscription,
  restore: restorePurchases,
  applyBetaCode,
  checkBetaAccess,
  syncBetaFromFirestore,
  getBetaDaysRemaining,
  shouldShowPaywall,
  isNative: isNativePlatform,
};

export default subscriptionService;
