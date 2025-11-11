import React from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
  copy?: {
    title?: string;
    subtitle?: string;
    cta?: string;
  };
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, copy }) => {
  const {
    title = 'Welcome 🌿',
    subtitle = 'Are you ready to show up for your future self? Begin a gentle 90-day reset of habits, identity and daily rituals. One small step today.',
    cta = 'Yes, I’m ready',
  } = copy || {};

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] text-center animate-fade-in">
        <h1 className="text-4xl font-light text-[var(--text-secondary)] mb-4">{title}</h1>
        <p className="text-lg text-[var(--text-primary)] mb-8 leading-relaxed">
          {subtitle}
        </p>

        <div className="flex justify-center">
          <button
            onClick={onStart}
            className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 transform hover:scale-105"
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