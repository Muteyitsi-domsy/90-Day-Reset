import React, { useState, useEffect } from 'react';
import type { DefaultEmotion, MoodContext, MoodIntensity, CustomEmotion } from '../types';
import { DEFAULT_EMOTION_EMOJIS, CONTEXT_LABELS, getMoodPrompt } from '../utils/moodPrompts';
import { detectCrisis, CrisisSeverity } from '../utils/crisisDetector';

interface MoodInputModalProps {
  onSave: (entry: {
    emotion: string;
    intensity: MoodIntensity;
    context: MoodContext;
    prompt: string;
    journalText: string;
    isCustomEmotion: boolean;
    customEmotionEmoji?: string;
  }) => void;
  onClose: () => void;
  isSaving: boolean;
  customEmotions: CustomEmotion[];
  onAddCustomEmotion: (name: string, emoji: string) => void;
  previousPrompts?: string[]; // For prompt rotation
  editEntry?: {
    emotion: string;
    intensity: MoodIntensity;
    context: MoodContext;
    prompt: string;
    journalText: string;
    isCustomEmotion: boolean;
    customEmotionEmoji?: string;
  }; // Entry data when editing
  onCrisisDetected: (severity: CrisisSeverity) => void;
}

type Step = 'emotion' | 'intensity' | 'context' | 'journal';

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

const MoodInputModal: React.FC<MoodInputModalProps> = ({
  onSave,
  onClose,
  isSaving,
  customEmotions,
  onAddCustomEmotion,
  previousPrompts = [],
  editEntry,
  onCrisisDetected,
}) => {
  const [step, setStep] = useState<Step>(editEntry ? 'journal' : 'emotion');
  const [selectedEmotion, setSelectedEmotion] = useState<string>(editEntry?.emotion || '');
  const [selectedIntensity, setSelectedIntensity] = useState<MoodIntensity>(editEntry?.intensity || 'medium');
  const [selectedContext, setSelectedContext] = useState<MoodContext>(editEntry?.context || 'mental_health');
  const [journalText, setJournalText] = useState(editEntry?.journalText || '');
  const [isCustomEmotion, setIsCustomEmotion] = useState(editEntry?.isCustomEmotion || false);
  const [customEmotionEmoji, setCustomEmotionEmoji] = useState(editEntry?.customEmotionEmoji || '');
  const [prompt, setPrompt] = useState(editEntry?.prompt || '');

  // Custom emotion creation state
  const [showCustomEmotionForm, setShowCustomEmotionForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  const [emojiError, setEmojiError] = useState('');

  // Generate prompt when selections are complete
  useEffect(() => {
    if (step === 'journal' && selectedEmotion && !isCustomEmotion) {
      const generatedPrompt = getMoodPrompt(
        selectedEmotion as DefaultEmotion,
        selectedContext,
        selectedIntensity,
        previousPrompts
      );
      setPrompt(generatedPrompt);
    } else if (step === 'journal' && isCustomEmotion) {
      // For custom emotions, use a generic prompt structure
      const intensityText = selectedIntensity === 'high' ? 'deeply' : selectedIntensity === 'low' ? 'subtly' : '';
      setPrompt(`You're ${intensityText} feeling ${selectedEmotion.toLowerCase()} around ${CONTEXT_LABELS[selectedContext].toLowerCase()}.\n\nWhat's contributing to this feeling? Take a moment to explore what's present for you.`);
    }
  }, [step, selectedEmotion, selectedIntensity, selectedContext, isCustomEmotion, previousPrompts]);

  const handleEmotionSelect = (emotion: string, isCustom: boolean, emoji?: string) => {
    setSelectedEmotion(emotion);
    setIsCustomEmotion(isCustom);
    if (isCustom && emoji) {
      setCustomEmotionEmoji(emoji);
    }
    setStep('intensity');
  };

  // Returns true if the string contains at least one emoji character.
  // Uses Unicode Extended_Pictographic which covers all standard emoji.
  const isValidEmoji = (str: string): boolean =>
    str.length > 0 && /\p{Extended_Pictographic}/u.test(str);

  // Controlled onChange for the emoji field.
  // Uses Intl.Segmenter to extract exactly the first grapheme cluster so that
  // compound emojis (ZWJ sequences, skin-tone variants, flag sequences) are
  // treated as a single character rather than being truncated mid-codepoint.
  const handleEmojiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!raw) {
      setCustomEmoji('');
      setEmojiError('');
      return;
    }
    const segmenter = new Intl.Segmenter();
    const first = Array.from(segmenter.segment(raw))[0]?.segment ?? '';
    setCustomEmoji(first);
    if (first && !isValidEmoji(first)) {
      setEmojiError('Please enter an emoji, not text.');
    } else {
      setEmojiError('');
    }
  };

  const handleAddCustomEmotion = () => {
    if (customName.trim() && isValidEmoji(customEmoji)) {
      onAddCustomEmotion(customName.trim(), customEmoji);
      handleEmotionSelect(customName.trim(), true, customEmoji);
      setShowCustomEmotionForm(false);
      setCustomName('');
      setCustomEmoji('');
      setEmojiError('');
    }
  };

  const handleSave = () => {
    if (journalText.trim() && selectedEmotion) {
      // Check for crisis content before saving
      const severity = detectCrisis(journalText);
      if (severity >= 2) {
        onCrisisDetected(severity);
        onClose(); // Close the mood modal so crisis modal can show
        return;
      }

      onSave({
        emotion: selectedEmotion,
        intensity: selectedIntensity,
        context: selectedContext,
        prompt,
        journalText,
        isCustomEmotion,
        customEmotionEmoji,
      });
    }
  };

  const handleBack = () => {
    if (step === 'intensity') setStep('emotion');
    else if (step === 'context') setStep('intensity');
    else if (step === 'journal') setStep('context');
  };

  const renderProgressBar = () => {
    const steps: Step[] = ['emotion', 'intensity', 'context', 'journal'];
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

  const renderEmotionStep = () => {
    const defaultEmotions: Array<{ id: DefaultEmotion; label: string; emoji: string }> = [
      { id: 'joyful', label: 'Joyful', emoji: DEFAULT_EMOTION_EMOJIS.joyful },
      { id: 'calm', label: 'Calm', emoji: DEFAULT_EMOTION_EMOJIS.calm },
      { id: 'energized', label: 'Energized', emoji: DEFAULT_EMOTION_EMOJIS.energized },
      { id: 'anxious', label: 'Anxious', emoji: DEFAULT_EMOTION_EMOJIS.anxious },
      { id: 'sad', label: 'Sad', emoji: DEFAULT_EMOTION_EMOJIS.sad },
      { id: 'angry', label: 'Angry', emoji: DEFAULT_EMOTION_EMOJIS.angry },
      { id: 'overwhelmed', label: 'Overwhelmed', emoji: DEFAULT_EMOTION_EMOJIS.overwhelmed },
      { id: 'grateful', label: 'Grateful', emoji: DEFAULT_EMOTION_EMOJIS.grateful },
    ];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-light text-[var(--text-primary)] text-center mb-8">
          How are you feeling?
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {defaultEmotions.map((emotion) => (
            <button
              key={emotion.id}
              onClick={() => handleEmotionSelect(emotion.id, false)}
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-[var(--card-bg)] backdrop-blur-sm border-2 border-[var(--card-border)] hover:border-[var(--accent-primary)] hover:scale-105 transition-all duration-200 group"
            >
              <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                {emotion.emoji}
              </span>
              <span className="text-lg font-medium text-[var(--text-primary)]">
                {emotion.label}
              </span>
            </button>
          ))}
        </div>

        {/* Custom emotions */}
        {customEmotions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3 text-center">
              Your Custom Emotions
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {customEmotions.map((emotion) => (
                <button
                  key={emotion.id}
                  onClick={() => handleEmotionSelect(emotion.name, true, emotion.emoji)}
                  className="flex flex-col items-center justify-center p-6 rounded-xl bg-[var(--card-bg)] backdrop-blur-sm border-2 border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 hover:scale-105 transition-all duration-200 group"
                >
                  <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">
                    {emotion.emoji}
                  </span>
                  <span className="text-lg font-medium text-[var(--text-primary)]">
                    {emotion.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add custom emotion button */}
        {!showCustomEmotionForm && (
          <button
            onClick={() => setShowCustomEmotionForm(true)}
            className="w-full mt-4 py-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors duration-200"
          >
            + Add Custom Emotion
          </button>
        )}

        {/* Custom emotion form */}
        {showCustomEmotionForm && (
          <div className="mt-4 p-4 rounded-xl bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)]">
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-4">Create Custom Emotion</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Emotion name (e.g., Nostalgic)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)]"
                maxLength={20}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Tap emoji keyboard 🥺"
                    value={customEmoji}
                    onChange={handleEmojiChange}
                    className={`flex-1 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] ${emojiError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'}`}
                  />
                  {customEmoji && isValidEmoji(customEmoji) && (
                    <span className="text-4xl leading-none">{customEmoji}</span>
                  )}
                </div>
                {emojiError && (
                  <p className="text-xs text-red-500">{emojiError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddCustomEmotion}
                  disabled={!customName.trim() || !isValidEmoji(customEmoji)}
                  className="flex-1 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add & Select
                </button>
                <button
                  onClick={() => {
                    setShowCustomEmotionForm(false);
                    setCustomName('');
                    setCustomEmoji('');
                    setEmojiError('');
                  }}
                  className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-[var(--text-secondary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderIntensityStep = () => {
    const intensities: Array<{ id: MoodIntensity; label: string; description: string }> = [
      { id: 'low', label: 'Subtle', description: 'A gentle undertone' },
      { id: 'medium', label: 'Moderate', description: 'Clearly present' },
      { id: 'high', label: 'Intense', description: 'Deeply felt' },
    ];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-light text-[var(--text-primary)] text-center mb-4">
          How intensely?
        </h2>
        <p className="text-center text-[var(--text-secondary)] mb-8">
          You're feeling <span className="font-medium text-[var(--accent-primary)]">{selectedEmotion}</span>
        </p>

        <div className="space-y-4">
          {intensities.map((intensity) => (
            <button
              key={intensity.id}
              onClick={() => {
                setSelectedIntensity(intensity.id);
                setStep('context');
              }}
              className={`w-full p-6 rounded-xl bg-[var(--card-bg)] backdrop-blur-sm border-2 transition-all duration-200 hover:scale-102 ${
                selectedIntensity === intensity.id
                  ? 'border-[var(--accent-primary)] ring-2 ring-[var(--ring-color)]'
                  : 'border-[var(--card-border)] hover:border-[var(--accent-primary)]'
              }`}
            >
              <div className="text-left">
                <div className="text-xl font-medium text-[var(--text-primary)] mb-1">
                  {intensity.label}
                </div>
                <div className="text-sm text-[var(--text-secondary)]">
                  {intensity.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderContextStep = () => {
    const contexts: Array<{ id: MoodContext; label: string; icon: string }> = [
      { id: 'career', label: 'Career', icon: '💼' },
      { id: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
      { id: 'romantic', label: 'Romance', icon: '❤️' },
      { id: 'friendships', label: 'Friendships', icon: '👥' },
      { id: 'physical_health', label: 'Physical Health', icon: '💪' },
      { id: 'mental_health', label: 'Mental Health', icon: '🧠' },
      { id: 'spirituality', label: 'Spirituality', icon: '✨' },
      { id: 'finances', label: 'Finances', icon: '💰' },
      { id: 'studies', label: 'Studies', icon: '📚' },
      { id: 'decisions', label: 'Decisions', icon: '⚖️' },
      { id: 'motherhood', label: 'Motherhood', icon: '🤱' },
      { id: 'fatherhood', label: 'Fatherhood', icon: '👨‍🍼' },
    ];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl md:text-3xl font-light text-[var(--text-primary)] text-center mb-4">
          What area of life?
        </h2>
        <p className="text-center text-[var(--text-secondary)] mb-8">
          This feeling is connected to...
        </p>

        <div className="grid grid-cols-2 gap-4">
          {contexts.map((context) => (
            <button
              key={context.id}
              onClick={() => {
                setSelectedContext(context.id);
                setStep('journal');
              }}
              className="flex flex-col items-center justify-center p-5 rounded-xl bg-[var(--card-bg)] backdrop-blur-sm border-2 border-[var(--card-border)] hover:border-[var(--accent-primary)] hover:scale-105 transition-all duration-200 group"
            >
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                {context.icon}
              </span>
              <span className="text-base font-medium text-[var(--text-primary)] text-center">
                {context.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderJournalStep = () => {
    return (
      <div className="flex flex-col h-full">
        <h2 className="text-xl md:text-2xl font-light text-[var(--text-secondary)] mb-6 text-center whitespace-pre-wrap">
          {prompt || 'Loading prompt...'}
        </h2>
        <textarea
          value={journalText}
          onChange={(e) => setJournalText(e.target.value)}
          placeholder="Write freely..."
          className="w-full flex-1 bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl p-4 text-[var(--text-primary)] placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)] transition-all resize-none text-lg font-light leading-relaxed"
          disabled={isSaving}
          autoFocus
        />
        <button
          onClick={handleSave}
          disabled={isSaving || !journalText.trim()}
          className="w-full mt-4 py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Save Entry'}
        </button>
      </div>
    );
  };

  const renderContent = () => {
    switch (step) {
      case 'emotion':
        return renderEmotionStep();
      case 'intensity':
        return renderIntensityStep();
      case 'context':
        return renderContextStep();
      case 'journal':
        return renderJournalStep();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)] z-40 animate-fade-in-fast" role="dialog" aria-modal="true">
      <div className="absolute right-4 flex items-center gap-2" style={{ top: 'max(1rem, env(safe-area-inset-top))' }}>
        {step !== 'emotion' && (
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
          aria-label="Close mood journal"
        >
          <CloseIcon className="w-8 h-8" />
        </button>
      </div>

      <div className="flex flex-col h-full px-4 pb-4 safe-area-top md:px-8 md:pb-8">
        <div className="max-w-3xl w-full mx-auto mt-10">
          {renderProgressBar()}
        </div>
        <main className={`flex-1 overflow-y-auto flex justify-center ${step === 'journal' ? 'items-center' : 'items-start pt-4'}`}>
          <div className={`max-w-3xl w-full pb-8 ${step === 'journal' ? 'h-full flex flex-col pt-0' : ''}`}>
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
        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  );
};

export default MoodInputModal;
