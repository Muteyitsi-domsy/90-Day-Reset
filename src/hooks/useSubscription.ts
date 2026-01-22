/**
 * useSubscription Hook
 *
 * Provides subscription state and actions throughout the app.
 * Handles initialization, state management, and paywall display.
 */

import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionState } from '../../types';
import {
  subscriptionService,
  initializeRevenueCat,
  getSubscriptionState,
  setRevenueCatUserId,
  logOutRevenueCat,
} from '../../services/subscriptionService';

interface UseSubscriptionReturn {
  // State
  subscriptionState: SubscriptionState;
  isLoading: boolean;
  isInitialized: boolean;

  // Computed
  isSubscribed: boolean;
  isTrial: boolean;
  isBeta: boolean;
  daysRemaining: number | null;

  // Actions
  refreshSubscription: () => Promise<void>;
  setUserId: (userId: string) => Promise<void>;
  logOut: () => Promise<void>;
}

const DEFAULT_STATE: SubscriptionState = {
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

export function useSubscription(userId?: string): UseSubscriptionReturn {
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>(DEFAULT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize RevenueCat on mount
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      try {
        await initializeRevenueCat(userId);
        setIsInitialized(true);

        // Get initial subscription state
        const state = await getSubscriptionState();
        setSubscriptionState(state);
      } catch (error) {
        console.error('Failed to initialize subscription:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Update user ID when it changes
  useEffect(() => {
    if (isInitialized && userId) {
      setRevenueCatUserId(userId);
    }
  }, [userId, isInitialized]);

  // Refresh subscription state
  const refreshSubscription = useCallback(async () => {
    setIsLoading(true);
    try {
      const state = await getSubscriptionState();
      setSubscriptionState(state);
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set user ID
  const setUserId = useCallback(async (newUserId: string) => {
    await setRevenueCatUserId(newUserId);
    await refreshSubscription();
  }, [refreshSubscription]);

  // Log out
  const logOut = useCallback(async () => {
    await logOutRevenueCat();
    setSubscriptionState(DEFAULT_STATE);
  }, []);

  // Calculate days remaining
  const daysRemaining = (() => {
    if (subscriptionState.isBetaUser) {
      return subscriptionService.getBetaDaysRemaining();
    }
    if (subscriptionState.expirationDate) {
      const expiry = new Date(subscriptionState.expirationDate);
      const now = new Date();
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    }
    return null;
  })();

  return {
    subscriptionState,
    isLoading,
    isInitialized,

    // Computed
    isSubscribed: subscriptionState.isActive,
    isTrial: subscriptionState.status === 'trial',
    isBeta: subscriptionState.isBetaUser,
    daysRemaining,

    // Actions
    refreshSubscription,
    setUserId,
    logOut,
  };
}

export default useSubscription;
