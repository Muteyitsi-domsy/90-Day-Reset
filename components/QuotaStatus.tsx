import { useEffect, useState } from 'react';
import { rateLimiter } from '../services/rateLimiter';

export function QuotaStatus() {
  const [status, setStatus] = useState({
    queueLength: 0,
    dailyRequestCount: 0,
    dailyLimit: 1000,
    recentRequests: 0,
    minuteLimit: 10
  });

  useEffect(() => {
    // Update status every 5 seconds
    const updateStatus = () => {
      setStatus(rateLimiter.getStatus());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const dailyPercentage = (status.dailyRequestCount / status.dailyLimit) * 100;
  const minutePercentage = (status.recentRequests / status.minuteLimit) * 100;

  const getDailyStatusColor = () => {
    if (dailyPercentage >= 90) return 'text-red-600 dark:text-red-400';
    if (dailyPercentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getMinuteStatusColor = () => {
    if (minutePercentage >= 90) return 'text-red-600 dark:text-red-400';
    if (minutePercentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        API Quota Status
      </h3>

      <div className="space-y-3">
        {/* Daily Quota */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Daily Requests
            </span>
            <span className={`text-xs font-medium ${getDailyStatusColor()}`}>
              {status.dailyRequestCount} / {status.dailyLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                dailyPercentage >= 90
                  ? 'bg-red-600 dark:bg-red-400'
                  : dailyPercentage >= 70
                  ? 'bg-yellow-600 dark:bg-yellow-400'
                  : 'bg-green-600 dark:bg-green-400'
              }`}
              style={{ width: `${Math.min(dailyPercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Resets at midnight
          </p>
        </div>

        {/* Per-Minute Quota */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Requests (Last Minute)
            </span>
            <span className={`text-xs font-medium ${getMinuteStatusColor()}`}>
              {status.recentRequests} / {status.minuteLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                minutePercentage >= 90
                  ? 'bg-red-600 dark:bg-red-400'
                  : minutePercentage >= 70
                  ? 'bg-yellow-600 dark:bg-yellow-400'
                  : 'bg-green-600 dark:bg-green-400'
              }`}
              style={{ width: `${Math.min(minutePercentage, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Resets every 60 seconds
          </p>
        </div>

        {/* Queue Status */}
        {status.queueLength > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2">
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {status.queueLength} request{status.queueLength > 1 ? 's' : ''} queued
            </p>
          </div>
        )}

        {/* Warning Messages */}
        {dailyPercentage >= 90 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded p-2">
            <p className="text-xs text-red-600 dark:text-red-400">
              Daily quota nearly exhausted. Consider disabling auto-analysis.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
