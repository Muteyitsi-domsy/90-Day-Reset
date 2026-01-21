import React, { useState } from 'react';
import Confetti from './Confetti';
import { UserProfile, JournalEntry, Settings } from '../types';
import { generateJourneyKeepsake } from '../services/pdfKeepsakeService';

interface KeepsakeWindowProps {
  completionSummary: string;
  userProfile: UserProfile;
  journalEntries: JournalEntry[];
  settings: Settings;
  daysRemaining: number;
  onStartNewJourney: () => void;
  onExport: () => void;
}

const KeepsakeWindow: React.FC<KeepsakeWindowProps> = ({
  completionSummary,
  userProfile,
  journalEntries,
  settings,
  daysRemaining,
  onStartNewJourney,
  onExport
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleGenerateKeepsake = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateJourneyKeepsake({
        userProfile,
        journalEntries,
        settings,
        finalSummary: completionSummary
      });
      setHasDownloaded(true);
    } catch (error) {
      console.error('Error generating PDF keepsake:', error);
      alert('There was an error generating your keepsake. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const summaryContent = completionSummary.replace(/\*\*Your 90-Day Evolution\*\*/gi, '').trim();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)] p-6 text-center overflow-hidden">
      <Confetti numberOfPieces={150} recycle={false} />

      <div className="animate-fade-in" style={{ animationFillMode: 'forwards', animationDelay: '0.3s', opacity: 0 }}>
        <h1 className="text-4xl font-bold text-emerald-700 dark:text-emerald-300 mb-4">
          Congratulations!
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          You've completed your 90-Day Identity Reset Journey
        </p>

        {/* Keepsake download reminder */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-800 max-w-md mx-auto">
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            {daysRemaining > 0 ? (
              <>
                <span className="text-2xl">{daysRemaining}</span> day{daysRemaining !== 1 ? 's' : ''} remaining to download your keepsake
              </>
            ) : (
              <>Last chance to download your keepsake!</>
            )}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Starting a new journey will clear your previous entries.
          </p>
        </div>

        {/* Summary card */}
        <div className="bg-[var(--card-bg)] backdrop-blur-sm shadow-lg rounded-2xl p-6 max-w-2xl text-left space-y-4 overflow-y-auto max-h-[40vh] border border-[var(--card-border)] mb-6">
          <h2 className="text-2xl font-light text-emerald-800 dark:text-emerald-200">Your 90-Day Evolution</h2>
          <p className="text-[var(--text-primary)] whitespace-pre-line font-light leading-relaxed">{summaryContent}</p>
        </div>

        {/* Mood Journal continuation message */}
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800 max-w-2xl">
          <p className="text-sm text-[var(--text-primary)] mb-2">
            <strong className="text-indigo-600 dark:text-indigo-400">Your Mood Journal & Flip Journal continue</strong>
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Your mood and flip journal entries are preserved across journeys. Continue using them anytime, or start a fresh 90-day transformation when you're ready.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-4 items-center">
          {/* Primary CTA - Download Keepsake */}
          <button
            onClick={handleGenerateKeepsake}
            disabled={isGeneratingPDF}
            className="bg-emerald-600 text-white px-8 py-4 rounded-lg hover:bg-emerald-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-72 text-lg font-medium shadow-lg"
          >
            {isGeneratingPDF ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Download Journey Keepsake'
            )}
          </button>

          {hasDownloaded && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              Keepsake downloaded successfully!
            </p>
          )}

          {/* Secondary actions */}
          <div className="flex gap-4 mt-2">
            <button
              onClick={onStartNewJourney}
              className="border-2 border-emerald-600 text-emerald-600 dark:text-emerald-400 px-6 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors duration-300 font-medium"
            >
              Start New Journey
            </button>
            <button
              onClick={onExport}
              className="border border-gray-400 text-gray-600 dark:text-gray-400 px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors duration-300"
            >
              Export Data
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </div>
  );
};

export default KeepsakeWindow;
