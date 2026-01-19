/**
 * Admin Dashboard - Only visible to app founder/developers
 *
 * Access: Press Ctrl+Shift+A or add ?admin=true to URL
 *
 * Protected by a separate "Founder PIN" stored in localStorage.
 * This PIN is independent of user accounts - only the founder knows it.
 *
 * This dashboard helps you monitor:
 * - API usage across all users (when you have a backend)
 * - Current quota status
 * - Cost projections
 * - Mood summary testing
 */

import { useEffect, useState } from 'react';
import { rateLimiter } from '../services/rateLimiter';
import { analysisCache } from '../services/analysisCache';
import { QuotaStatus } from './QuotaStatus';
import { Settings, MoodJournalEntry, MonthlySummaryData, AnnualRecapData } from '../types';
import { calculateMonthlySummary, calculateAnnualRecap } from '../utils/moodSummaryCalculations';

// Founder PIN storage key - separate from user data
const FOUNDER_PIN_KEY = '90day_founder_pin';

// Get founder PIN from localStorage
function getFounderPin(): string | null {
  try {
    return localStorage.getItem(FOUNDER_PIN_KEY);
  } catch {
    return null;
  }
}

// Save founder PIN to localStorage
function saveFounderPin(pin: string): void {
  try {
    localStorage.setItem(FOUNDER_PIN_KEY, pin.toUpperCase());
  } catch (e) {
    console.error('Failed to save founder PIN:', e);
  }
}

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  moodEntries?: MoodJournalEntry[];
  onTestMonthlySummary?: (data: MonthlySummaryData) => void;
  onTestAnnualRecap?: (data: AnnualRecapData) => void;
}

export function AdminDashboard({ isOpen, onClose, settings, moodEntries = [], onTestMonthlySummary, onTestAnnualRecap }: AdminDashboardProps) {
  const [pinInput, setPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [isCreatingPin, setIsCreatingPin] = useState(false);
  const [founderPinExists, setFounderPinExists] = useState(false);
  const [testMonth, setTestMonth] = useState(new Date().getMonth());
  const [testYear, setTestYear] = useState(new Date().getFullYear());
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
      // Check if founder PIN exists
      const existingPin = getFounderPin();
      setFounderPinExists(!!existingPin);
      setIsCreatingPin(!existingPin);
      // Reset state when opening
      setIsPinVerified(false);
      setPinInput('');
      setConfirmPinInput('');
      setPinError('');
    }
  }, [isOpen]);

  const handleCreatePin = () => {
    if (pinInput.length !== 4) {
      setPinError('PIN must be exactly 4 characters');
      return;
    }
    if (pinInput.toUpperCase() !== confirmPinInput.toUpperCase()) {
      setPinError('PINs do not match');
      setConfirmPinInput('');
      return;
    }
    // Save the founder PIN
    saveFounderPin(pinInput);
    setFounderPinExists(true);
    setIsCreatingPin(false);
    setIsPinVerified(true);
    setPinInput('');
    setConfirmPinInput('');
    setPinError('');
  };

  const handlePinSubmit = () => {
    const founderPin = getFounderPin();
    if (!founderPin) {
      setPinError('No founder PIN set');
      return;
    }

    if (pinInput.toUpperCase() === founderPin.toUpperCase()) {
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
      if (isCreatingPin) {
        handleCreatePin();
      } else {
        handlePinSubmit();
      }
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
              {isPinVerified ? 'Founder-only monitoring and debugging tools' : 'Founder PIN required for access'}
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

        {/* Create Founder PIN Screen */}
        {isCreatingPin && !isPinVerified && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="max-w-md w-full">
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Create Founder PIN
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Set up a 4-character PIN to protect the Admin Dashboard.
                  <br />
                  <strong>Save this PIN safely</strong> - it's not linked to any account.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Create PIN</label>
                  <input
                    type="text"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value.slice(0, 4));
                      setPinError('');
                    }}
                    placeholder="Enter 4-character PIN"
                    maxLength={4}
                    autoFocus
                    className="w-full px-4 py-3 text-center text-lg tracking-widest uppercase border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Confirm PIN</label>
                  <input
                    type="text"
                    value={confirmPinInput}
                    onChange={(e) => {
                      setConfirmPinInput(e.target.value.slice(0, 4));
                      setPinError('');
                    }}
                    onKeyPress={handlePinKeyPress}
                    placeholder="Confirm PIN"
                    maxLength={4}
                    className="w-full px-4 py-3 text-center text-lg tracking-widest uppercase border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {pinError && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">
                      {pinError}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCreatePin}
                  disabled={pinInput.length !== 4 || confirmPinInput.length !== 4}
                  className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Create Founder PIN
                </button>

                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs text-amber-800 dark:text-amber-200 text-center">
                    <strong>Important:</strong> This PIN is stored locally on this device only.
                    Write it down and keep it safe - you'll need it to access admin features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enter PIN Screen */}
        {!isCreatingPin && !isPinVerified && founderPinExists && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
            <div className="max-w-md w-full">
              <div className="text-center mb-6">
                <div className="inline-block p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
                  <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Founder Access Required
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enter your Founder PIN to access the admin dashboard
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.slice(0, 4));
                    setPinError('');
                  }}
                  onKeyPress={handlePinKeyPress}
                  placeholder="Enter Founder PIN"
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

          {/* Mood Summary Testing */}
          <section>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Mood Summary Testing
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                Test monthly and annual mood summaries with your existing data.
                Total mood entries: <strong>{moodEntries.length}</strong>
              </p>

              {moodEntries.length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  No mood entries found. Add some mood journal entries first to test summaries.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Month/Year Selector */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Month</label>
                      <select
                        value={testMonth}
                        onChange={(e) => setTestMonth(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[var(--text-primary)] text-sm"
                      >
                        {['January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
                          <option key={i} value={i}>{month}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Year</label>
                      <select
                        value={testYear}
                        onChange={(e) => setTestYear(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-[var(--text-primary)] text-sm"
                      >
                        {[2024, 2025, 2026].map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Entry count for selected period */}
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Entries for {['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'][testMonth]} {testYear}: {
                      moodEntries.filter(e => {
                        const d = new Date(e.date);
                        return d.getMonth() === testMonth && d.getFullYear() === testYear;
                      }).length
                    } | Entries for {testYear}: {
                      moodEntries.filter(e => new Date(e.date).getFullYear() === testYear).length
                    }
                  </div>

                  {/* Test Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        const customEmotions = settings.customEmotions || [];
                        const data = calculateMonthlySummary(moodEntries, testMonth, testYear, customEmotions);
                        if (data && onTestMonthlySummary) {
                          onTestMonthlySummary(data);
                          onClose();
                        } else if (!data) {
                          alert(`No entries found for ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][testMonth]} ${testYear}`);
                        }
                      }}
                      disabled={!onTestMonthlySummary}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium"
                    >
                      Test Monthly Summary
                    </button>
                    <button
                      onClick={() => {
                        const customEmotions = settings.customEmotions || [];
                        const data = calculateAnnualRecap(moodEntries, testYear, customEmotions);
                        if (data && onTestAnnualRecap) {
                          onTestAnnualRecap(data);
                          onClose();
                        } else if (!data) {
                          alert(`No entries found for ${testYear}`);
                        }
                      }}
                      disabled={!onTestAnnualRecap}
                      className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md text-sm font-medium"
                    >
                      Test Annual Recap
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Firebase Console Quick Links */}
          <section>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              App Metrics (Firebase Console)
            </h3>
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
              <p className="text-sm text-indigo-800 dark:text-indigo-200 mb-4">
                View real-time app metrics directly in Firebase Console. Click any link below to open in a new tab.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/authentication/users`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                >
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Users</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total users, sign-ins, exports</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <a
                  href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/firestore/data`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                >
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                    <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Database</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Browse all user data</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <a
                  href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/firestore/usage`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                >
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Usage</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Reads, writes, storage</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <a
                  href={`https://console.firebase.google.com/project/${import.meta.env.VITE_FIREBASE_PROJECT_ID}/analytics`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors"
                >
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Analytics</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Active users, retention</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  <strong className="text-[var(--text-primary)]">Tip:</strong> In the Users tab, you can see total user count at the top and export the full list to CSV.
                  In Database, browse <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">/users</code> to see all profiles and their journal entries.
                </p>
              </div>
            </div>
          </section>

          {/* How to Monitor Production */}
          <section>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">
              Future: In-App Metrics
            </h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong className="text-[var(--text-primary)]">When you have paying users (~50-100):</strong>
                </p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Upgrade to Firebase Blaze plan (pay-as-you-go)</li>
                  <li>Add Cloud Functions to aggregate user metrics</li>
                  <li>Display real-time stats directly in this dashboard</li>
                  <li>Set up alerts for unusual activity</li>
                </ol>
                <p className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <strong className="text-[var(--text-primary)]">Metrics we can add later:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Total users, active users (7/30 day)</li>
                  <li>Journal entries created per day/week</li>
                  <li>Average streak length, completion rate</li>
                  <li>Feature adoption (MFA, mood journal, flip journal)</li>
                  <li>Mood trends across all users</li>
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
