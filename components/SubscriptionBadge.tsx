import React from 'react';
import type { SubscriptionState } from '../types';

interface SubscriptionBadgeProps {
  subscriptionState: SubscriptionState;
  daysRemaining: number | null;
  onClick?: () => void;
  showManageButton?: boolean;
}

const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({
  subscriptionState,
  daysRemaining,
  onClick,
  showManageButton = true,
}) => {
  const { status, tier, isActive, isBetaUser } = subscriptionState;

  // Determine badge style and content
  const getBadgeContent = () => {
    if (isBetaUser && isActive) {
      return {
        icon: '🎁',
        label: 'Beta Access',
        sublabel: daysRemaining !== null ? `${daysRemaining} days left` : null,
        bgClass: 'bg-purple-100 dark:bg-purple-900/30',
        textClass: 'text-purple-700 dark:text-purple-300',
        borderClass: 'border-purple-200 dark:border-purple-800',
      };
    }

    if (tier === 'yearly' && isActive) {
      return {
        icon: '⭐',
        label: 'Yearly Pro',
        sublabel: status === 'cancelled' ? 'Expires soon' : 'Active',
        bgClass: 'bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-200 dark:border-amber-800',
      };
    }

    if (tier === 'monthly' && isActive) {
      return {
        icon: '✨',
        label: 'Monthly Pro',
        sublabel: status === 'cancelled' ? 'Expires soon' : 'Active',
        bgClass: 'bg-indigo-100 dark:bg-indigo-900/30',
        textClass: 'text-indigo-700 dark:text-indigo-300',
        borderClass: 'border-indigo-200 dark:border-indigo-800',
      };
    }

    if (status === 'trial') {
      return {
        icon: '🎯',
        label: 'Free Trial',
        sublabel: daysRemaining !== null ? `${daysRemaining} days left` : null,
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        textClass: 'text-green-700 dark:text-green-300',
        borderClass: 'border-green-200 dark:border-green-800',
      };
    }

    // Free tier
    return {
      icon: '🌱',
      label: 'Free',
      sublabel: 'Upgrade to unlock all features',
      bgClass: 'bg-gray-100 dark:bg-gray-800',
      textClass: 'text-gray-600 dark:text-gray-400',
      borderClass: 'border-gray-200 dark:border-gray-700',
    };
  };

  const badge = getBadgeContent();

  return (
    <div
      className={`p-4 rounded-xl border ${badge.bgClass} ${badge.borderClass} ${
        onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{badge.icon}</span>
          <div>
            <p className={`font-semibold ${badge.textClass}`}>{badge.label}</p>
            {badge.sublabel && (
              <p className="text-sm text-[var(--text-secondary)]">{badge.sublabel}</p>
            )}
          </div>
        </div>

        {showManageButton && !isActive && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
            className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
          >
            Upgrade
          </button>
        )}

        {showManageButton && isActive && !isBetaUser && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Open Play Store subscription management
              window.open('https://play.google.com/store/account/subscriptions', '_blank');
            }}
            className="px-3 py-1.5 rounded-lg border border-[var(--card-border)] text-[var(--text-secondary)] text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Manage
          </button>
        )}
      </div>

      {/* Expiry warning */}
      {isActive && daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0 && (
        <div className="mt-3 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm">
          <span className="font-medium">Heads up!</span> Your {isBetaUser ? 'beta access' : 'subscription'} expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.
        </div>
      )}

      {/* Expired notice */}
      {!isActive && (status === 'expired' || (isBetaUser && daysRemaining === 0)) && (
        <div className="mt-3 p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          Your {isBetaUser ? 'beta access' : 'subscription'} has expired. Subscribe to continue your journey.
        </div>
      )}
    </div>
  );
};

export default SubscriptionBadge;
