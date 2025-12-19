import React from 'react';

interface PausedScreenProps {
  onResume: () => void;
  onOpenMoodJournal?: () => void;
}

const PausedScreen: React.FC<PausedScreenProps> = ({ onResume, onOpenMoodJournal }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-6 text-center animate-fade-in">
      <div className="max-w-md w-full">
        <h2 className="text-3xl font-light text-[var(--text-secondary)] mb-4">Your journey is paused.</h2>
        <p className="text-lg font-light text-[var(--text-primary)] leading-relaxed mb-6">
          Allow yourself rest, take a step back. You can continue anytime you decide, and we will be ready to have you when you are.
        </p>

        {/* Daily Journal Option */}
        {onOpenMoodJournal && (
          <div className="mb-8 p-4 bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-lg">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              While paused, continue with flexible <strong className="text-[var(--accent-primary)]">Daily Journaling</strong> based on your mood and needs.
            </p>
            <button
              onClick={onOpenMoodJournal}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-lg text-sm font-medium shadow hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
            >
              Open Daily Journal
            </button>
          </div>
        )}

        <button
          onClick={onResume}
          className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 transform hover:scale-105"
        >
          Resume Journey
        </button>
      </div>
       <style>{`
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PausedScreen;