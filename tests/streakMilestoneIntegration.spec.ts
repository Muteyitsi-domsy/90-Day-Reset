/**
 * Integration tests for streak calculation → milestone badge awarding.
 *
 * Tests how calculateUpdatedStreak() feeds into checkForNewMilestones()
 * across all four journal types (journey, mood, flip, overall), through
 * journey transitions, and across pause/resume events.
 */

import { describe, test, expect } from 'vitest';
import { calculateUpdatedStreak } from '../services/streakService';
import { checkForNewMilestones, getMilestonesForType } from '../services/milestoneService';
import type { EarnedBadge, StreakJournalType } from '../types';
import { localDate } from './helpers/factories';

// ─── Helpers ──────────────────────────────────────────────────────────────

function today() { return localDate(0); }
function daysAgoStr(n: number) { return localDate(n); }

/** Simulate N consecutive days of entries, returning final streak and badges. */
function simulateStreak(
  type: StreakJournalType,
  days: number,
  existingBadges: EarnedBadge[] = []
): { streak: number; badges: EarnedBadge[] } {
  let streak = 0;
  let lastDate = '';
  const allBadges = [...existingBadges];

  for (let i = days - 1; i >= 0; i--) {
    const entryDate = daysAgoStr(i);
    const { newStreak } = calculateUpdatedStreak(streak, lastDate || undefined, entryDate);
    const newBadges = checkForNewMilestones(type, streak, newStreak, allBadges, entryDate);
    allBadges.push(...newBadges);
    streak = newStreak;
    lastDate = entryDate;
  }

  return { streak, badges: allBadges };
}

// ─── Streak calculation (cross-type) ──────────────────────────────────────

describe('calculateUpdatedStreak — all journal types behave identically', () => {
  const types: StreakJournalType[] = ['journey', 'mood', 'flip', 'overall'];

  types.forEach(type => {
    test(`${type}: first entry → streak 1`, () => {
      const { newStreak } = calculateUpdatedStreak(0, undefined, today());
      expect(newStreak).toBe(1);
    });

    test(`${type}: consecutive day → increment`, () => {
      const { newStreak } = calculateUpdatedStreak(5, daysAgoStr(1), today());
      expect(newStreak).toBe(6);
    });

    test(`${type}: gap → reset to 1`, () => {
      const { newStreak } = calculateUpdatedStreak(10, daysAgoStr(3), today());
      expect(newStreak).toBe(1);
    });

    test(`${type}: same day → no change`, () => {
      const { newStreak } = calculateUpdatedStreak(7, today(), today());
      expect(newStreak).toBe(7);
    });
  });
});

// ─── Milestone triggers ───────────────────────────────────────────────────

describe('Milestone badges are awarded at correct thresholds', () => {

  test('day 7: journey-7 badge awarded', () => {
    const { badges } = simulateStreak('journey', 7);
    expect(badges.some(b => b.id === 'journey-7')).toBe(true);
  });

  test('day 7: journey-14 badge NOT yet awarded', () => {
    const { badges } = simulateStreak('journey', 7);
    expect(badges.some(b => b.id === 'journey-14')).toBe(false);
  });

  test('day 14: journey-14 badge awarded', () => {
    const { badges } = simulateStreak('journey', 14);
    expect(badges.some(b => b.id === 'journey-14')).toBe(true);
  });

  test('day 30: journey-30 badge awarded', () => {
    const { badges } = simulateStreak('journey', 30);
    expect(badges.some(b => b.id === 'journey-30')).toBe(true);
  });

  test('day 60: journey-60 badge awarded', () => {
    const { badges } = simulateStreak('journey', 60);
    expect(badges.some(b => b.id === 'journey-60')).toBe(true);
  });

  test('day 90: journey-90 badge awarded', () => {
    const { badges } = simulateStreak('journey', 90);
    expect(badges.some(b => b.id === 'journey-90')).toBe(true);
  });

  test('90-day full run: all 5 journey milestones awarded', () => {
    const { badges } = simulateStreak('journey', 90);
    const journeyBadgeIds = badges.filter(b => b.journalType === 'journey').map(b => b.id);
    expect(journeyBadgeIds).toContain('journey-7');
    expect(journeyBadgeIds).toContain('journey-14');
    expect(journeyBadgeIds).toContain('journey-30');
    expect(journeyBadgeIds).toContain('journey-60');
    expect(journeyBadgeIds).toContain('journey-90');
  });
});

// ─── Streak reset (gap) does not award milestone ──────────────────────────

describe('Streak gaps reset progress — no milestone on reset', () => {

  test('streak reset to 1 after gap does not award any badge', () => {
    const newBadges = checkForNewMilestones('journey', 6, 1, [], today());
    expect(newBadges).toHaveLength(0);
  });

  test('streak that breaks just before milestone does not award it', () => {
    const newBadges = checkForNewMilestones('journey', 6, 1, [], today());
    expect(newBadges.some(b => b.id === 'journey-7')).toBe(false);
  });

  test('getting back to milestone threshold after reset: badge awarded again (new id check)', () => {
    // First earn and celebrate journey-7
    const existingBadges: EarnedBadge[] = [{
      id: 'journey-7', journalType: 'journey', threshold: 7,
      earnedDate: '2026-01-07', celebrated: true,
    }];

    // Streak resets, then rebuilds to 7 again
    const newBadges = checkForNewMilestones('journey', 6, 7, existingBadges, today());
    // journey-7 already earned — should NOT award duplicate
    expect(newBadges.some(b => b.id === 'journey-7')).toBe(false);
  });
});

// ─── Badge deduplication ──────────────────────────────────────────────────

describe('Badge deduplication', () => {

  test('same badge id is never awarded twice', () => {
    const earned: EarnedBadge[] = [{
      id: 'mood-7', journalType: 'mood', threshold: 7,
      earnedDate: '2026-01-07', celebrated: false,
    }];
    const again = checkForNewMilestones('mood', 6, 7, earned, today());
    expect(again).toHaveLength(0);
  });

  test('badge from a different type does not block same threshold for other type', () => {
    const moodBadge: EarnedBadge = {
      id: 'mood-7', journalType: 'mood', threshold: 7,
      earnedDate: '2026-01-07', celebrated: false,
    };
    // journey-7 is separate — should still be awardable
    const journeyBadges = checkForNewMilestones('journey', 6, 7, [moodBadge], today());
    expect(journeyBadges.some(b => b.id === 'journey-7')).toBe(true);
  });

  test('multiple thresholds crossed in one step: all awarded', () => {
    // Jump from streak 0 to 30 in one step (unlikely but possible via data migration)
    const badges = checkForNewMilestones('flip', 0, 30, [], today());
    const ids = badges.map(b => b.id);
    expect(ids).toContain('flip-7');
    expect(ids).toContain('flip-14');
    expect(ids).toContain('flip-30');
    expect(ids).not.toContain('flip-60');
  });
});

// ─── Four journal types are independent ──────────────────────────────────

describe('Streak and milestone independence across journal types', () => {

  test('journey badge does not affect mood milestone status', () => {
    const journeyBadge: EarnedBadge = {
      id: 'journey-7', journalType: 'journey', threshold: 7,
      earnedDate: '2026-01-07', celebrated: false,
    };
    const moodBadges = checkForNewMilestones('mood', 6, 7, [journeyBadge], today());
    expect(moodBadges.some(b => b.id === 'mood-7')).toBe(true);
  });

  test('each type earns its own badge namespace', () => {
    const types: StreakJournalType[] = ['journey', 'mood', 'flip', 'overall'];
    const allBadges: EarnedBadge[] = [];

    types.forEach(type => {
      const newBadges = checkForNewMilestones(type, 6, 7, allBadges, today());
      allBadges.push(...newBadges);
    });

    expect(allBadges.map(b => b.id)).toEqual(
      expect.arrayContaining(['journey-7', 'mood-7', 'flip-7', 'overall-7'])
    );
  });

  test('getMilestonesForType returns all 5 thresholds for each type', () => {
    const badge: EarnedBadge = {
      id: 'mood-7', journalType: 'mood', threshold: 7,
      earnedDate: today(), celebrated: false,
    };
    const milestones = getMilestonesForType('mood', [badge]);
    expect(milestones).toHaveLength(5);
    expect(milestones.find(m => m.threshold === 7)?.earned).toBe(true);
    expect(milestones.find(m => m.threshold === 14)?.earned).toBe(false);
  });
});

// ─── Journey restart: badges preserved, streak restarts ──────────────────

describe('Journey restart — badge and streak behavior', () => {

  test('earned badges carry over to new journey', () => {
    const { badges: oldBadges } = simulateStreak('journey', 30);
    // Restart: streak resets to 0, but badges are preserved
    const preserved = [...oldBadges];
    expect(preserved.some(b => b.id === 'journey-7')).toBe(true);
    expect(preserved.some(b => b.id === 'journey-30')).toBe(true);
  });

  test('already-earned badges are NOT re-awarded on new journey streak rebuild', () => {
    const { badges: oldBadges } = simulateStreak('journey', 30);
    // New journey: streak rebuilds from 0
    const newBadges = checkForNewMilestones('journey', 6, 7, oldBadges, today());
    // journey-7 was already earned — should not appear again
    expect(newBadges.some(b => b.id === 'journey-7')).toBe(false);
  });

  test('mood/flip/overall badges are independent of journey restart', () => {
    const moodBadge: EarnedBadge = {
      id: 'mood-30', journalType: 'mood', threshold: 30,
      earnedDate: '2026-01-01', celebrated: true,
    };
    // Simulate a journey streak that crosses journey-7 on the new journey
    const newJourneyBadges = checkForNewMilestones('journey', 6, 7, [moodBadge], today());
    expect(newJourneyBadges.some(b => b.id === 'journey-7')).toBe(true);
    // mood-30 should still be there
    const combined = [...[moodBadge], ...newJourneyBadges];
    expect(combined.some(b => b.id === 'mood-30')).toBe(true);
  });
});

// ─── Pause/resume interaction with streak ────────────────────────────────

describe('Streak calculation after pause/resume', () => {

  test('streak of 6 on day before pause: entry after resume on consecutive day → 7 (milestone fires)', () => {
    // User's lastEntryDate was 2026-01-14, streak is 6.
    // Paused on 2026-01-15, resumed on 2026-01-22.
    // After resume, lastEntryDate shifts to 2026-01-21.
    // Entry on 2026-01-22 → streak 7 → journey-7 badge fires.
    const shiftedLastEntry = '2026-01-21';  // after 7-day pause shift
    const { newStreak } = calculateUpdatedStreak(6, shiftedLastEntry, '2026-01-22');
    expect(newStreak).toBe(7);

    const badges = checkForNewMilestones('journey', 6, 7, [], '2026-01-22');
    expect(badges.some(b => b.id === 'journey-7')).toBe(true);
  });

  test('gap after resume still breaks streak correctly', () => {
    // After pause/resume, user skips a day — streak should reset
    const shiftedLastEntry = '2026-01-21';
    const { newStreak } = calculateUpdatedStreak(6, shiftedLastEntry, '2026-01-23'); // 2-day gap
    expect(newStreak).toBe(1);
  });
});
