import React, { useState } from 'react';
import type { FlipJournalEntry, MoodJournalEntry } from '../types';
import {
  MAX_ENTRIES_PER_DAY,
  getLocalDateString,
  getRemainingEntriesToday,
  canCreateEntryToday,
} from '../utils/flipPrompts';

interface FlipJournalViewProps {
  flipEntries: FlipJournalEntry[];
  onNewEntry: () => void;
  onDeleteEntry?: (entryId: string) => void;
  moodEntries?: MoodJournalEntry[];
}

const TrashIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const FlipEntryCard: React.FC<{
  entry: FlipJournalEntry;
  onDelete?: (entryId: string) => void;
  linkedMoodEntry?: MoodJournalEntry;
}> = ({ entry, onDelete, linkedMoodEntry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Parse date as local date (YYYY-MM-DD format from storage)
  const [year, month, day] = entry.date.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const handleDelete = async () => {
    if (!onDelete) return;
    if (window.confirm('Are you sure you want to delete this flip entry?')) {
      setIsDeleting(true);
      try {
        await onDelete(entry.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Preview text (first 150 chars of challenge)
  const challengePreview = entry.challenge.length > 150
    ? `${entry.challenge.substring(0, 150)}...`
    : entry.challenge;

  return (
    <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      {/* Header */}
      <div
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔄</span>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">{formattedDate}</p>
              {linkedMoodEntry && (
                <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 mt-0.5">
                  <span>📝</span>
                  <span>Flipped from Daily Journal</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                aria-label="Delete entry"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Challenge preview */}
        <div className="mb-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
            Challenge
          </p>
          <p className="text-[var(--text-primary)] font-light">
            {isExpanded ? entry.challenge : challengePreview}
          </p>
        </div>

        {/* Expand indicator */}
        <div className="flex items-center justify-center">
          <svg
            className={`w-5 h-5 text-[var(--text-secondary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-[var(--card-border)] pt-4 space-y-4 animate-fade-in">
          {/* Reframing Question */}
          <div className="bg-gradient-to-r from-[var(--accent-primary)]/5 to-[var(--accent-primary)]/10 rounded-lg p-4">
            <p className="text-xs font-medium text-[var(--accent-primary)] uppercase tracking-wide mb-2">
              From Your Wiser Self
            </p>
            <p className="text-[var(--text-primary)] italic">
              "{entry.reframingQuestion}"
            </p>
          </div>

          {/* Reframed Perspective */}
          <div>
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
              Your Response
            </p>
            <p className="text-[var(--text-primary)] font-light whitespace-pre-wrap">
              {entry.reframedPerspective}
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

const FlipJournalView: React.FC<FlipJournalViewProps> = ({
  flipEntries,
  onNewEntry,
  onDeleteEntry,
  moodEntries = [],
}) => {
  const canCreate = canCreateEntryToday(flipEntries);
  const remainingToday = getRemainingEntriesToday(flipEntries);

  // Sort entries by timestamp (newest first)
  const sortedEntries = [...flipEntries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Helper to find linked mood entry
  const getLinkedMoodEntry = (flipEntry: FlipJournalEntry): MoodJournalEntry | undefined => {
    if (!flipEntry.linkedMoodEntryId) return undefined;
    return moodEntries.find(m => m.id === flipEntry.linkedMoodEntryId);
  };

  // Group entries by date
  const entriesByDate = sortedEntries.reduce((acc, entry) => {
    const [year, month, day] = entry.date.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, FlipJournalEntry[]>);

  const dateKeys = Object.keys(entriesByDate);

  return (
    <div className="w-full h-full overflow-y-auto px-4 md:px-8 pt-4 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-light text-[var(--text-primary)] mb-2">
            Flip Journal
          </h1>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto">
            Reframe challenges through the eyes of your wiser, future self.
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {flipEntries.length} {flipEntries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>

        {/* Create Entry Button */}
        {canCreate ? (
          <div className="mb-8">
            <button
              onClick={onNewEntry}
              className="w-full py-4 px-6 rounded-xl bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-all duration-300 transform hover:scale-[1.02] shadow-lg"
            >
              🔄 New Flip Entry
            </button>
            <p className="text-xs text-center text-[var(--text-secondary)] mt-2">
              {remainingToday} of {MAX_ENTRIES_PER_DAY} entries remaining today
            </p>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
            <p className="text-amber-700 dark:text-amber-300 font-medium">
              You've reached today's limit ({MAX_ENTRIES_PER_DAY} entries)
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Come back tomorrow for more reframing sessions.
            </p>
          </div>
        )}

        {/* Empty state */}
        {flipEntries.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔄</div>
            <h2 className="text-2xl font-light text-[var(--text-primary)] mb-2">
              Start Your Flip Journal
            </h2>
            <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Transform stuck thoughts by viewing them through the lens of your wiser, future self who has already overcome these challenges.
            </p>
            <button
              onClick={onNewEntry}
              className="px-6 py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
            >
              Create First Entry
            </button>
          </div>
        )}

        {/* Entries grouped by date */}
        {dateKeys.length > 0 && (
          <div className="space-y-8">
            {dateKeys.map((dateKey) => (
              <div key={dateKey}>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4 sticky top-0 bg-gradient-to-br from-[var(--bg-from)] to-[var(--bg-to)] py-2 z-10">
                  {dateKey}
                </h2>
                <div className="space-y-4">
                  {entriesByDate[dateKey].map((entry) => (
                    <FlipEntryCard
                      key={entry.id}
                      entry={entry}
                      onDelete={onDeleteEntry}
                      linkedMoodEntry={getLinkedMoodEntry(entry)}
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

export default FlipJournalView;
