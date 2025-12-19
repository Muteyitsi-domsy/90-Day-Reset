import React, { useState, useMemo } from 'react';
import type { MoodJournalEntry, CustomEmotion } from '../types';
import { getEmotionEmoji } from '../utils/moodPrompts';

interface MoodCalendarViewProps {
  moodEntries: MoodJournalEntry[];
  customEmotions: CustomEmotion[];
  onDateClick?: (date: string, entry?: MoodJournalEntry) => void;
  currentStreak?: number;
  streakEnabled?: boolean;
}

const MoodCalendarView: React.FC<MoodCalendarViewProps> = ({
  moodEntries,
  customEmotions,
  onDateClick,
  currentStreak = 0,
  streakEnabled = true,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get month and year
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar grid data
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday

    // Build calendar grid (6 weeks max)
    const grid: Array<{ date: Date | null; dateString: string | null }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.push({ date: null, dateString: null });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
      grid.push({ date, dateString });
    }

    return grid;
  }, [year, month]);

  // Create a map of date -> mood entry for quick lookup
  const moodEntriesMap = useMemo(() => {
    const map = new Map<string, MoodJournalEntry>();
    moodEntries.forEach((entry) => {
      map.set(entry.date, entry);
    });
    return map;
  }, [moodEntries]);

  // Get mood entry for a date
  const getMoodForDate = (dateString: string | null): MoodJournalEntry | undefined => {
    if (!dateString) return undefined;
    return moodEntriesMap.get(dateString);
  };

  // Check if date is today
  const isToday = (dateString: string | null): boolean => {
    if (!dateString) return false;
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  // Format month name
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate stats
  const entriesThisMonth = useMemo(() => {
    return moodEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate.getMonth() === month && entryDate.getFullYear() === year;
    }).length;
  }, [moodEntries, month, year]);

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Previous month"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{monthName}</h2>
          <div className="flex gap-4 mt-2 text-sm text-[var(--text-secondary)]">
            <span>{entriesThisMonth} entries this month</span>
            {streakEnabled && <span>• {currentStreak} day streak</span>}
          </div>
        </div>

        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Next month"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Today button */}
      <button
        onClick={goToToday}
        className="self-center mb-4 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium hover:bg-[var(--accent-primary-hover)] transition-colors"
      >
        Today
      </button>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-semibold text-[var(--text-secondary)] py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 flex-1">
        {calendarGrid.map((cell, index) => {
          if (!cell.date || !cell.dateString) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const moodEntry = getMoodForDate(cell.dateString);
          const isTodayDate = isToday(cell.dateString);
          const dayNumber = cell.date.getDate();

          return (
            <button
              key={cell.dateString}
              onClick={() => onDateClick?.(cell.dateString!, moodEntry)}
              className={`aspect-square flex flex-col items-center justify-center p-2 rounded-lg border transition-all hover:scale-105 ${
                isTodayDate
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10 ring-2 ring-[var(--ring-color)]'
                  : moodEntry
                  ? 'border-[var(--card-border)] bg-[var(--card-bg)] backdrop-blur-sm'
                  : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span
                className={`text-sm font-medium mb-1 ${
                  isTodayDate ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'
                }`}
              >
                {dayNumber}
              </span>
              {moodEntry && (
                <span className="text-3xl">
                  {getEmotionEmoji(
                    moodEntry.emotion,
                    moodEntry.isCustomEmotion,
                    moodEntry.customEmotionEmoji
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-[var(--card-border)]">
        <div className="flex flex-wrap gap-4 justify-center text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border-2 border-[var(--accent-primary)] bg-[var(--accent-primary)]/10" />
            <span>Today</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-[var(--card-border)] bg-[var(--card-bg)]" />
            <span>Mood logged</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-transparent" />
            <span>No entry</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodCalendarView;
