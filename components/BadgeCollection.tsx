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

const JOURNAL_TYPES: { type: StreakJournalType; label: string }[] = [
  { type: 'overall', label: 'Overall' },
  { type: 'journey', label: 'Journey' },
  { type: 'mood', label: 'Mood' },
  { type: 'flip', label: 'Flip' },
];

const BadgeCollection: React.FC<BadgeCollectionProps> = ({ earnedBadges, currentStreaks, onClose }) => {
  const totalEarned = earnedBadges.length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Achievements</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {totalEarned} of 20 badges earned
        </p>

        {JOURNAL_TYPES.map(({ type, label }) => {
          const milestones = getMilestonesForType(type, earnedBadges);
          const streak = currentStreaks[type];

          return (
            <div key={type} className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
                  {label}
                </h3>
                {streak > 0 && (
                  <span className="text-sm text-[var(--accent-primary)]">
                    {streak} day streak
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {milestones.map(({ threshold, earned, badge }) => {
                  const info = badge
                    ? getBadgeDisplayInfo(badge)
                    : { icon: '🔒', title: `${threshold}-day`, description: '' };

                  return (
                    <div
                      key={threshold}
                      className={`flex-1 text-center p-3 rounded-xl border ${
                        earned
                          ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30'
                          : 'bg-[var(--card-bg)] border-[var(--card-border)] opacity-40'
                      }`}
                      title={earned ? `${info.title} — ${info.description}` : `${threshold}-day streak needed`}
                    >
                      <div className="text-2xl mb-1">{info.icon}</div>
                      <div className={`text-xs font-medium ${earned ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                        {threshold}d
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BadgeCollection;
