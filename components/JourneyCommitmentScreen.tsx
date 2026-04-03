import React from 'react';

interface JourneyCommitmentScreenProps {
  userName: string;
  isSubscribed: boolean;
  onBeginJourney: () => void;
  onOpenPaywall: () => void;
  onContinueToMood: () => void;
}

const JourneyCommitmentScreen: React.FC<JourneyCommitmentScreenProps> = ({
  userName,
  isSubscribed,
  onBeginJourney,
  onOpenPaywall,
  onContinueToMood,
}) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)]">
      <div className="max-w-md w-full space-y-8">

        <div className="text-center">
          <div className="text-5xl mb-4">🌱</div>
          <h1 className="text-3xl font-light text-[var(--text-primary)] mb-2">
            Hi {userName}
          </h1>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Your 90-day transformation journey is waiting.
          </p>
        </div>

        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 space-y-4">
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            What your journey includes
          </p>
          {[
            { icon: '📓', text: 'Daily guided journal entries — morning prompts, evening check-ins' },
            { icon: '🔄', text: "Flip Journal — reframe stuck thoughts from your wiser self's perspective" },
            { icon: '✨', text: 'AI-powered weekly and monthly reflection reports' },
            { icon: '🎯', text: 'Arc-based transformation — Release, Reaffirm, or Reignition' },
            { icon: '📄', text: 'PDF keepsake — a permanent record of your 90-day journey' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
              <p className="text-[var(--text-primary)] text-sm leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {isSubscribed ? (
            <button
              onClick={onBeginJourney}
              className="w-full py-4 rounded-xl bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300"
            >
              Begin My 90-Day Journey
            </button>
          ) : (
            <>
              <button
                onClick={onOpenPaywall}
                className="w-full py-4 rounded-xl bg-[var(--accent-primary)] text-white font-medium text-lg hover:bg-[var(--accent-primary-hover)] transition-colors duration-300"
              >
                Unlock Full Journey
              </button>
              <button
                onClick={onContinueToMood}
                className="w-full py-3 rounded-xl border border-[var(--card-border)] text-[var(--text-secondary)] font-medium hover:bg-[var(--card-bg)] transition-colors duration-300 text-sm"
              >
                Continue with Mood Journal only
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};

export default JourneyCommitmentScreen;
