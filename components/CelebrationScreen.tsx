import React, { useState } from 'react';
import Confetti from './Confetti';
import { UserProfile, JournalEntry, Settings } from '../types';
import { generateJourneyKeepsake } from '../services/pdfKeepsakeService';

interface CelebrationScreenProps {
  completionSummary: string;
  userProfile: UserProfile;
  journalEntries: JournalEntry[];
  settings: Settings;
  onRestart: () => void;
  onExport: () => void;
}

const CelebrationScreen: React.FC<CelebrationScreenProps> = ({
  completionSummary,
  userProfile,
  journalEntries,
  settings,
  onRestart,
  onExport
}) => {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleGenerateKeepsake = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateJourneyKeepsake({
        userProfile,
        journalEntries,
        settings,
        finalSummary: completionSummary
      });
    } catch (error) {
      console.error('Error generating PDF keepsake:', error);
      alert('There was an error generating your keepsake. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  // The title is part of the layout, so we remove it from the summary text.
  const summaryContent = completionSummary.replace(/\*\*Your 90-Day Evolution\*\*/gi, '').trim();

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)] p-6 text-center overflow-hidden">
      <Confetti numberOfPieces={300} recycle={false} />
      <div className="animate-fade-in" style={{ animationFillMode: 'forwards', animationDelay: '0.3s', opacity: 0 }}>
        <h1 className="text-4xl font-bold text-emerald-700 dark:text-emerald-300 mb-4">🎉 Congratulations!</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">You’ve completed your 90-Day Identity Reset Journey</p>

        <div className="bg-[var(--card-bg)] backdrop-blur-sm shadow-lg rounded-2xl p-6 max-w-2xl text-left space-y-4 overflow-y-auto max-h-[60vh] border border-[var(--card-border)]">
          <h2 className="text-2xl font-light text-emerald-800 dark:text-emerald-200">Your 90-Day Evolution</h2>
          <p className="text-[var(--text-primary)] whitespace-pre-line font-light leading-relaxed">{summaryContent}</p>
        </div>

        {/* Daily Journal Message */}
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800 max-w-2xl">
          <p className="text-sm text-[var(--text-primary)] mb-2">
            <strong className="text-indigo-600 dark:text-indigo-400">✨ Continue Your Growth</strong>
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Keep journaling with our flexible <strong>Daily Journal</strong> feature. Journal based on your mood and life context whenever you need, or start a new 90-day journey when you're ready.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-4 items-center">
          <button
            onClick={handleGenerateKeepsake}
            disabled={isGeneratingPDF}
            className="bg-emerald-600 text-white px-8 py-3 rounded-lg hover:bg-emerald-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-64"
          >
            {isGeneratingPDF ? '✨ Creating...' : '📖 Download Journey Keepsake'}
          </button>
          <div className="flex gap-4">
            <button onClick={onRestart} className="border border-emerald-600 text-emerald-600 px-6 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors duration-300">
              🌱 Start a New Cycle
            </button>
            <button onClick={onExport} className="border border-gray-400 text-gray-600 dark:text-gray-400 px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors duration-300">
              💾 Export Data
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

export default CelebrationScreen;