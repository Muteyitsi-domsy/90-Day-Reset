import React, { useState } from 'react';
import type { MoodJournalEntry, CustomEmotion, Settings } from '../types';
import { getEmotionEmoji, CONTEXT_LABELS } from '../utils/moodPrompts';

interface MoodJournalViewProps {
  moodEntries: MoodJournalEntry[];
  customEmotions: CustomEmotion[];
  settings: Settings;
  onNewEntry: () => void;
  onDeleteEntry?: (entryId: string) => void;
  currentStreak?: number;
}

const TrashIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const MoodEntryCard: React.FC<{
  entry: MoodJournalEntry;
  onDelete?: (entryId: string) => void;
}> = ({ entry, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const emoji = getEmotionEmoji(entry.emotion, entry.isCustomEmotion, entry.customEmotionEmoji);
  const emotionName = entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1);
  const contextLabel = CONTEXT_LABELS[entry.context];

  // Parse date as local date (YYYY-MM-DD format from storage)
  const [year, month, day] = entry.date.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleDelete = async () => {
    if (!onDelete) return;
    if (window.confirm('Are you sure you want to delete this mood entry?')) {
      setIsDeleting(true);
      try {
        await onDelete(entry.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Intensity badge color
  const intensityColors = {
    low: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    medium: 'bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    high: 'bg-purple-200 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
  };

  return (
    <div className="relative">
      <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl p-6 transition-all duration-300 hover:shadow-lg">
        {/* Header with mood and date */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{emoji}</span>
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                {emotionName}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">{formattedDate}</p>
            </div>
          </div>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
              aria-label="Delete entry"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${intensityColors[entry.intensity]}`}>
            {entry.intensity === 'low' ? 'Subtle' : entry.intensity === 'medium' ? 'Moderate' : 'Intense'}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            {contextLabel}
          </span>
        </div>

        {/* Prompt */}
        <div className="mb-4">
          <p className="text-sm text-[var(--text-secondary)] italic whitespace-pre-wrap">
            "{entry.prompt}"
          </p>
        </div>

        {/* Journal text preview/full */}
        <div className="prose dark:prose-invert max-w-none">
          <p className="font-light text-[var(--text-primary)] whitespace-pre-wrap">
            {isExpanded || entry.journalText.length <= 300
              ? entry.journalText
              : `${entry.journalText.substring(0, 300)}...`}
          </p>
        </div>

        {/* Expand/collapse button */}
        {entry.journalText.length > 300 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] transition-colors"
          >
            {isExpanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
};

const MoodJournalView: React.FC<MoodJournalViewProps> = ({
  moodEntries,
  customEmotions,
  settings,
  onNewEntry,
  onDeleteEntry,
  currentStreak = 0,
}) => {
  // Check if user has already written today (using YYYY-MM-DD format to match stored date)
  const getLocalDateString = (date: Date = new Date()): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = getLocalDateString();
  const hasWrittenToday = moodEntries.some(entry => entry.date === today);

  // Group entries by month (parse as local date)
  const entriesByMonth = moodEntries.reduce((acc, entry) => {
    const [year, month, day] = entry.date.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    const monthKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(entry);
    return acc;
  }, {} as Record<string, MoodJournalEntry[]>);

  const monthKeys = Object.keys(entriesByMonth);

  return (
    <div className="w-full h-full overflow-y-auto px-4 md:px-8 pt-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-light text-[var(--text-primary)] mb-2">
            Daily Journal
          </h1>
          {settings.moodStreakEnabled && currentStreak > 0 && (
            <p className="text-lg text-[var(--text-secondary)]">
              🔥 {currentStreak} day streak
            </p>
          )}
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {moodEntries.length} {moodEntries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {/* Write Entry Button */}
        {!hasWrittenToday && (
          <div className="mb-8">
            <button
              onClick={onNewEntry}
              className="w-full py-4 px-6 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
            >
              ✍️ Write Today's Entry
            </button>
          </div>
        )}

        {/* Already written message */}
        {hasWrittenToday && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
            <p className="text-green-700 dark:text-green-300 font-medium">
              ✅ You've already written your entry for today. Come back tomorrow!
            </p>
          </div>
        )}

        {/* Empty state */}
        {moodEntries.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-light text-[var(--text-primary)] mb-2">
              Start Your Daily Journal
            </h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Capture your emotions and thoughts with guided prompts based on your mood and life context.
            </p>
            <button
              onClick={onNewEntry}
              className="px-6 py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
            >
              Create First Entry
            </button>
          </div>
        )}

        {/* Entries grouped by month */}
        {monthKeys.length > 0 && (
          <div className="space-y-8">
            {monthKeys.map((monthKey) => (
              <div key={monthKey}>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4 sticky top-0 bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)] py-2 z-10">
                  {monthKey}
                </h2>
                <div className="space-y-4">
                  {entriesByMonth[monthKey].map((entry) => (
                    <MoodEntryCard
                      key={entry.id}
                      entry={entry}
                      onDelete={onDeleteEntry}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MoodJournalView;
