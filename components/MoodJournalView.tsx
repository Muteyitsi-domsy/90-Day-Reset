import React, { useState, useMemo } from 'react';
import type { MoodJournalEntry, CustomEmotion, Settings, FlipJournalEntry } from '../types';
import { getEmotionEmoji, CONTEXT_LABELS } from '../utils/moodPrompts';
import StreakDisplay from './StreakDisplay';

interface MoodJournalViewProps {
  moodEntries: MoodJournalEntry[];
  customEmotions: CustomEmotion[];
  settings: Settings;
  onNewEntry: () => void;
  onDeleteEntry?: (entryId: string) => void;
  onEditEntry?: (entry: MoodJournalEntry) => void;
  currentStreak?: number;
  onFlipEntry?: (entry: MoodJournalEntry) => void;
  flipEntries?: FlipJournalEntry[];
  onViewMonthlySummary?: (month: number, year: number) => void;
  onViewAnnualRecap?: (year: number) => void;
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
    className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const MoodEntryCard: React.FC<{
  entry: MoodJournalEntry;
  onDelete?: (entryId: string) => void;
  onEdit?: (entry: MoodJournalEntry) => void;
  hasLinkedFlip?: boolean;
}> = ({ entry, onDelete, onEdit, hasLinkedFlip }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const emoji = getEmotionEmoji(entry.emotion, entry.isCustomEmotion, entry.customEmotionEmoji);
  const emotionName = entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1);
  const contextLabel = CONTEXT_LABELS[entry.context];

  const [year, month, day] = entry.date.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  const handleDelete = async () => {
    if (!onDelete) return;
    const message = hasLinkedFlip
      ? 'Delete this Daily Journal entry?\n\nOnly this entry will be removed. Your related Flip entry will remain untouched.'
      : 'Are you sure you want to delete this mood entry?';
    if (window.confirm(message)) {
      setIsDeleting(true);
      try {
        await onDelete(entry.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const intensityColors = {
    low: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    medium: 'bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    high: 'bg-purple-200 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
  };

  return (
    <div className="relative">
      <div className="bg-[var(--card-bg)] backdrop-blur-sm border border-[var(--card-border)] rounded-xl p-6 transition-all duration-300 hover:shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{emoji}</span>
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">{emotionName}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{formattedDate}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(entry)}
                className="p-2 rounded-lg text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
                aria-label="Edit entry"
              >
                <EditIcon className="w-5 h-5" />
              </button>
            )}
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
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${intensityColors[entry.intensity]}`}>
            {entry.intensity === 'low' ? 'Subtle' : entry.intensity === 'medium' ? 'Moderate' : 'Intense'}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            {contextLabel}
          </span>
        </div>

        <div className="mb-4">
          <p className="text-sm text-[var(--text-secondary)] italic whitespace-pre-wrap">
            "{entry.prompt}"
          </p>
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <p className="font-light text-[var(--text-primary)] whitespace-pre-wrap">
            {isExpanded || entry.journalText.length <= 300
              ? entry.journalText
              : `${entry.journalText.substring(0, 300)}...`}
          </p>
        </div>

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

// ─── Grouping helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

type MonthGroup = {
  monthKey: string;   // "YYYY-MM"
  label: string;      // "April 2026"
  month: number;      // 1-12
  year: number;
  totalCount: number;
  entries: MoodJournalEntry[];
};

type YearGroup = {
  year: number;
  totalCount: number;
  months: MonthGroup[];
};

function groupByYearMonth(entries: MoodJournalEntry[]): YearGroup[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const yearMap = new Map<number, Map<string, MoodJournalEntry[]>>();

  for (const entry of sorted) {
    const [y, m] = entry.date.split('-').map(Number);
    const monthKey = `${y}-${String(m).padStart(2, '0')}`;
    if (!yearMap.has(y)) yearMap.set(y, new Map());
    const months = yearMap.get(y)!;
    if (!months.has(monthKey)) months.set(monthKey, []);
    months.get(monthKey)!.push(entry);
  }

  const yearGroups: YearGroup[] = [];

  for (const year of [...yearMap.keys()].sort((a, b) => b - a)) {
    const months = yearMap.get(year)!;
    const monthGroups: MonthGroup[] = [];

    for (const monthKey of [...months.keys()].sort((a, b) => b.localeCompare(a))) {
      const monthEntries = months.get(monthKey)!;
      const m = Number(monthKey.split('-')[1]);
      monthGroups.push({
        monthKey,
        label: `${MONTH_NAMES[m - 1]} ${year}`,
        month: m,
        year,
        totalCount: monthEntries.length,
        entries: monthEntries,
      });
    }

    yearGroups.push({
      year,
      totalCount: monthGroups.reduce((n, mg) => n + mg.totalCount, 0),
      months: monthGroups,
    });
  }

  return yearGroups;
}

// ─── Main component ───────────────────────────────────────────────────────────

const MoodJournalView: React.FC<MoodJournalViewProps> = ({
  moodEntries,
  settings,
  onNewEntry,
  onDeleteEntry,
  onEditEntry,
  currentStreak = 0,
  onFlipEntry,
  flipEntries = [],
  onViewMonthlySummary,
  onViewAnnualRecap,
}) => {
  const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const currentYear = Number(today.split('-')[0]);
  const currentMonthKey = today.slice(0, 7);

  const hasWrittenToday = moodEntries.some(entry => entry.date === today);

  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set([currentYear]));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set([currentMonthKey]));

  const yearGroups = useMemo(() => groupByYearMonth(moodEntries), [moodEntries]);

  const toggleYear = (year: number) =>
    setExpandedYears(prev => { const s = new Set(prev); s.has(year) ? s.delete(year) : s.add(year); return s; });

  const toggleMonth = (monthKey: string) =>
    setExpandedMonths(prev => { const s = new Set(prev); s.has(monthKey) ? s.delete(monthKey) : s.add(monthKey); return s; });

  const todaysEntry = moodEntries.find(e => e.date === today);
  const isAlreadyFlipped = todaysEntry && flipEntries.some(f => f.linkedMoodEntryId === todaysEntry.id);
  const todayFlipCount = flipEntries.filter(f => f.date === today).length;
  const canFlip = onFlipEntry && todaysEntry && !isAlreadyFlipped && todayFlipCount < 3;

  return (
    <div className="w-full h-full overflow-y-auto px-4 md:px-8 pt-4 pb-24">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-light mb-2" style={{ color: '#4E9B58' }}>
            Daily Journal
          </h1>
          <div className="flex justify-center">
            <StreakDisplay streak={currentStreak || 0} label="day streak" enabled={settings.moodStreakEnabled !== false} />
          </div>
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

        {/* Already written today */}
        {hasWrittenToday && (
          <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
            <p className="text-green-700 dark:text-green-300 font-medium text-center mb-3">
              ✅ You've already written your entry for today.
            </p>
            {canFlip && (
              <button
                onClick={() => onFlipEntry(todaysEntry)}
                className="w-full py-2 px-4 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                <span>Flip Today's Entry</span>
              </button>
            )}
            {isAlreadyFlipped && (
              <p className="text-sm text-center text-purple-600 dark:text-purple-400 mt-2">
                🔄 You've already flipped today's entry
              </p>
            )}
            {!canFlip && !isAlreadyFlipped && todayFlipCount >= 3 && (
              <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-2">
                Daily flip limit reached (3/3)
              </p>
            )}
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

        {/* Year → Month → Entry hierarchy */}
        {yearGroups.length > 0 && (
          <div className="space-y-4">
            {yearGroups.map(({ year, totalCount, months }) => {
              const isCurrentYear = year === currentYear;
              const isYearExpanded = expandedYears.has(year);
              const isPastYear = year < currentYear;

              return (
                <div key={year} className="border border-[var(--card-border)] rounded-2xl overflow-hidden">

                  {/* Year header */}
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
                      {isPastYear && onViewAnnualRecap && (
                        <button
                          onClick={e => { e.stopPropagation(); onViewAnnualRecap(year); }}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors"
                        >
                          <span>🎉</span>
                          <span>{year} Recap</span>
                        </button>
                      )}
                      <span className="text-sm">{totalCount} {totalCount === 1 ? 'entry' : 'entries'}</span>
                      {!isCurrentYear && <ChevronIcon expanded={isYearExpanded} />}
                    </div>
                  </button>

                  {/* Month list */}
                  {isYearExpanded && (
                    <div className="divide-y divide-[var(--card-border)]">
                      {months.map(({ monthKey, label, month, year: mYear, totalCount: monthTotal, entries }) => {
                        const isCurrentMonth = monthKey === currentMonthKey;
                        const isMonthExpanded = expandedMonths.has(monthKey);
                        const isPastMonth = !isCurrentMonth;

                        return (
                          <div key={monthKey}>

                            {/* Month header */}
                            <button
                              className="w-full flex items-center justify-between px-5 py-3 bg-[var(--bg-from)]/40 hover:bg-[var(--accent-primary)]/5 transition-colors"
                              onClick={() => toggleMonth(monthKey)}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-sm font-medium text-[var(--text-primary)] truncate">{label}</span>
                                {isCurrentMonth && (
                                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex-shrink-0">
                                    This month
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[var(--text-secondary)] flex-shrink-0 ml-2">
                                {isPastMonth && onViewMonthlySummary && (
                                  <button
                                    onClick={e => { e.stopPropagation(); onViewMonthlySummary(month, mYear); }}
                                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/20 transition-colors"
                                  >
                                    <span>📊</span>
                                    <span>Summary</span>
                                  </button>
                                )}
                                <span className="text-xs">{monthTotal} {monthTotal === 1 ? 'entry' : 'entries'}</span>
                                <ChevronIcon expanded={isMonthExpanded} />
                              </div>
                            </button>

                            {/* Entries */}
                            {isMonthExpanded && (
                              <div className="px-4 py-3 space-y-4 bg-[var(--bg-from)]/20">
                                {entries.map(entry => (
                                  <MoodEntryCard
                                    key={entry.id}
                                    entry={entry}
                                    onDelete={onDeleteEntry}
                                    onEdit={onEditEntry}
                                    hasLinkedFlip={flipEntries.some(f => f.linkedMoodEntryId === entry.id)}
                                  />
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

export default MoodJournalView;
