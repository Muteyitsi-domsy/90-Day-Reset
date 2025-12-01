import React, { useState } from 'react';
import { DailyCompletion, Settings, UserProfile } from '../types';
import DailyCompletionCircle from './DailyCompletionCircle';
import { getDayAndMonth } from '../services/geminiService';

interface CalendarViewProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  userProfile: UserProfile | null;
}

const CloseIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const CalendarView: React.FC<CalendarViewProps> = ({ isOpen, onClose, settings, userProfile }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'weeks'>('weeks');

  if (!isOpen || !userProfile) return null;

  const { day: currentDay } = getDayAndMonth(userProfile.startDate);
  const startDate = new Date(userProfile.startDate);

  // Get completion for a specific journey day
  const getCompletionForDay = (day: number): DailyCompletion | undefined => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day - 1);
    const dateStr = date.toISOString().split('T')[0];
    return settings.dailyCompletions?.find(c => c.date === dateStr);
  };

  // Check if a day is in the future
  const isFutureDay = (day: number): boolean => {
    return day > currentDay;
  };

  // Organize days into weeks
  const weeks: number[][] = [];
  for (let week = 0; week < 13; week++) {
    const weekDays: number[] = [];
    for (let dayInWeek = 0; dayInWeek < 7; dayInWeek++) {
      const day = week * 7 + dayInWeek + 1;
      if (day <= 90) {
        weekDays.push(day);
      }
    }
    if (weekDays.length > 0) {
      weeks.push(weekDays);
    }
  }

  // Calculate statistics
  const completedDays = settings.dailyCompletions?.filter(c =>
    c.ritualCompleted && c.morningEntryCompleted && c.eveningCheckinCompleted
  ).length || 0;

  const partialDays = settings.dailyCompletions?.filter(c =>
    (c.ritualCompleted || c.morningEntryCompleted || c.eveningCheckinCompleted) &&
    !(c.ritualCompleted && c.morningEntryCompleted && c.eveningCheckinCompleted)
  ).length || 0;

  const completionRate = currentDay > 0 ? Math.round((completedDays / currentDay) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-auto border border-[var(--card-border)]">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--card-bg)] border-b border-[var(--card-border)] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
                90-Day Journey Calendar
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Day {currentDay} of 90 • {90 - currentDay} days remaining
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Close calendar"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-[var(--card-bg-secondary)] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[var(--accent-primary)]">{completedDays}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Perfect Days</div>
            </div>
            <div className="bg-[var(--card-bg-secondary)] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[var(--accent-primary)]">{partialDays}</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Partial Days</div>
            </div>
            <div className="bg-[var(--card-bg-secondary)] rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-[var(--accent-primary)]">{completionRate}%</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">Completion Rate</div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setViewMode('weeks')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'weeks'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--button-secondary-bg)] text-[var(--text-secondary)]'
              }`}
            >
              By Week
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--button-secondary-bg)] text-[var(--text-secondary)]'
              }`}
            >
              Grid View
            </button>
          </div>
        </div>

        {/* Calendar Content */}
        <div className="p-6">
          {viewMode === 'weeks' ? (
            // Week View
            <div className="space-y-6">
              {weeks.map((weekDays, weekIndex) => {
                const weekNumber = weekIndex + 1;
                return (
                  <div key={weekIndex} className="bg-[var(--card-bg-secondary)] rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                      Week {weekNumber}
                    </h3>
                    <div className="grid grid-cols-7 gap-3">
                      {weekDays.map(day => {
                        const completion = getCompletionForDay(day);
                        const isToday = day === currentDay;
                        const isFuture = isFutureDay(day);
                        const isFullyComplete = completion?.ritualCompleted &&
                                              completion?.morningEntryCompleted &&
                                              completion?.eveningCheckinCompleted;

                        return (
                          <div
                            key={day}
                            className={`
                              relative aspect-square rounded-lg p-3 flex flex-col items-center justify-center gap-2
                              ${isToday ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--card-bg)]' : 'bg-[var(--card-bg)]'}
                              ${isFuture ? 'opacity-30' : ''}
                            `}
                          >
                            {/* Day number */}
                            <div className={`
                              text-xs font-semibold mb-1
                              ${isToday ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}
                            `}>
                              Day {day}
                            </div>

                            {/* Completion circle */}
                            {!isFuture && (
                              <DailyCompletionCircle
                                ritualCompleted={completion?.ritualCompleted || false}
                                morningEntryCompleted={completion?.morningEntryCompleted || false}
                                eveningCheckinCompleted={completion?.eveningCheckinCompleted || false}
                                size="small"
                              />
                            )}

                            {/* Perfect day indicator */}
                            {isFullyComplete && (
                              <div className="absolute -top-1 -right-1">
                                <span className="text-xs">✨</span>
                              </div>
                            )}

                            {/* Current day indicator */}
                            {isToday && (
                              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                                <span className="text-[10px] font-bold text-[var(--accent-primary)]">TODAY</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Grid View (all 90 days)
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: 90 }, (_, i) => i + 1).map(day => {
                const completion = getCompletionForDay(day);
                const isToday = day === currentDay;
                const isFuture = isFutureDay(day);
                const isFullyComplete = completion?.ritualCompleted &&
                                      completion?.morningEntryCompleted &&
                                      completion?.eveningCheckinCompleted;

                return (
                  <div
                    key={day}
                    className={`
                      relative aspect-square rounded-lg p-2 flex flex-col items-center justify-center
                      ${isToday ? 'ring-2 ring-[var(--accent-primary)] bg-[var(--card-bg)]' : 'bg-[var(--card-bg-secondary)]'}
                      ${isFuture ? 'opacity-20' : ''}
                    `}
                    title={`Day ${day}`}
                  >
                    {/* Day number */}
                    <div className={`
                      text-[10px] font-semibold mb-1
                      ${isToday ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}
                    `}>
                      {day}
                    </div>

                    {/* Completion circle */}
                    {!isFuture && (
                      <DailyCompletionCircle
                        ritualCompleted={completion?.ritualCompleted || false}
                        morningEntryCompleted={completion?.morningEntryCompleted || false}
                        eveningCheckinCompleted={completion?.eveningCheckinCompleted || false}
                        size="small"
                      />
                    )}

                    {/* Perfect day indicator */}
                    {isFullyComplete && (
                      <div className="absolute -top-0.5 -right-0.5">
                        <span className="text-[8px]">✨</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="sticky bottom-0 bg-[var(--card-bg)] px-6 pb-6 pt-4 border-t border-[var(--card-border)]">
          <h4 className="text-sm font-medium text-[var(--text-primary)] mb-3">Legend:</h4>
          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
              <span>Daily Ritual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
              <span>Morning Entry</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#14b8a6' }}></div>
              <span>Evening Check-in</span>
            </div>
            <div className="flex items-center gap-2">
              <span>✨</span>
              <span>Perfect Day (All Complete)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
