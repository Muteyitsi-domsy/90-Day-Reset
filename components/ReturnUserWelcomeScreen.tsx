import React from 'react';
import { JournalEntry, UserProfile } from '../types';
import DailyCompletionCircle from './DailyCompletionCircle';

interface ReturnUserWelcomeScreenProps {
  onContinue: () => void;
  userProfile: UserProfile;
  todaysEntry: JournalEntry | undefined;
  ritualCompleted?: boolean;
  onSignIn?: () => void;
  userEmail?: string | null;
}

const ReturnUserWelcomeScreen: React.FC<ReturnUserWelcomeScreenProps> = ({
  onContinue,
  userProfile,
  todaysEntry,
  ritualCompleted = false,
  onSignIn,
  userEmail,
}) => {

  const hour = new Date().getHours();
  const hasDoneMorning = !!todaysEntry;
  const hasDoneEvening = !!todaysEntry?.eveningCheckin;
  const isEveningTime = hour >= 16;

  let title = `Welcome back, ${userProfile.name}!`;
  let subtitle = "It's a new day, and a new opportunity to connect with yourself.";
  let cta = "Begin Today's Reflection";

  if (hasDoneMorning) {
    if (hasDoneEvening) {
      title = `All done for today, ${userProfile.name}!`;
      subtitle = "You've shown up for yourself completely. Rest well and see you tomorrow.";
      cta = "View Your Journey";
    } else {
      if (isEveningTime) {
        title = `Good evening, ${userProfile.name}.`;
        subtitle = "Ready to reflect on your day and complete your evening check-in?";
        cta = "Continue to Journal";
      } else {
        title = `Great work today, ${userProfile.name}!`;
        subtitle = "Your morning reflection is complete. Return this evening to check in on your day.";
        cta = "View Your Journey";
      }
    }
  } else {
      title = `You showed up, ${userProfile.name}! ☀️`;
      subtitle = "It is so amazing that you are showing up for yourself. Let's begin today's reflection.";
      cta = "Begin Today's Reflection";
  }


  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] text-center animate-fade-in">
        <h1 className="text-4xl font-light text-[var(--text-secondary)] mb-4">{title}</h1>
        <p className="text-lg text-[var(--text-primary)] mb-6 leading-relaxed">
          {subtitle}
        </p>

        {/* Daily Completion Circle */}
        <div className="flex justify-center mb-8">
          <DailyCompletionCircle
            ritualCompleted={ritualCompleted}
            morningEntryCompleted={hasDoneMorning}
            eveningCheckinCompleted={hasDoneEvening}
            size="large"
            showLabel={true}
          />
        </div>

        <div className="flex justify-center">
          <button
            onClick={onContinue}
            className="bg-[var(--accent-primary)] text-white px-8 py-3 rounded-lg text-lg font-medium shadow hover:bg-[var(--accent-primary-hover)] transition-colors duration-300 transform hover:scale-105"
          >
            {cta}
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-8">
          {userEmail ? (
            <>Synced to cloud: {userEmail}</>
          ) : (
            <>Your progress is saved locally and stays private.</>
          )}
        </p>

        {onSignIn && !userEmail && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Have cloud backup?
            </p>
            <button
              onClick={onSignIn}
              className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] text-sm font-medium underline transition-colors"
            >
              Sign in to restore your data
            </button>
          </div>
        )}
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

export default ReturnUserWelcomeScreen;