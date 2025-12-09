/**
 * Admin Dashboard - Only visible to app developers
 *
 * Access: Type "admin" three times quickly on any screen to toggle admin mode
 * Or add ?admin=true to URL
 *
 * This dashboard helps you monitor:
 * - API usage across all users (when you have a backend)
 * - Current quota status
 * - Cost projections
 */

import { useEffect, useState } from 'react';
import { rateLimiter } from '../services/rateLimiter';
import { analysisCache } from '../services/analysisCache';
import { QuotaStatus } from './QuotaStatus';
import { Settings } from '../types';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
}

export function AdminDashboard({ isOpen, onClose, settings }: AdminDashboardProps) {
  const [pinInput, setPinInput] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pinError, setPinError] = useState('');
  const [cacheStats, setCacheStats] = useState({
    totalEntries: 0,
    totalSize: 0,
    oldestEntry: null as number | null,
    newestEntry: null as number | null
  });

  useEffect(() => {
    if (isOpen) {
      setCacheStats(analysisCache.getStats());
      // Reset PIN verification when opening (unless no PIN is set)
      if (!settings.pin) {
        setIsPinVerified(true);
      } else {
        setIsPinVerified(false);
        setPinInput('');
        setPinError('');
      }
    }
  }, [isOpen, settings.pin]);

  const handlePinSubmit = () => {
    if (!settings.pin) {
      setPinError('No PIN set. Please set a PIN in settings first.');
      return;
    }

    if (pinInput.toUpperCase() === settings.pin.toUpperCase()) {
      setIsPinVerified(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('Incorrect PIN');
      setPinInput('');
    }
  };

  const handlePinKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePinSubmit();
    }
  };

  const handleClearCache = () => {
    if (confirm('Clear all cached analyses? This will increase API usage.')) {
      analysisCache.clearAll();
      setCacheStats(analysisCache.getStats());
      alert('Cache cleared!');
    }
  };

  const handleResetDailyCounter = () => {
    if (confirm('Reset daily request counter? Use only for testing.')) {
      rateLimiter.resetDailyCounter();
      alert('Daily counter reset!');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Admin Dashboard
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {isPinVerified ? 'Developer-only monitoring and debugging tools' : 'PIN required for access'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* PIN Entry Screen */}
        {!isPinVerified && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="max-w-md w-full">
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Admin Access Required
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your app PIN to access the admin dashboard
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  onKeyPress={handlePinKeyPress}
                  placeholder="Enter 4-letter PIN"
                  maxLength={4}
                  autoFocus
                  className="w-full px-4 py-3 text-center text-lg tracking-widest uppercase border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {pinError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">
                      {pinError}
                    </p>
                  </div>
                )}

                <button
                  onClick={handlePinSubmit}
                  disabled={pinInput.length !== 4}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Unlock Dashboard
                </button>

                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    <strong>Note:</strong> If you haven't set a PIN yet, go to Settings → Security to create one first.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content (only shown after PIN verification) */}
        {isPinVerified && (

        <div className="p-6 space-y-6">
          {/* API Quota Status */}
          <section>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              API Quota Monitor
            </h3>
            <QuotaStatus />
          </section>

          {/* Cache Statistics */}
          <section>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Cache Statistics
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Cached Analyses</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {cacheStats.totalEntries}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cache Size</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {formatBytes(cacheStats.totalSize)}
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Oldest Entry:</span>
                    <span className="text-[var(--text-primary)]">{formatDate(cacheStats.oldestEntry)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Newest Entry:</span>
                    <span className="text-[var(--text-primary)]">{formatDate(cacheStats.newestEntry)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={handleClearCache}
                className="w-full mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
              >
                Clear All Cache
              </button>
            </div>
          </section>

          {/* Cost Projections */}
          <section>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Cost Projections (Gemini API)
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Free Tier Limit:</span>
                  <span className="text-[var(--text-primary)]">~1,500 requests/day</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Paid Tier Cost:</span>
                  <span className="text-[var(--text-primary)]">~$0.075 per 1K tokens</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Est. Cost per User/Month:</span>
                  <span className="font-semibold text-[var(--text-primary)]">$0.50 - $2.00</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-800">
                  <span className="text-gray-600 dark:text-gray-400">At 100 users:</span>
                  <span className="font-bold text-[var(--text-primary)]">$50 - $200/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">At 1,000 users:</span>
                  <span className="font-bold text-[var(--text-primary)]">$500 - $2,000/month</span>
                </div>
              </div>
              <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong>Recommendation:</strong> Charge $7-10/month per user for comfortable margins.
                  Consider upgrading to Gemini paid tier when you reach ~50-100 active users.
                </p>
              </div>
            </div>
          </section>

          {/* Debug Tools */}
          <section>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Debug Tools
            </h3>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                Warning: These tools are for testing only. Use with caution.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleResetDailyCounter}
                  className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium"
                >
                  Reset Daily Counter (Testing Only)
                </button>
                <button
                  onClick={() => {
                    analysisCache.clearExpired();
                    alert('Expired cache entries cleared!');
                  }}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium"
                >
                  Clear Expired Cache Only
                </button>
              </div>
            </div>
          </section>

          {/* How to Monitor Production */}
          <section>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Production Monitoring Setup
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong className="text-[var(--text-primary)]">When you add a backend:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Track API calls per user in your database</li>
                  <li>Log costs using Gemini API usage endpoints</li>
                  <li>Set up alerts when daily costs exceed thresholds</li>
                  <li>Monitor abuse (users making excessive requests)</li>
                  <li>Implement soft/hard limits per subscription tier</li>
                </ol>
                <p className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <strong className="text-[var(--text-primary)]">Free vs Paid Tiers:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Free: Manual journaling only (no AI)</li>
                  <li>Premium ($7-10/mo): Unlimited AI analysis</li>
                  <li>Track usage to detect and prevent abuse</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
        )}
      </div>
    </div>
  );
}
