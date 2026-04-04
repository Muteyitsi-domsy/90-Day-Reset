import React, { useState, useMemo } from 'react';
import type { FlipJournalEntry, MoodJournalEntry } from '../types';
import {
  MAX_ENTRIES_PER_DAY,
  getLocalDateString,
  getRemainingEntriesToday,
  canCreateEntryToday,
} from '../utils/flipPrompts';
import StreakDisplay from './StreakDisplay';

interface FlipJournalViewProps {
  flipEntries: FlipJournalEntry[];
  onNewEntry: () => void;
  onEditEntry?: (entry: FlipJournalEntry) => void;
  onDeleteEntry?: (entryId: string) => void;
  moodEntries?: MoodJournalEntry[];
  currentStreak?: number;
  streakEnabled?: boolean;
}

const TrashIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
  </svg>
);

const EditIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
  </svg>
);

const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const FlipEntryCard: React.FC<{
  entry: FlipJournalEntry;
  onEdit?: (entry: FlipJournalEntry) => void;
  onDelete?: (entryId: string) => void;
  linkedMoodEntry?: MoodJournalEntry;
}> = ({ entry, onEdit, onDelete, linkedMoodEntry }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    const message = linkedMoodEntry
      ? 'Delete this Flip entry?\n\nOnly this Flip entry will be removed. Your original Daily Journal entry will remain untouched.'
      : 'Are you sure you want to delete this flip entry?';
    if (window.confirm(message)) {
      setIsDeleting(true);
      try {
        await onDelete(entry.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const challengePreview = entry.challenge.length > 150
    ? `${entry.challenge.substring(0, 150)}...`
    : entry.challenge;

  return (
    <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="p-6 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🔄</span>
            <div>
              {linkedMoodEntry && (
                <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                  <span>📝</span>
                  <span>Flipped from Daily Journal</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
                className="p-2 rounded-lg text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
                aria-label="Edit entry"
              >
                <EditIcon className="w-5 h-5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isDeleting}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
                aria-label="Delete entry"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-1">
            Challenge
          </p>
          <p className="text-[var(--text-primary)] font-light">
            {isExpanded ? entry.challenge : challengePreview}
          </p>
        </div>

        <div className="flex items-center justify-center">
          <ChevronIcon expanded={isExpanded} />
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 border-t border-[var(--card-border)] pt-4 space-y-4 animate-fade-in">
          <div className="bg-gradient-to-r from-[var(--accent-primary)]/5 to-[var(--accent-primary)]/10 rounded-lg p-4">
            <p className="text-xs font-medium text-[var(--accent-primary)] uppercase tracking-wide mb-2">
              From Your Wiser Self
            </p>
            <p className="text-[var(--text-primary)] italic">
              "{entry.reframingQuestion}"
            </p>
          </div>
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
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
};

// ─── Grouping helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

type DayGroup = { dayKey: string; label: string; entries: FlipJournalEntry[] };
type MonthGroup = { monthKey: string; label: string; totalCount: number; days: DayGroup[] };
type YearGroup = { year: number; totalCount: number; months: MonthGroup[] };

function groupByYearMonth(entries: FlipJournalEntry[]): YearGroup[] {
  // Sort newest first
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const yearMap = new Map<number, Map<string, Map<string, FlipJournalEntry[]>>>();

  for (const entry of sorted) {
    const [y, m, d] = entry.date.split('-').map(Number);
    const monthKey = `${y}-${String(m).padStart(2, '0')}`;
    const dayKey = entry.date; // "YYYY-MM-DD"

    if (!yearMap.has(y)) yearMap.set(y, new Map());
    const months = yearMap.get(y)!;
    if (!months.has(monthKey)) months.set(monthKey, new Map());
    const days = months.get(monthKey)!;
    if (!days.has(dayKey)) days.set(dayKey, []);
    days.get(dayKey)!.push(entry);

    // suppress unused var warning — d is needed for the destructure order
    void d;
  }

  const yearGroups: YearGroup[] = [];

  // Iterate in descending year order
  for (const year of [...yearMap.keys()].sort((a, b) => b - a)) {
    const months = yearMap.get(year)!;
    const monthGroups: MonthGroup[] = [];

    for (const monthKey of [...months.keys()].sort((a, b) => b.localeCompare(a))) {
      const days = months.get(monthKey)!;
      const [, mIdx] = monthKey.split('-').map(Number);
      const label = `${MONTH_NAMES[mIdx - 1]} ${year}`;
      const dayGroups: DayGroup[] = [];
      let totalCount = 0;

      for (const dayKey of [...days.keys()].sort((a, b) => b.localeCompare(a))) {
        const dayEntries = days.get(dayKey)!;
        const [dy, dm, dd] = dayKey.split('-').map(Number);
        const dateObj = new Date(dy, dm - 1, dd);
        const dayLabel = dateObj.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
        });
        dayGroups.push({ dayKey, label: dayLabel, entries: dayEntries });
        totalCount += dayEntries.length;
      }

      monthGroups.push({ monthKey, label, totalCount, days: dayGroups });
    }

    const yearTotal = monthGroups.reduce((n, m) => n + m.totalCount, 0);
    yearGroups.push({ year, totalCount: yearTotal, months: monthGroups });
  }

  return yearGroups;
}

// ─── Main component ───────────────────────────────────────────────────────────

const FlipJournalView: React.FC<FlipJournalViewProps> = ({
  flipEntries,
  onNewEntry,
  onEditEntry,
  onDeleteEntry,
  moodEntries = [],
  currentStreak = 0,
  streakEnabled = true,
}) => {
  const canCreate = canCreateEntryToday(flipEntries);
  const remainingToday = getRemainingEntriesToday(flipEntries);

  const today = getLocalDateString(); // "YYYY-MM-DD"
  const currentYear = Number(today.split('-')[0]);
  const currentMonthKey = today.slice(0, 7); // "YYYY-MM"

  // Current year and current month start expanded; everything else collapsed
  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    () => new Set([currentYear])
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    () => new Set([currentMonthKey])
  );

  const yearGroups = useMemo(() => groupByYearMonth(flipEntries), [flipEntries]);

  const toggleYear = (year: number) => {
    setExpandedYears(prev => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  };

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      next.has(monthKey) ? next.delete(monthKey) : next.add(monthKey);
      return next;
    });
  };

  const getLinkedMoodEntry = (flipEntry: FlipJournalEntry): MoodJournalEntry | undefined => {
    if (!flipEntry.linkedMoodEntryId) return undefined;
    return moodEntries.find(m => m.id === flipEntry.linkedMoodEntryId);
  };

  return (
    <div className="w-full h-full overflow-y-auto px-4 md:px-8 pt-4 pb-24">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-light mb-2" style={{ color: '#E87520' }}>
            Flip Journal
          </h1>
          {streakEnabled && currentStreak > 0 && (
            <div className="flex justify-center text-lg mb-1">
              <StreakDisplay streak={currentStreak} label="day streak" enabled={streakEnabled} />
            </div>
          )}
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
              Reframe stuck thoughts by viewing them through the lens of your wiser, future self who has already overcome these challenges.
            </p>
            <button
              onClick={onNewEntry}
              className="px-6 py-3 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
            >
              Create First Entry
            </button>
          </div>
        )}

        {/* Year → Month → Day → Entry hierarchy */}
        {yearGroups.length > 0 && (
          <div className="space-y-4">
            {yearGroups.map(({ year, totalCount, months }) => {
              const isCurrentYear = year === currentYear;
              const isYearExpanded = expandedYears.has(year);

              return (
                <div key={year} className="border border-[var(--card-border)] rounded-2xl overflow-hidden">

                  {/* Year header — current year is always open, past years toggle */}
                  <button
                    className="w-full flex items-center justify-between px-5 py-4 bg-[var(--card-bg)] hover:bg-[var(--accent-primary)]/5 transition-colors"
                    onClick={() => !isCurrentYear && toggleYear(year)}
                    style={{ cursor: isCurrentYear ? 'default' : 'pointer' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-semibold text-[var(--text-primary)]">{year}</span>
                      {isCurrentYear && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                      <span className="text-sm">{totalCount} {totalCount === 1 ? 'entry' : 'entries'}</span>
                      {!isCurrentYear && <ChevronIcon expanded={isYearExpanded} />}
                    </div>
                  </button>

                  {/* Month list */}
                  {isYearExpanded && (
                    <div className="divide-y divide-[var(--card-border)]">
                      {months.map(({ monthKey, label, totalCount: monthTotal, days }) => {
                        const isCurrentMonth = monthKey === currentMonthKey;
                        const isMonthExpanded = expandedMonths.has(monthKey);

                        return (
                          <div key={monthKey}>

                            {/* Month header */}
                            <button
                              className="w-full flex items-center justify-between px-5 py-3 bg-[var(--bg-from)]/40 hover:bg-[var(--accent-primary)]/5 transition-colors"
                              onClick={() => toggleMonth(monthKey)}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
                                {isCurrentMonth && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                                    This month
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <span className="text-xs">{monthTotal} {monthTotal === 1 ? 'entry' : 'entries'}</span>
                                <ChevronIcon expanded={isMonthExpanded} />
                              </div>
                            </button>

                            {/* Days and entries */}
                            {isMonthExpanded && (
                              <div className="px-4 py-3 space-y-6 bg-[var(--bg-from)]/20">
                                {days.map(({ dayKey, label: dayLabel, entries: dayEntries }) => (
                                  <div key={dayKey}>
                                    <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-3 pl-1">
                                      {dayLabel}
                                    </p>
                                    <div className="space-y-3">
                                      {dayEntries.map(entry => (
                                        <FlipEntryCard
                                          key={entry.id}
                                          entry={entry}
                                          onEdit={onEditEntry}
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
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlipJournalView;
