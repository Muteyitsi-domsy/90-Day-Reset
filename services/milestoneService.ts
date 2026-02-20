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

// Emotionally thoughtful badge names — one set per journal type.
// Each name reflects what that stretch of days actually means in the inner journey.
// No gaming language. No power words. Each description is an invitation to pause.
const BADGE_INFO: Record<StreakJournalType, Record<MilestoneThreshold, {
  title: string;
  icon: string;
  description: string;
  reflective?: boolean;
}>> = {
  journey: {
    7:  {
      title: 'The First Lantern',
      icon: '🕯️',
      description: 'You returned seven times. In the dark, that is everything.',
    },
    14: {
      title: 'Something Taking Root',
      icon: '🌱',
      description: 'Two weeks of choosing to come back. Something quiet is anchoring itself.',
    },
    30: {
      title: 'One Full Moon',
      icon: '🌙',
      description: 'A complete cycle. You are not the same person who first opened this page.',
    },
    60: {
      title: 'The Long Dawn',
      icon: '🌄',
      description: 'Past the halfway mark — into the territory most people never reach.',
    },
    90: {
      title: 'You showed up for yourself.',
      icon: '🪞',
      description: 'Ninety days. This wasn\'t luck — it was commitment. Take a moment to recognise what you built.',
      reflective: true,
    },
  },

  mood: {
    7:  {
      title: 'Seven Tides',
      icon: '🌊',
      description: 'Seven honest accounts of your inner weather. That takes presence.',
    },
    14: {
      title: 'The Witness',
      icon: '👁️',
      description: 'You are learning to see yourself without flinching. That\'s not easy.',
    },
    30: {
      title: 'Month of Noticing',
      icon: '🌿',
      description: 'Thirty days of honest inner observation. This is where patterns begin to speak.',
    },
    60: {
      title: 'The Cartographer',
      icon: '🧭',
      description: 'You\'ve mapped enough inner terrain to start reading your own emotional landscape.',
    },
    90: {
      title: 'All Weather',
      icon: '🌦️',
      description: 'Sun and storm, stillness and upheaval — you\'ve held space for all of it.',
      reflective: true,
    },
  },

  flip: {
    7:  {
      title: 'First Turn',
      icon: '🔄',
      description: 'You took something heavy and turned it over. On the other side was something you needed.',
    },
    14: {
      title: 'The Apprentice',
      icon: '⚗️',
      description: 'You\'re learning the art of transmutation. Difficulty is beginning to yield.',
    },
    30: {
      title: 'The Tilted Mirror',
      icon: '🪟',
      description: 'Thirty perspectives shifted. What once looked like a wall is starting to look like a door.',
    },
    60: {
      title: 'Depth of Field',
      icon: '🌀',
      description: 'The view has changed because you have changed. This is what the work looks like.',
    },
    90: {
      title: 'Second Nature',
      icon: '🌿',
      description: 'Reframing is no longer effort. It has become the way you see.',
      reflective: true,
    },
  },

  overall: {
    7:  {
      title: 'Seven Steps Inward',
      icon: '🌒',
      description: 'The quietest kind of bravery — returning to yourself, seven days in a row.',
    },
    14: {
      title: 'Something Woven',
      icon: '🌓',
      description: 'Two weeks of showing up for yourself. A thread is becoming a fabric.',
    },
    30: {
      title: 'The Clearing',
      icon: '🌔',
      description: 'Thirty days of making space. What was always there is beginning to surface.',
    },
    60: {
      title: 'Deep Water',
      icon: '🌕',
      description: 'You are no longer skimming the surface. You\'ve gone to where the still water is.',
    },
    90: {
      title: 'The One Who Returned',
      icon: '🌟',
      description: 'Ninety days of coming back. That is the whole practice.',
      reflective: true,
    },
  },
};

const TYPE_LABELS: Record<StreakJournalType, string> = {
  journey: 'Journey',
  mood: 'Daily Journal',
  flip: 'Flip Journal',
  overall: 'Overall',
};

/**
 * Get display info for a badge.
 * All 90-day badges use a reflective (quiet, contemplative) modal style.
 */
export function getBadgeDisplayInfo(badge: EarnedBadge): {
  title: string;
  icon: string;
  description: string;
  typeLabel: string;
  reflective?: boolean;
} {
  const info = BADGE_INFO[badge.journalType][badge.threshold];
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
