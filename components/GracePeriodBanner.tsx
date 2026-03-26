import React, { useMemo } from 'react';
import { Capacitor } from '@capacitor/core';

interface GracePeriodBannerProps {
  gracePeriodEndDate: string; // ISO string
  onUpdateBilling: () => void;
}

const GracePeriodBanner: React.FC<GracePeriodBannerProps> = ({ gracePeriodEndDate, onUpdateBilling }) => {
  const daysLeft = useMemo(() => {
    const end = new Date(gracePeriodEndDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [gracePeriodEndDate]);

  const isLastDay = daysLeft <= 1;

  const handleUpdateBilling = () => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      window.open('https://apps.apple.com/account/subscriptions', '_system');
    } else if (platform === 'android') {
      window.open('https://play.google.com/store/account/subscriptions', '_system');
    } else {
      onUpdateBilling();
    }
  };

  return (
    <div
      className={`w-full px-4 py-3 flex items-start gap-3 text-sm ${
        isLastDay
          ? 'bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800'
      }`}
    >
      <span className="text-lg leading-none mt-0.5" aria-hidden="true">
        {isLastDay ? '🔴' : '⚠️'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-medium leading-snug ${isLastDay ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
          {isLastDay
            ? 'Last day — update your billing to keep Pro access'
            : `Payment issue — Pro access ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
        </p>
        <p className={`text-xs mt-0.5 ${isLastDay ? 'text-red-600 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
          Your journey will be paused, not lost. Renew anytime to pick up where you left off.
        </p>
      </div>
      <button
        onClick={handleUpdateBilling}
        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
          isLastDay
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-amber-600 hover:bg-amber-700 text-white'
        }`}
      >
        Fix billing
      </button>
    </div>
  );
};

export default GracePeriodBanner;
