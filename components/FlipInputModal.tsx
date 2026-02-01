import React, { useState } from 'react';
import { generateReframingQuestion } from '../services/geminiService';
import {
  CHALLENGE_MAX_LENGTH,
  PERSPECTIVE_MAX_LENGTH,
  getRandomFallbackQuestion,
} from '../utils/flipPrompts';
import { detectCrisis, CrisisSeverity } from '../utils/crisisDetector';

interface FlipInputModalProps {
  onSave: (entry: {
    challenge: string;
    reframingQuestion: string;
    reframedPerspective: string;
    linkedMoodEntryId?: string;
  }) => void;
  onClose: () => void;
  isSaving: boolean;
  onCrisisDetected: (severity: CrisisSeverity) => void;
  initialChallenge?: string;      // Pre-filled challenge from mood entry
  linkedMoodEntryId?: string;     // Reference to mood entry being flipped
  editingEntry?: {                // Entry being edited (if in edit mode)
    challenge: string;
    reframingQuestion: string;
    reframedPerspective: string;
    linkedMoodEntryId?: string;
  };
}

type Step = 'challenge' | 'question' | 'perspective';

const CloseIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

const BackIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
  </svg>
);

const FlipInputModal: React.FC<FlipInputModalProps> = ({
  onSave,
  onClose,
  isSaving,
  onCrisisDetected,
  initialChallenge,
  linkedMoodEntryId,
  editingEntry,
}) => {
  const isEditing = !!editingEntry;
  const [step, setStep] = useState<Step>(isEditing ? 'perspective' : 'challenge');
  const [challenge, setChallenge] = useState(editingEntry?.challenge || initialChallenge || '');
  const [reframingQuestion, setReframingQuestion] = useState(editingEntry?.reframingQuestion || '');
  const [reframedPerspective, setReframedPerspective] = useState(editingEntry?.reframedPerspective || '');
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  // Auto-submit if we have an initial challenge from mood entry (skip to question generation)
  React.useEffect(() => {
    if (initialChallenge && initialChallenge.trim()) {
      // Auto-advance to question generation
      handleChallengeSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChallengeSubmit = async () => {
    if (!challenge.trim()) return;

    // Check for crisis content before proceeding
    const severity = detectCrisis(challenge);
    if (severity >= 2) {
      onCrisisDetected(severity);
      onClose(); // Close the flip modal so crisis modal can show
      return;
    }

    setStep('question');
    setIsGeneratingQuestion(true);
    setQuestionError(null);

    try {
      const question = await generateReframingQuestion(challenge);
      setReframingQuestion(question);
    } catch (error) {
      console.error('Error generating reframing question:', error);
      // Use fallback question
      const fallbackQuestion = getRandomFallbackQuestion();
      setReframingQuestion(fallbackQuestion);
      setQuestionError('Using a reflection prompt (AI unavailable)');
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  const handlePerspectiveSubmit = () => {
    if (!reframedPerspective.trim()) return;

    onSave({
      challenge,
      reframingQuestion,
      reframedPerspective,
      linkedMoodEntryId: linkedMoodEntryId || editingEntry?.linkedMoodEntryId,
    });
  };

  const handleBack = () => {
    if (step === 'question') {
      setStep('challenge');
      setReframingQuestion('');
      setQuestionError(null);
    } else if (step === 'perspective') {
      setStep('question');
    }
  };

  const renderProgressBar = () => {
    const steps: Step[] = ['challenge', 'question', 'perspective'];
    const currentIndex = steps.indexOf(step);
    const progress = ((currentIndex + 1) / steps.length) * 100;

    return (
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
        <div
          className="bg-[var(--accent-primary)] h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    );
  };

  const renderChallengeStep = () => (
    <div className="flex flex-col h-full">
      <div className="text-center mb-6">
        <div className="text-5xl mb-4">
          <span role="img" aria-label="thinking">🔄</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-light text-[var(--text-primary)] mb-2">
          What's on your mind?
        </h2>
        <p className="text-[var(--text-secondary)]">
          Capture the core of your challenge in 1-2 focused sentences.
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-1 opacity-70">
          Brevity helps clarity - distill the thought that's looping.
        </p>
      </div>

      <textarea
        value={challenge}
        onChange={(e) => setChallenge(e.target.value.slice(0, CHALLENGE_MAX_LENGTH))}
        placeholder="I keep feeling like... / I'm stuck because... / I can't seem to..."
        className="w-full flex-1 min-h-[150px] max-h-[200px] bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl p-4 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition-all resize-none text-lg font-light leading-relaxed"
        autoFocus
      />

      <div className="flex justify-between items-center mt-2 mb-4">
        <span className={`text-sm ${challenge.length > CHALLENGE_MAX_LENGTH * 0.9 ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}>
          {challenge.length}/{CHALLENGE_MAX_LENGTH}
        </span>
        <span className="text-xs text-[var(--text-secondary)] opacity-70">
          ~1-2 paragraphs max
        </span>
      </div>

      <button
        onClick={handleChallengeSubmit}
        disabled={!challenge.trim()}
        className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );

  const renderQuestionStep = () => (
    <div className="flex flex-col h-full items-center justify-center">
      {isGeneratingQuestion ? (
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[var(--accent-primary)] animate-spin" />
          </div>
          <h2 className="text-xl font-light text-[var(--text-primary)] mb-2">
            Your wiser self is thinking...
          </h2>
          <p className="text-[var(--text-secondary)]">
            Generating a perspective-shifting question
          </p>
        </div>
      ) : (
        <div className="text-center max-w-2xl">
          <div className="text-5xl mb-6">
            <span role="img" aria-label="wisdom">✨</span>
          </div>
          <h2 className="text-lg font-medium text-[var(--text-secondary)] mb-4 uppercase tracking-wide">
            From Your Wiser Self
          </h2>
          <p className="text-2xl md:text-3xl font-light text-[var(--text-primary)] leading-relaxed mb-6 italic">
            "{reframingQuestion}"
          </p>
          {questionError && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
              {questionError}
            </p>
          )}
          <button
            onClick={() => setStep('perspective')}
            className="px-8 py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300"
          >
            Reflect on This
          </button>
        </div>
      )}
    </div>
  );

  const renderPerspectiveStep = () => (
    <div className="flex flex-col h-full">
      <div className="text-center mb-4">
        <p className="text-lg text-[var(--text-secondary)] italic mb-2">
          "{reframingQuestion}"
        </p>
        <h2 className="text-xl md:text-2xl font-light text-[var(--text-primary)]">
          Respond from your wiser self's perspective
        </h2>
        <p className="text-xs text-[var(--text-secondary)] mt-2 opacity-70">
          Let one or two meaningful insights emerge - quality over quantity.
        </p>
      </div>

      <textarea
        value={reframedPerspective}
        onChange={(e) => setReframedPerspective(e.target.value.slice(0, PERSPECTIVE_MAX_LENGTH))}
        placeholder="Looking back, I can see... / What I know now is... / The truth I've discovered is..."
        className="w-full flex-1 min-h-[150px] max-h-[250px] bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl p-4 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition-all resize-none text-lg font-light leading-relaxed"
        autoFocus
      />

      <div className="flex justify-between items-center mt-2 mb-4">
        <span className={`text-sm ${reframedPerspective.length > PERSPECTIVE_MAX_LENGTH * 0.9 ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}>
          {reframedPerspective.length}/{PERSPECTIVE_MAX_LENGTH}
        </span>
        <span className="text-xs text-[var(--text-secondary)] opacity-70">
          ~2 paragraphs max
        </span>
      </div>

      <button
        onClick={handlePerspectiveSubmit}
        disabled={isSaving || !reframedPerspective.trim()}
        className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSaving ? (isEditing ? 'Updating...' : 'Saving...') : (isEditing ? 'Update Flip Entry' : 'Save Flip Entry')}
      </button>
    </div>
  );

  // Edit mode: shows challenge and question as read-only context, only perspective is editable
  const renderEditMode = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-4xl mb-2">
          <span role="img" aria-label="edit">✏️</span>
        </div>
        <h2 className="text-xl md:text-2xl font-light text-[var(--text-primary)]">
          Edit Your Response
        </h2>
      </div>

      {/* Read-only Challenge */}
      <div className="mb-4">
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
          Your Challenge
        </p>
        <div className="bg-[var(--card-bg)]/50 border border-[var(--card-border)] rounded-lg p-3">
          <p className="text-[var(--text-primary)] text-sm font-light">
            {challenge}
          </p>
        </div>
      </div>

      {/* Read-only Reframing Question */}
      <div className="mb-4">
        <p className="text-xs font-medium text-[var(--accent-primary)] uppercase tracking-wide mb-1">
          From Your Wiser Self
        </p>
        <div className="bg-gradient-to-r from-[var(--accent-primary)]/5 to-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-lg p-3">
          <p className="text-[var(--text-primary)] text-sm italic">
            "{reframingQuestion}"
          </p>
        </div>
      </div>

      {/* Editable Response */}
      <div className="flex-1 flex flex-col">
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
          Your Response (editable)
        </p>
        <textarea
          value={reframedPerspective}
          onChange={(e) => setReframedPerspective(e.target.value.slice(0, PERSPECTIVE_MAX_LENGTH))}
          placeholder="Looking back, I can see... / What I know now is... / The truth I've discovered is..."
          className="w-full flex-1 min-h-[120px] max-h-[200px] bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl p-4 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition-all resize-none text-base font-light leading-relaxed"
          autoFocus
        />

        <div className="flex justify-between items-center mt-2 mb-4">
          <span className={`text-sm ${reframedPerspective.length > PERSPECTIVE_MAX_LENGTH * 0.9 ? 'text-amber-500' : 'text-[var(--text-secondary)]'}`}>
            {reframedPerspective.length}/{PERSPECTIVE_MAX_LENGTH}
          </span>
        </div>
      </div>

      <button
        onClick={handlePerspectiveSubmit}
        disabled={isSaving || !reframedPerspective.trim()}
        className="w-full py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Updating...' : 'Update Response'}
      </button>
    </div>
  );

  const renderContent = () => {
    // Use dedicated edit mode UI when editing
    if (isEditing) {
      return renderEditMode();
    }

    switch (step) {
      case 'challenge':
        return renderChallengeStep();
      case 'question':
        return renderQuestionStep();
      case 'perspective':
        return renderPerspectiveStep();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)] z-40 animate-fade-in-fast" role="dialog" aria-modal="true">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {!isEditing && step !== 'challenge' && !isGeneratingQuestion && (
          <button
            onClick={handleBack}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
            aria-label="Go back"
          >
            <BackIcon className="w-8 h-8" />
          </button>
        )}
        <button
          onClick={onClose}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          aria-label="Close flip journal"
        >
          <CloseIcon className="w-8 h-8" />
        </button>
      </div>

      <div className="flex flex-col h-full p-4 md:p-8">
        {!isEditing && (
          <div className="max-w-3xl w-full mx-auto mt-12">
            {renderProgressBar()}
          </div>
        )}
        <main className={`flex-1 overflow-y-auto flex items-center justify-center ${isEditing ? 'mt-12' : ''}`}>
          <div className={`max-w-3xl w-full ${(isEditing || step !== 'question') ? 'h-full flex flex-col pt-0' : ''}`}>
            {renderContent()}
          </div>
        </main>
      </div>

      <style>{`
        @keyframes fade-in-fast {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in-fast {
          animation: fade-in-fast 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FlipInputModal;
