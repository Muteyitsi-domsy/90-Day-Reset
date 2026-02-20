import React from 'react';
import { JournalEntry, UserProfile, MoodJournalEntry } from '../types';
import DailyCompletionCircle from './DailyCompletionCircle';

interface ReturnUserWelcomeScreenProps {
  onContinue: () => void;
  userProfile: UserProfile;
  todaysEntry: JournalEntry | undefined;
  ritualCompleted?: boolean;
  onSignIn?: () => void;
  userEmail?: string | null;
  // New props for mood journal focus
  isJourneyPaused?: boolean;
  isJourneyCompleted?: boolean;
  todaysMoodEntry?: MoodJournalEntry | null;
}

const ReturnUserWelcomeScreen: React.FC<ReturnUserWelcomeScreenProps> = ({
  onContinue,
  userProfile,
  todaysEntry,
  ritualCompleted = false,
  onSignIn,
  userEmail,
  isJourneyPaused = false,
  isJourneyCompleted = false,
  todaysMoodEntry = null,
}) => {

  const hour = new Date().getHours();
  const hasDoneMorning = !!todaysEntry;
  const hasDoneEvening = !!todaysEntry?.eveningCheckin;
  const isEveningTime = hour >= 16;
  const isMorning = hour < 12;

  // Check if journey is active (started, not paused, and not completed)
  const isJourneyActive = userProfile.startDate && !isJourneyPaused && !isJourneyCompleted;
  const hasMoodEntryToday = !!todaysMoodEntry;

  let title = '';
  let subtitle = '';
  let cta = '';

  if (isJourneyCompleted) {
    // Journey finished — show completion-specific welcome
    title = `Welcome back, ${userProfile.name}. 🌿`;
    subtitle = "Your 90-day journey is complete. Your keepsake is ready — and your Daily Journal and Flip Journal continue whenever you are.";
    cta = "View My Journey's End";
  } else if (isJourneyActive) {
    // 90-day journey is active - show journey-focused messaging
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
  } else {
    // Journey is paused or not started - show mood journal focused messaging
    if (hasMoodEntryToday) {
      title = `You showed up for yourself today, ${userProfile.name}! ✓`;
      subtitle = "You've already logged your mood. Taking time to check in with yourself matters.";
      cta = "View Your Journal";
    } else {
      // Time-appropriate greeting
      if (isMorning) {
        title = `Good morning, ${userProfile.name}!`;
        subtitle = "Ready to log your mood for the day? A moment of reflection sets the tone.";
      } else if (isEveningTime) {
        title = `Good evening, ${userProfile.name}.`;
        subtitle = "How has your day been? Take a moment to log your mood and reflect.";
      } else {
        title = `Welcome back, ${userProfile.name}!`;
        subtitle = "Ready to check in with yourself? Logging your mood helps build self-awareness.";
      }
      cta = "Log Your Mood";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full bg-[var(--card-bg)] backdrop-blur-sm rounded-2xl shadow-lg p-8 sm:p-12 border border-[var(--card-border)] text-center animate-fade-in">
        <h1 className="text-4xl font-light text-[var(--text-secondary)] mb-4">{title}</h1>
        <p className="text-lg text-[var(--text-primary)] mb-6 leading-relaxed">
          {subtitle}
        </p>

        {isJourneyCompleted ? (
          // Journey complete — show a keepsake icon
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                <span className="text-5xl">🪞</span>
              </div>
              <p className="text-sm text-[var(--text-primary)] font-medium">90-day journey complete</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Keepsake ready to download</p>
            </div>
          </div>
        ) : isJourneyActive ? (
          // Show Daily Completion Circle for active journey
          <div className="flex justify-center mb-8">
            <DailyCompletionCircle
              ritualCompleted={ritualCompleted}
              morningEntryCompleted={hasDoneMorning}
              eveningCheckinCompleted={hasDoneEvening}
              size="large"
              showLabel={true}
            />
          </div>
        ) : (
          // Show mood journal status for paused/no journey
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center">
              {hasMoodEntryToday ? (
                <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                  <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center mb-3">
                  <span className="text-5xl">🌱</span>
                </div>
              )}
              <p className="text-sm text-[var(--text-primary)] font-medium">
                {hasMoodEntryToday ? 'Mood logged today' : 'Mood Journal'}
              </p>
              {isJourneyPaused && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  90-day journey paused
                </p>
              )}
            </div>
          </div>
        )}

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
