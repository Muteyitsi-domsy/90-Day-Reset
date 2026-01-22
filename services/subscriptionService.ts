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
import type {
  SubscriptionState,
  SubscriptionStatus,
  SubscriptionTier,
  SubscriptionProduct,
  SubscriptionOffering
} from '../types';

// RevenueCat types (will be available when running on device)
let Purchases: typeof import('@revenuecat/purchases-capacitor').Purchases | null = null;

// Product identifiers - must match what you set up in RevenueCat/Play Console
export const PRODUCT_IDS = {
  MONTHLY: 'renew90_monthly',
  YEARLY: 'renew90_yearly',
} as const;

// RevenueCat API keys (set these in your environment)
const REVENUECAT_API_KEY_ANDROID = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';
const REVENUECAT_API_KEY_IOS = import.meta.env.VITE_REVENUECAT_IOS_KEY || '';

// Beta codes storage key
const BETA_CODE_STORAGE_KEY = 'renew90_beta_code';
const BETA_EXPIRY_STORAGE_KEY = 'renew90_beta_expiry';

// Valid beta codes (in production, validate these server-side)
const VALID_BETA_CODES = new Set([
  'BETA2026',
  'RENEW90BETA',
  'EARLYBIRD',
  'FOUNDER90',
  // Add more codes as needed
]);

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

    // Check for active entitlements
    const entitlements = customerInfo.customerInfo.entitlements.active;
    const premiumEntitlement = entitlements['premium'] || entitlements['pro'];

    if (premiumEntitlement) {
      const isMonthly = premiumEntitlement.productIdentifier === PRODUCT_IDS.MONTHLY;

      return {
        status: premiumEntitlement.willRenew ? 'active' : 'cancelled',
        tier: isMonthly ? 'monthly' : 'yearly',
        isActive: true,
        expirationDate: premiumEntitlement.expirationDate || null,
        trialEndDate: null,
        isBetaUser: false,
        betaCodeUsed: null,
        willRenew: premiumEntitlement.willRenew,
        productId: premiumEntitlement.productIdentifier,
      };
    }

    // Check for trial
    // Note: Trial info varies by platform

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
        trialDays: 14, // Configure in RevenueCat
      } : null,
      yearly: yearly ? {
        id: yearly.product.identifier,
        title: yearly.product.title,
        description: yearly.product.description,
        price: yearly.product.priceString,
        priceAmount: yearly.product.price,
        currency: yearly.product.currencyCode,
        period: 'yearly',
        trialDays: 14,
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
 * Validate and apply a beta code
 */
export const applyBetaCode = (code: string): {
  success: boolean;
  error?: string;
  expiryDate?: string;
} => {
  const normalizedCode = code.trim().toUpperCase();

  if (!VALID_BETA_CODES.has(normalizedCode)) {
    return { success: false, error: 'Invalid beta code' };
  }

  // Check if already used a beta code
  const existingCode = localStorage.getItem(BETA_CODE_STORAGE_KEY);
  if (existingCode) {
    return { success: false, error: 'A beta code has already been applied to this device' };
  }

  // Calculate expiry date (90 days from now)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 90);
  const expiryString = expiryDate.toISOString();

  // Store the beta code and expiry
  localStorage.setItem(BETA_CODE_STORAGE_KEY, normalizedCode);
  localStorage.setItem(BETA_EXPIRY_STORAGE_KEY, expiryString);

  return {
    success: true,
    expiryDate: expiryString
  };
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
      price: '$6.99',
      priceAmount: 6.99,
      currency: 'USD',
      period: 'monthly',
      trialDays: 14,
    },
    yearly: {
      id: PRODUCT_IDS.YEARLY,
      title: 'Renew90 Yearly',
      description: 'Full access - Best Value!',
      price: '$49.99',
      priceAmount: 49.99,
      currency: 'USD',
      period: 'yearly',
      trialDays: 14,
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
  getBetaDaysRemaining,
  shouldShowPaywall,
  isNative: isNativePlatform,
};

export default subscriptionService;
