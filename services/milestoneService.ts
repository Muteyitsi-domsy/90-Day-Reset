// ⚠️ Milestone detection logic. Covered by tests.
// Do not modify without updating tests/milestoneService.test.ts.

import { MILESTONE_THRESHOLDS, MilestoneThreshold, StreakJournalType, EarnedBadge } from '../types';

/**
 * Check for all newly crossed milestone thresholds after a streak update.
 *
 * Rules:
 * - Only fires when streak actually incremented (newStreak > oldStreak)
 * - Returns ALL thresholds crossed between oldStreak and newStreak
 * - Returns badges in ascending threshold order
 * - Skips thresholds already present in existingBadges (idempotent)
 * - Returns empty array if no new milestones
 */
export function checkForNewMilestones(
  journalType: StreakJournalType,
  oldStreak: number,
  newStreak: number,
  existingBadges: EarnedBadge[],
  todayDate: string
): EarnedBadge[] {
  // Only fire on actual increment
  if (newStreak <= oldStreak) return [];

  const existingIds = new Set(existingBadges.map(b => b.id));
  const newBadges: EarnedBadge[] = [];

  // MILESTONE_THRESHOLDS is already ascending: [7, 14, 30, 60, 90]
  for (const threshold of MILESTONE_THRESHOLDS) {
    // Threshold must be crossed: was below, now at or above
    if (oldStreak < threshold && newStreak >= threshold) {
      const badgeId = `${journalType}-${threshold}`;
      if (!existingIds.has(badgeId)) {
        newBadges.push({
          id: badgeId,
          journalType,
          threshold,
          earnedDate: todayDate,
          celebrated: false,
        });
      }
    }
  }

  return newBadges;
}

const BADGE_INFO: Record<MilestoneThreshold, { title: string; icon: string; description: string }> = {
  7:  { title: 'Week Warrior',    icon: '🔥', description: '7 days of consistent journaling' },
  14: { title: 'Two-Week Titan',  icon: '⚡', description: '14 days of dedicated reflection' },
  30: { title: 'Monthly Master',  icon: '👑', description: '30 days of building your practice' },
  60: { title: 'Sixty-Day Sage',  icon: '🌟', description: '60 days of deep transformation' },
  90: { title: 'Legendary',       icon: '💎', description: '90 days — you showed up every single day' },
};

const TYPE_LABELS: Record<StreakJournalType, string> = {
  journey: 'Journey',
  mood: 'Mood',
  flip: 'Flip',
  overall: 'Overall',
};

/**
 * Get display info for a badge.
 * The 90-day journey badge has a special reflective tone.
 */
export function getBadgeDisplayInfo(badge: EarnedBadge): {
  title: string;
  icon: string;
  description: string;
  typeLabel: string;
  reflective?: boolean;
} {
  if (badge.journalType === 'journey' && badge.threshold === 90) {
    return {
      title: 'You showed up for yourself.',
      icon: '🪞',
      description: 'Ninety days. This wasn\'t luck — it was commitment. Take a moment to recognize what you built.',
      typeLabel: TYPE_LABELS[badge.journalType],
      reflective: true,
    };
  }

  const info = BADGE_INFO[badge.threshold];
  return {
    ...info,
    typeLabel: TYPE_LABELS[badge.journalType],
  };
}

/**
 * Get milestone status for a journal type (earned vs locked).
 */
export function getMilestonesForType(
  journalType: StreakJournalType,
  earnedBadges: EarnedBadge[]
): { threshold: MilestoneThreshold; earned: boolean; badge?: EarnedBadge }[] {
  return MILESTONE_THRESHOLDS.map(threshold => {
    const badge = earnedBadges.find(b => b.id === `${journalType}-${threshold}`);
    return { threshold, earned: !!badge, badge };
  });
}
