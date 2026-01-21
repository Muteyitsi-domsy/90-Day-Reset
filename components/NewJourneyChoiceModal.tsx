import React, { useState } from 'react';

interface NewJourneyChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (keepManifesto: boolean, keepIntentions: boolean) => void;
  hasManifesto: boolean;
  hasIntentions: boolean;
}

const NewJourneyChoiceModal: React.FC<NewJourneyChoiceModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  hasManifesto,
  hasIntentions
}) => {
  const [keepManifesto, setKeepManifesto] = useState(true);
  const [keepIntentions, setKeepIntentions] = useState(true);
  const [confirmStep, setConfirmStep] = useState(false);

  if (!isOpen) return null;

  const handleContinue = () => {
    setConfirmStep(true);
  };

  const handleConfirm = () => {
    onConfirm(keepManifesto && hasManifesto, keepIntentions && hasIntentions);
  };

  const handleBack = () => {
    setConfirmStep(false);
  };

  const handleClose = () => {
    setConfirmStep(false);
    setKeepManifesto(true);
    setKeepIntentions(true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--card-bg)] rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--card-border)] animate-fade-in">
        {!confirmStep ? (
          <>
            {/* Choice Step */}
            <h2 className="text-2xl font-light text-[var(--text-primary)] mb-2 text-center">
              Start a New Journey
            </h2>
            <p className="text-[var(--text-secondary)] text-center mb-6">
              Would you like to carry forward any elements from your previous journey?
            </p>

            <div className="space-y-4 mb-6">
              {hasManifesto && (
                <label className="flex items-start gap-3 p-4 rounded-lg border border-[var(--input-border)] hover:bg-[var(--input-bg)] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={keepManifesto}
                    onChange={(e) => setKeepManifesto(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-emerald-600"
                  />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Keep my Ideal Self Manifesto</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Your vision of your ideal self will guide your new journey
                    </p>
                  </div>
                </label>
              )}

              {hasIntentions && (
                <label className="flex items-start gap-3 p-4 rounded-lg border border-[var(--input-border)] hover:bg-[var(--input-bg)] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={keepIntentions}
                    onChange={(e) => setKeepIntentions(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-emerald-600"
                  />
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">Keep my Intentions</p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Continue working toward the same goals
                    </p>
                  </div>
                </label>
              )}

              {!hasManifesto && !hasIntentions && (
                <p className="text-center text-[var(--text-secondary)] py-4">
                  You'll create a fresh manifesto and intentions for your new journey.
                </p>
              )}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Your previous 90-day journal entries will be cleared.
                Make sure you've downloaded your keepsake PDF!
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                Your Mood Journal and Flip Journal entries will be preserved.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 py-3 rounded-lg border border-[var(--input-border)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinue}
                className="flex-1 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Confirmation Step */}
            <h2 className="text-2xl font-light text-[var(--text-primary)] mb-2 text-center">
              Confirm New Journey
            </h2>

            <div className="my-6 p-4 bg-[var(--input-bg)] rounded-lg">
              <p className="text-[var(--text-primary)] mb-3">
                You're about to start a new 90-day journey with:
              </p>
              <ul className="space-y-2 text-sm">
                {keepManifesto && hasManifesto ? (
                  <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Your existing Ideal Self Manifesto
                  </li>
                ) : (
                  <li className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    A new Ideal Self Manifesto (you'll create this)
                  </li>
                )}
                {keepIntentions && hasIntentions ? (
                  <li className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Your existing Intentions
                  </li>
                ) : (
                  <li className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                    </svg>
                    New Intentions (you'll set these)
                  </li>
                )}
                <li className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  New arc selection based on where you are now
                </li>
              </ul>
            </div>

            <p className="text-center text-[var(--text-secondary)] mb-6">
              This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 py-3 rounded-lg border border-[var(--input-border)] text-[var(--text-secondary)] hover:bg-[var(--input-bg)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium"
              >
                Begin New Journey
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default NewJourneyChoiceModal;
