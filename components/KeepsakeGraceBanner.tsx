import React, { useMemo } from 'react';

interface KeepsakeGraceBannerProps {
  graceEndDate: string; // ISO string — journeyCompletedDate + 7 days
}

const KeepsakeGraceBanner: React.FC<KeepsakeGraceBannerProps> = ({ graceEndDate }) => {
  const daysLeft = useMemo(() => {
    const end = new Date(graceEndDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [graceEndDate]);

  const isLastDay = daysLeft <= 1;

  return (
    <div
      className={`w-full px-4 py-3 flex items-start gap-3 text-sm ${
        isLastDay
          ? 'bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800'
      }`}
    >
      <span className="text-lg leading-none mt-0.5" aria-hidden="true">
        {isLastDay ? '🔴' : '⏳'}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-medium leading-snug ${isLastDay ? 'text-red-800 dark:text-red-200' : 'text-amber-800 dark:text-amber-200'}`}>
          {isLastDay
            ? 'Last day to download your keepsake'
            : `Download your keepsake — ${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`}
        </p>
        <p className={`text-xs mt-0.5 ${isLastDay ? 'text-red-600 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
          Your 90-Day Journey plan has ended. Save your keepsake before access closes.
        </p>
      </div>
    </div>
  );
};

export default KeepsakeGraceBanner;
