import React from 'react';
import { getMilestonesForType, getBadgeDisplayInfo } from '../services/milestoneService';
import type { EarnedBadge, StreakJournalType } from '../types';

interface BadgeCollectionProps {
  earnedBadges: EarnedBadge[];
  currentStreaks: {
    journey: number;
    mood: number;
    flip: number;
    overall: number;
  };
  onClose: () => void;
}

const JOURNAL_TYPES: { type: StreakJournalType; label: string; description: string }[] = [
  { type: 'overall',  label: 'Overall',       description: 'Any journal entry, any day' },
  { type: 'journey',  label: 'Journey',        description: '90-day identity reset' },
  { type: 'mood',     label: 'Daily Journal',  description: 'Emotional check-ins' },
  { type: 'flip',     label: 'Flip Journal',   description: 'Reframing challenges' },
];

const BadgeCollection: React.FC<BadgeCollectionProps> = ({ earnedBadges, currentStreaks, onClose }) => {
  const totalEarned = earnedBadges.length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-light text-[var(--text-primary)]">Milestones</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none"
          >
            &times;
          </button>
        </div>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {totalEarned === 0
            ? 'Your milestones will appear here as you build your practice.'
            : totalEarned === 20
              ? 'All 20 milestones reached. This is the whole practice.'
              : `${totalEarned} of 20 milestones reached`}
        </p>

        {JOURNAL_TYPES.map(({ type, label, description }) => {
          const milestones = getMilestonesForType(type, earnedBadges);
          const streak = currentStreaks[type];
          const earnedCount = milestones.filter(m => m.earned).length;

          return (
            <div key={type} className="mb-7">
              {/* Section header */}
              <div className="flex items-center justify-between mb-1">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">
                    {label}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">{description}</p>
                </div>
                <div className="text-right">
                  {streak > 0 && (
                    <span className="text-xs text-[var(--accent-primary)] block">
                      {streak}-day streak
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-secondary)]">
                    {earnedCount}/5
                  </span>
                </div>
              </div>

              {/* Badge row */}
              <div className="flex gap-2 mt-3">
                {milestones.map(({ threshold, earned, badge }) => {
                  const info = badge
                    ? getBadgeDisplayInfo(badge)
                    : null;

                  return (
                    <div
                      key={threshold}
                      className={`flex-1 text-center p-3 rounded-xl border transition-all duration-200 ${
                        earned
                          ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30'
                          : 'bg-[var(--card-bg)] border-[var(--card-border)] opacity-35'
                      }`}
                      title={
                        earned && info
                          ? `${info.title}\n${info.description}`
                          : `${threshold}-day streak needed`
                      }
                    >
                      <div className="text-2xl mb-1">
                        {earned && info ? info.icon : '·'}
                      </div>
                      {earned && info ? (
                        <div className="text-[9px] font-medium text-[var(--text-primary)] leading-tight line-clamp-2 min-h-[2rem]">
                          {info.title}
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-[var(--text-secondary)]">
                          {threshold}d
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Footer note */}
        <p className="text-xs text-center text-[var(--text-secondary)] mt-2 italic">
          Milestones are earned through consecutive daily entries within each journal.
        </p>
      </div>
    </div>
  );
};

export default BadgeCollection;
