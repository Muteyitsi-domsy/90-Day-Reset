import React from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
  copy?: {
    title?: string;
    subtitle?: string;
    cta?: string;
  };
}

// FIX: Refactored prop destructuring to be more concise and fix a TypeScript type inference error.
// The previous method caused TypeScript to infer `copy` as `{}`, which has no properties.
// This nested destructuring correctly handles an undefined `copy` prop and applies default values.
const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onStart,
  copy: {
    title = 'Welcome 🌿',
    subtitle = 'Are you ready to show up for your future self? Begin a gentle 90-day reset of habits, identity and daily rituals. One small step today.',
    cta = 'Yes, I’m ready',
  } = {},
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fdfbf7] to-[#f4f1ea] dark:from-gray-900 dark:to-gray-800 p-6 font-sans">
      <div className="max-w-lg w-full bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-white dark:border-gray-700 text-center animate-fade-in">
        <h1 className="text-4xl font-light text-[#3a5a40] dark:text-emerald-300 mb-4">{title}</h1>
        <p className="text-lg text-[#344e41] dark:text-gray-200 mb-8 leading-relaxed">
          {subtitle}
        </p>

        <div className="flex justify-center">
          <button
            onClick={onStart}
            className="bg-[#588157] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[#3a5a40] transition-colors duration-300 transform hover:scale-105"
          >
            {cta}
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-8">
          Your progress is saved locally and stays private.
        </p>
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

export default WelcomeScreen;