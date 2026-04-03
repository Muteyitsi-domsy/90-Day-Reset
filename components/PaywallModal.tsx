import React, { useState, useEffect } from 'react';
import type { SubscriptionOffering } from '../types';
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
  userId?: string;
  onOpenTerms?: () => void;
  onOpenPrivacyPolicy?: () => void;
}

const arcFeatures = [
  {
    color: '#9b82c4',
    title: 'Your arc, your entry point',
    desc: 'Placed into Release, Re-affirm, or Reignition based on where you are — guided prompts shaped to your emotional season across 8 life areas.',
  },
  {
    color: '#b49b6e',
    title: 'Flip journal — the thought reframe',
    desc: 'When thoughts loop, your higher-self perspective waits. Answer the same situation from a wiser vantage point and watch the weight shift.',
  },
  {
    color: '#7ab8a4',
    title: 'Weekly & monthly reflections',
    desc: 'Poetic summaries woven from your own words — a mirror that shows how far you\'ve moved, in language that feels like yours.',
  },
  {
    color: '#b49b6e',
    title: 'The 90-day keepsake',
    desc: 'At journey\'s end, your arc is woven into a single artefact — your growth, your language, your proof of becoming.',
  },
  {
    color: '#9b82c4',
    title: '30, 60 & 90 day check-ins',
    desc: 'Pause points to reflect on your intention — whether it has deepened, shifted, or been fulfilled.',
  },
];

const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, onSubscribed, userId, onOpenTerms, onOpenPrivacyPolicy }) => {
  const [offerings, setOfferings] = useState<SubscriptionOffering | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'journey90'>('yearly');
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBetaInput, setShowBetaInput] = useState(false);
  const [betaCode, setBetaCode] = useState('');
  const [betaError, setBetaError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPlan('yearly');
      setError(null);
      setBetaCode('');
      setBetaError(null);
      setShowBetaInput(false);
      loadOfferings();
    }
  }, [isOpen]);

  const loadOfferings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loaded = await getOfferings();
      if (!loaded) {
        setError('Could not load subscription options. Please check your connection and try again.');
      } else {
        setOfferings(loaded);
      }
    } catch {
      setError('Failed to load subscription options. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!offerings) return;
    const product =
      selectedPlan === 'monthly' ? offerings.monthly :
      selectedPlan === 'journey90' ? offerings.journey90 :
      offerings.yearly;
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
    } catch {
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
        setError('No active subscription found.');
      }
    } catch {
      setError('Failed to restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleApplyBetaCode = async () => {
    setBetaError(null);
    setIsPurchasing(true);
    try {
      const result = await applyBetaCode(betaCode, userId);
      if (result.success) {
        onSubscribed();
        onClose();
      } else {
        setBetaError(result.error || 'Invalid code');
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const savingsPercent = (): number => {
    if (!offerings?.monthly || !offerings?.yearly) return 0;
    return Math.round(
      ((offerings.monthly.priceAmount * 12 - offerings.yearly.priceAmount) /
        (offerings.monthly.priceAmount * 12)) * 100
    );
  };

  const ctaLabel = (): string => {
    if (isPurchasing) return 'Processing...';
    if (selectedPlan === 'yearly') return 'Begin my journey';
    if (selectedPlan === 'journey90') return 'Start my 90-day journey';
    return 'Start monthly';
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[var(--card-bg)] w-full sm:max-w-lg sm:rounded-2xl sm:border sm:border-[var(--card-border)] rounded-t-2xl max-h-[92vh] overflow-y-auto">

        {/* Sticky close */}
        <div className="sticky top-0 bg-[var(--card-bg)] flex justify-between items-center px-5 pt-4 pb-2 z-10 border-b border-[var(--card-border)]/40">
          <p className="text-xs tracking-widest uppercase text-[var(--accent-primary)] font-medium">
            your 90-day transformation
          </p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 pt-5 pb-8">

          {/* Headline */}
          <div className="text-center mb-6">
            <h2
              className="text-3xl font-light italic text-[var(--text-primary)] leading-snug mb-2"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              The version of you<br />that's becoming
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              A structured journey inward — with a mirror<br />that remembers everything you've written.
            </p>
          </div>

          {/* Feature list */}
          <div className="border border-[var(--card-border)] rounded-2xl p-4 mb-4">
            <p className="text-xs tracking-widest uppercase text-[var(--text-secondary)] mb-1">
              What unlocks with your journey
            </p>
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              Free: Mood Journal &nbsp;·&nbsp; Pro: everything below
            </p>
            <div className="space-y-3.5">
              {arcFeatures.map((f, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-[7px] flex-shrink-0"
                    style={{ backgroundColor: f.color }}
                  />
                  <div>
                    <span
                      className="block text-sm font-medium italic text-[var(--text-primary)] mb-0.5"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {f.title}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {f.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Journey timeline strip */}
          <div className="bg-gray-900 dark:bg-black/70 rounded-2xl px-4 py-4 mb-5">
            <p className="text-xs tracking-widest uppercase text-amber-500/70 mb-3">
              Your journey structure
            </p>
            <div className="relative pl-5">
              {/* Vertical connecting line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-amber-900/60" />
              {[
                { day: 'Day 1',  label: 'Arc placed. Ideal self scripted.' },
                { day: 'Day 30', label: 'First reflection — how far you\'ve come.' },
                { day: 'Day 60', label: 'Second reflection — patterns emerge.' },
                { day: 'Day 90', label: 'Final reflection. Monthly report. Revel in how far you\'ve come.' },
                { day: 'Day 91', label: 'Keepsake unlocked. Proof of becoming.' },
              ].map((step) => (
                <div key={step.day} className="relative flex items-baseline gap-3 mb-3 last:mb-0">
                  {/* Dot */}
                  <div className="absolute -left-5 top-[5px] w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <span
                    className="text-sm italic text-amber-400 flex-shrink-0 w-14"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {step.day}
                  </span>
                  <span className="text-xs text-gray-500 leading-snug">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--card-border)] mb-4" />

          {/* Plans label */}
          <p className="text-xs tracking-widest uppercase text-[var(--text-secondary)] text-center mb-3">
            Choose your path
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2.5 mb-5">

              {/* Monthly */}
              {offerings?.monthly && (
                <button
                  onClick={() => setSelectedPlan('monthly')}
                  className={`w-full p-3.5 rounded-xl border transition-all flex items-center gap-3 text-left ${
                    selectedPlan === 'monthly'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                      : 'border-[var(--card-border)] hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    selectedPlan === 'monthly' ? 'border-[var(--accent-primary)]' : 'border-gray-400'
                  }`}>
                    {selectedPlan === 'monthly' && (
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="block text-sm font-medium text-[var(--text-primary)]">Monthly</span>
                    <span className="text-xs text-[var(--text-secondary)]">Begin when you're ready</span>
                  </div>
                  <div className="text-right">
                    <span
                      className="block text-lg font-light text-[var(--text-primary)]"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {offerings.monthly.price}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">per month</span>
                  </div>
                </button>
              )}

              {/* 90-Day Journey (featured) */}
              {offerings?.journey90 && (
                <div className="relative">
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-amber-500 text-white text-xs font-medium px-3 py-0.5 rounded-b-lg tracking-wide">
                      most transformational
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPlan('journey90')}
                    className={`w-full pt-5 pb-3.5 px-3.5 rounded-xl border transition-all flex items-center gap-3 text-left ${
                      selectedPlan === 'journey90'
                        ? 'border-amber-400 bg-amber-50/30 dark:bg-amber-900/20'
                        : 'border-amber-400/40 bg-amber-50/20 dark:bg-amber-900/10 hover:border-amber-400/70'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      selectedPlan === 'journey90' ? 'border-amber-500' : 'border-gray-400'
                    }`}>
                      {selectedPlan === 'journey90' && (
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-[var(--text-primary)]">90-Day Journey</span>
                      <span className="text-xs text-[var(--text-secondary)]">One arc, complete — one payment</span>
                    </div>
                    <div className="text-right">
                      <span
                        className="block text-lg font-light text-[var(--text-primary)]"
                        style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                      >
                        {offerings.journey90.price}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">one time</span>
                    </div>
                  </button>
                </div>
              )}

              {/* Annual */}
              {offerings?.yearly && (
                <div className="relative">
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-[var(--accent-primary)] text-white text-xs font-medium px-3 py-0.5 rounded-b-lg tracking-wide">
                      deepest commitment
                    </span>
                  </div>
                <button
                  onClick={() => setSelectedPlan('yearly')}
                  className={`w-full pt-5 pb-3.5 px-3.5 rounded-xl border transition-all flex items-center gap-3 text-left ${
                    selectedPlan === 'yearly'
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
                      : 'border-[var(--card-border)] hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    selectedPlan === 'yearly' ? 'border-[var(--accent-primary)]' : 'border-gray-400'
                  }`}>
                    {selectedPlan === 'yearly' && (
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="block text-sm font-medium text-[var(--text-primary)]">Annual</span>
                      {savingsPercent() > 0 && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                          Save {savingsPercent()}%
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">
                      Up to 4 journeys / year* —{' '}
                      {offerings.yearly && `$${(offerings.yearly.priceAmount / 12).toFixed(2)}/mo`}
                    </span>
                  </div>
                  <div className="text-right">
                    <span
                      className="block text-lg font-light text-[var(--text-primary)]"
                      style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                    >
                      {offerings.yearly.price}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">per year</span>
                  </div>
                </button>
                </div>
              )}
            </div>
          )}

          {/* Annual asterisk note */}
          {selectedPlan === 'yearly' && offerings && (
            <p className="text-xs text-[var(--text-secondary)] mb-3 px-1 leading-relaxed">
              * Annual plan provides 12 months of access. Number of complete 90-day journeys depends on usage — pauses and restarts affect how many journeys fit within the period. See Terms of Service for details.
            </p>
          )}

          {/* 90-Day Journey keepsake grace note */}
          {selectedPlan === 'journey90' && offerings && (
            <p className="text-xs text-[var(--text-secondary)] mb-3 px-1 leading-relaxed">
              Your keepsake remains accessible for 7 days after your journey completes — giving you time to save and download it before access closes.
            </p>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm text-center space-y-1.5">
              <p>{error}</p>
              {!offerings && (
                <button onClick={loadOfferings} className="text-xs underline">
                  Tap to retry
                </button>
              )}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handlePurchase}
            disabled={isPurchasing || !offerings}
            className="w-full py-4 rounded-xl font-medium text-white text-sm tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--accent-primary)] to-purple-700 hover:opacity-90"
          >
            {isPurchasing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : ctaLabel()}
          </button>

          <p className="text-center text-xs text-[var(--text-secondary)] mt-2 mb-4">
{selectedPlan === 'journey90'
              ? 'One-time payment. No subscription. No auto-renewal.'
              : 'Subscription auto-renews unless cancelled at least 24 hours before the end of the current period. Manage in App Store Settings.'}
          </p>

          {/* Restore & beta */}
          <div className="flex flex-col items-center gap-2 mb-4">
            <button
              onClick={handleRestore}
              disabled={isRestoring}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
            >
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </button>
            <button
              onClick={() => setShowBetaInput(!showBetaInput)}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors"
            >
              Have a beta code?
            </button>
          </div>

          {showBetaInput && (
            <div className="mb-4 p-4 rounded-xl bg-gray-100 dark:bg-gray-800/50">
              <label className="block text-xs font-medium text-[var(--text-primary)] mb-2">
                Enter Beta Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={betaCode}
                  onChange={(e) => setBetaCode(e.target.value.toUpperCase())}
                  placeholder="Enter your code"
                  className="flex-1 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)]"
                  maxLength={20}
                />
                <button
                  onClick={handleApplyBetaCode}
                  disabled={!betaCode.trim() || isPurchasing}
                  className="px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
              {betaError && <p className="mt-2 text-xs text-red-500">{betaError}</p>}
            </div>
          )}

          {/* Web notice */}
          {!isNativePlatform() && (
            <p className="text-center text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
              Subscriptions are managed in the mobile app.<br />
              Use a beta code for web access.
            </p>
          )}

          {/* Closing quote */}
          <p
            className="text-center text-sm italic text-[var(--text-secondary)] px-4 leading-relaxed"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            "The version I am becoming<br />deserves a witness."
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 border-t border-[var(--card-border)] pt-3 text-center">
          <p className="text-xs text-gray-500">
            By subscribing, you agree to our{' '}
            <button onClick={onOpenTerms} className="text-[var(--accent-primary)] hover:underline">Terms of Service</button>
            {' '}and{' '}
            <button onClick={onOpenPrivacyPolicy} className="text-[var(--accent-primary)] hover:underline">Privacy Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
