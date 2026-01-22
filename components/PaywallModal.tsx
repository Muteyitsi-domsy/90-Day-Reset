import React, { useState, useEffect } from 'react';
import type { SubscriptionOffering, SubscriptionProduct } from '../types';
import {
  getOfferings,
  purchaseSubscription,
  restorePurchases,
  applyBetaCode,
  isNativePlatform,
} from '../services/subscriptionService';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribed: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onSubscribed,
}) => {
  const [offerings, setOfferings] = useState<SubscriptionOffering | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Beta code state
  const [showBetaInput, setShowBetaInput] = useState(false);
  const [betaCode, setBetaCode] = useState('');
  const [betaError, setBetaError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadOfferings();
    }
  }, [isOpen]);

  const loadOfferings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedOfferings = await getOfferings();
      setOfferings(loadedOfferings);
    } catch (err) {
      setError('Failed to load subscription options');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!offerings) return;

    const product = selectedPlan === 'monthly' ? offerings.monthly : offerings.yearly;
    if (!product) return;

    setIsPurchasing(true);
    setError(null);

    try {
      const result = await purchaseSubscription(product.id);
      if (result.success) {
        onSubscribed();
        onClose();
      } else if (result.error && result.error !== 'Purchase cancelled') {
        setError(result.error);
      }
    } catch (err) {
      setError('Purchase failed. Please try again.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    setError(null);

    try {
      const result = await restorePurchases();
      if (result.hasActiveSubscription) {
        onSubscribed();
        onClose();
      } else {
        setError('No active subscription found');
      }
    } catch (err) {
      setError('Failed to restore purchases');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleApplyBetaCode = () => {
    setBetaError(null);
    const result = applyBetaCode(betaCode);

    if (result.success) {
      onSubscribed();
      onClose();
    } else {
      setBetaError(result.error || 'Invalid code');
    }
  };

  const calculateSavings = (): string => {
    if (!offerings?.monthly || !offerings?.yearly) return '';
    const monthlyAnnual = offerings.monthly.priceAmount * 12;
    const savings = Math.round(((monthlyAnnual - offerings.yearly.priceAmount) / monthlyAnnual) * 100);
    return `Save ${savings}%`;
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--card-border)] max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="relative p-6 pb-4 text-center border-b border-[var(--card-border)]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <span className="text-3xl">✨</span>
          </div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            Unlock Your Journey
          </h2>
          <p className="text-[var(--text-secondary)] mt-2">
            Start your 90-day transformation with full access
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Features */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                  What's included:
                </h3>
                <ul className="space-y-2">
                  {[
                    'Daily guided journaling prompts',
                    'AI-powered insights & reflections',
                    'Mood tracking & analysis',
                    'Weekly & monthly reports',
                    'Thought flip exercises',
                    'Cloud backup & sync',
                    'Crisis support resources',
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Plan Selection */}
              {offerings && (
                <div className="space-y-3 mb-6">
                  {offerings.yearly && (
                    <PlanOption
                      product={offerings.yearly}
                      isSelected={selectedPlan === 'yearly'}
                      onSelect={() => setSelectedPlan('yearly')}
                      badge={calculateSavings()}
                      isRecommended
                    />
                  )}
                  {offerings.monthly && (
                    <PlanOption
                      product={offerings.monthly}
                      isSelected={selectedPlan === 'monthly'}
                      onSelect={() => setSelectedPlan('monthly')}
                    />
                  )}
                </div>
              )}

              {/* Trial Notice */}
              <p className="text-center text-sm text-[var(--text-secondary)] mb-4">
                Start with a <span className="font-medium text-[var(--accent-primary)]">14-day free trial</span>.
                Cancel anytime.
              </p>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={isPurchasing || !offerings}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-lg hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPurchasing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Start Free Trial'
                )}
              </button>

              {/* Restore & Beta Code */}
              <div className="mt-4 flex flex-col items-center gap-2">
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                >
                  {isRestoring ? 'Restoring...' : 'Restore Purchases'}
                </button>

                <button
                  onClick={() => setShowBetaInput(!showBetaInput)}
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
                >
                  Have a beta code?
                </button>
              </div>

              {/* Beta Code Input */}
              {showBetaInput && (
                <div className="mt-4 p-4 rounded-lg bg-gray-100 dark:bg-gray-800/50">
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Enter Beta Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={betaCode}
                      onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                      placeholder="BETA2026"
                      className="flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)]"
                      maxLength={20}
                    />
                    <button
                      onClick={handleApplyBetaCode}
                      disabled={!betaCode.trim()}
                      className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  {betaError && (
                    <p className="mt-2 text-sm text-red-500">{betaError}</p>
                  )}
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">
                    Beta codes provide 90 days of free access
                  </p>
                </div>
              )}

              {/* Web Notice */}
              {!isNativePlatform() && (
                <p className="mt-4 text-center text-xs text-[var(--text-secondary)]">
                  Subscriptions are available in the mobile app.
                  <br />
                  Use a beta code for web access.
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--card-border)] text-center">
          <p className="text-xs text-gray-500">
            By subscribing, you agree to our{' '}
            <button className="text-[var(--accent-primary)] hover:underline">Terms of Service</button>
            {' '}and{' '}
            <button className="text-[var(--accent-primary)] hover:underline">Privacy Policy</button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

// Plan Option Component
interface PlanOptionProps {
  product: SubscriptionProduct;
  isSelected: boolean;
  onSelect: () => void;
  badge?: string;
  isRecommended?: boolean;
}

const PlanOption: React.FC<PlanOptionProps> = ({
  product,
  isSelected,
  onSelect,
  badge,
  isRecommended,
}) => {
  const periodLabel = product.period === 'yearly' ? '/year' : '/month';
  const monthlyPrice = product.period === 'yearly'
    ? `${(product.priceAmount / 12).toFixed(2)}/mo`
    : null;

  return (
    <button
      onClick={onSelect}
      className={`w-full p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? 'border-[var(--accent-primary)] bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-[var(--card-border)] hover:border-gray-400 dark:hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Radio indicator */}
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              isSelected
                ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]'
                : 'border-gray-400'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[var(--text-primary)]">
                {product.period === 'yearly' ? 'Yearly' : 'Monthly'}
              </span>
              {isRecommended && (
                <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full">
                  Best Value
                </span>
              )}
              {badge && !isRecommended && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                  {badge}
                </span>
              )}
            </div>
            {monthlyPrice && (
              <span className="text-xs text-[var(--text-secondary)]">
                Just {monthlyPrice} billed annually
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-xl font-bold text-[var(--text-primary)]">
            {product.price}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">
            {periodLabel}
          </span>
        </div>
      </div>

      {product.trialDays > 0 && (
        <p className="mt-2 text-xs text-center text-[var(--text-secondary)]">
          Includes {product.trialDays}-day free trial
        </p>
      )}
    </button>
  );
};

export default PaywallModal;
