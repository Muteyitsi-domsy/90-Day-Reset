import React from 'react';

interface FlipPromptModalProps {
  onAccept: () => void;
  onDecline: () => void;
  remainingFlips: number;
}

const FlipPromptModal: React.FC<FlipPromptModalProps> = ({
  onAccept,
  onDecline,
  remainingFlips,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="flip-prompt-title"
    >
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--card-border)] max-w-md w-full p-6 animate-scale-in">
        {/* Icon */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-3">
            <span className="text-3xl">🔄</span>
          </div>
          <h2
            id="flip-prompt-title"
            className="text-xl font-semibold text-[var(--text-primary)]"
          >
            Flip This Thought?
          </h2>
        </div>

        {/* Description */}
        <p className="text-[var(--text-secondary)] text-center mb-6 leading-relaxed">
          Transform what you just wrote into a new perspective. Your wiser self has a question for you.
        </p>

        {/* Remaining flips indicator */}
        <p className="text-sm text-center text-[var(--text-secondary)] mb-6">
          <span className="inline-flex items-center gap-1">
            <span className="font-medium text-[var(--accent-primary)]">{remainingFlips}</span>
            flip{remainingFlips !== 1 ? 's' : ''} remaining today
          </span>
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 py-3 px-4 rounded-lg border border-[var(--card-border)] text-[var(--text-secondary)] font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 px-4 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
          >
            Yes, Flip It
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FlipPromptModal;
