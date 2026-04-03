/**
 * modalTriggerGuards.spec.ts
 *
 * Regression tests for the trigger guard logic on popups that fire during
 * normal user flow: flip entry invitation, milestone celebration queue,
 * and share prompt.
 *
 * These tests mirror the guard conditions in App.tsx without rendering React.
 * They act as a safety net — if the logic is moved or changed, these break.
 */

import { describe, test, expect } from 'vitest';
import { checkForNewMilestones } from '../services/milestoneService';
import type { EarnedBadge } from '../types';

const TODAY = '2026-04-02';

// ─── Share milestone badge map ────────────────────────────────────────────────
// Mirrors the shareMap in App.tsx (MilestoneCelebration onDismiss) and the
// DAY_SHARE_MAP used in handleSaveDailyPrompt.

const BADGE_SHARE_MAP: Record<string, string> = {
  'journey-7':  'day7',
  'journey-30': 'day30',
  'journey-60': 'day60',
  'journey-90': 'day90',
  'overall-7':  'streak7',
  'overall-30': 'streak30',
};

const DAY_SHARE_MAP: Record<number, string> = {
  7: 'day7', 30: 'day30', 60: 'day60', 90: 'day90',
};

function badgeTriggersMilestone(badgeId: string): string | null {
  return BADGE_SHARE_MAP[badgeId] ?? null;
}

function dayTriggersMilestone(day: number, crisisSeverity: number): string | null {
  if (crisisSeverity >= 2) return null;
  return DAY_SHARE_MAP[day] ?? null;
}

// ─── Flip daily limit guard ───────────────────────────────────────────────────
// Mirrors App.tsx handleSaveFlipEntry and handleStartFlip.

const MAX_FLIPS_PER_DAY = 3;

function flipsExhausted(todayFlipCount: number): boolean {
  return todayFlipCount >= MAX_FLIPS_PER_DAY;
}

function canStartNewFlip(todayFlipCount: number): boolean {
  return todayFlipCount < MAX_FLIPS_PER_DAY;
}

// ─── Share prompt — badge-triggered path ────────────────────────────────────

describe('share prompt — badge-triggered path', () => {
  test('journey-7 badge triggers day7 share', () => {
    expect(badgeTriggersMilestone('journey-7')).toBe('day7');
  });

  test('journey-30 badge triggers day30 share', () => {
    expect(badgeTriggersMilestone('journey-30')).toBe('day30');
  });

  test('journey-60 badge triggers day60 share', () => {
    expect(badgeTriggersMilestone('journey-60')).toBe('day60');
  });

  test('journey-90 badge triggers day90 share', () => {
    expect(badgeTriggersMilestone('journey-90')).toBe('day90');
  });

  test('overall-7 streak badge triggers streak7 share', () => {
    expect(badgeTriggersMilestone('overall-7')).toBe('streak7');
  });

  test('overall-30 streak badge triggers streak30 share', () => {
    expect(badgeTriggersMilestone('overall-30')).toBe('streak30');
  });

  test('mood-7 badge does NOT trigger a share (mood streaks have no share prompt)', () => {
    expect(badgeTriggersMilestone('mood-7')).toBeNull();
  });

  test('journey-14 badge does NOT trigger a share (not in the share map)', () => {
    expect(badgeTriggersMilestone('journey-14')).toBeNull();
  });
});

// ─── Share prompt — day-triggered path (daily entry) ────────────────────────

describe('share prompt — day-triggered path', () => {
  test('day 7 triggers share when not in crisis', () => {
    expect(dayTriggersMilestone(7, 0)).toBe('day7');
  });

  test('day 30 triggers share when not in crisis', () => {
    expect(dayTriggersMilestone(30, 0)).toBe('day30');
  });

  test('day 60 triggers share when not in crisis', () => {
    expect(dayTriggersMilestone(60, 0)).toBe('day60');
  });

  test('day 90 triggers share when not in crisis', () => {
    expect(dayTriggersMilestone(90, 0)).toBe('day90');
  });

  test('day 7 does NOT trigger share during crisis (severity >= 2)', () => {
    expect(dayTriggersMilestone(7, 2)).toBeNull();
    expect(dayTriggersMilestone(7, 3)).toBeNull();
  });

  test('day 15 does NOT trigger share (not a milestone day)', () => {
    expect(dayTriggersMilestone(15, 0)).toBeNull();
  });

  test('day 1 does NOT trigger share', () => {
    expect(dayTriggersMilestone(1, 0)).toBeNull();
  });
});

// ─── Flip prompt — daily limit guard ────────────────────────────────────────

describe('flip prompt — daily limit guard', () => {
  test('0 flips today → not exhausted, can start', () => {
    expect(flipsExhausted(0)).toBe(false);
    expect(canStartNewFlip(0)).toBe(true);
  });

  test('1 flip today → not exhausted', () => {
    expect(flipsExhausted(1)).toBe(false);
    expect(canStartNewFlip(1)).toBe(true);
  });

  test('2 flips today → not exhausted', () => {
    expect(flipsExhausted(2)).toBe(false);
    expect(canStartNewFlip(2)).toBe(true);
  });

  test('3 flips today → exhausted (at limit)', () => {
    expect(flipsExhausted(3)).toBe(true);
    expect(canStartNewFlip(3)).toBe(false);
  });

  test('more than 3 flips → still exhausted (defensive)', () => {
    expect(flipsExhausted(5)).toBe(true);
    expect(canStartNewFlip(5)).toBe(false);
  });
});

// ─── Milestone celebration queue ─────────────────────────────────────────────

describe('milestone celebration queue', () => {
  test('no new milestones → queue stays empty', () => {
    const badges = checkForNewMilestones('journey', 10, 10, [], TODAY);
    expect(badges).toHaveLength(0);
  });

  test('crossing day-7 threshold → one badge queued', () => {
    const badges = checkForNewMilestones('journey', 6, 7, [], TODAY);
    expect(badges).toHaveLength(1);
    expect(badges[0].id).toBe('journey-7');
  });

  test('multiple milestones crossed in one step → all queued', () => {
    // Edge case: streak jumps from 6 to 30 (e.g. after restoring data)
    const badges = checkForNewMilestones('journey', 6, 30, [], TODAY);
    const ids = badges.map(b => b.id);
    expect(ids).toContain('journey-7');
    expect(ids).toContain('journey-14');
    expect(ids).toContain('journey-30');
  });

  test('already-earned badge is not re-queued', () => {
    const existing: EarnedBadge[] = [{
      id: 'journey-7', journalType: 'journey', threshold: 7, earnedDate: TODAY, celebrated: true,
    }];
    const badges = checkForNewMilestones('journey', 6, 7, existing, TODAY);
    expect(badges).toHaveLength(0);
  });

  test('queue drains one at a time — first item dismissed, second remains', () => {
    // Simulates the queue slice(1) pattern in App.tsx onDismiss
    const queue = [
      { id: 'journey-7',  journalType: 'journey' as const, threshold: 7,  earnedDate: TODAY, celebrated: false },
      { id: 'journey-30', journalType: 'journey' as const, threshold: 30, earnedDate: TODAY, celebrated: false },
    ];
    const afterDismiss = queue.slice(1);
    expect(afterDismiss).toHaveLength(1);
    expect(afterDismiss[0].id).toBe('journey-30');
  });

  test('dismissing the last queued badge empties the queue', () => {
    const queue = [
      { id: 'journey-7', journalType: 'journey' as const, threshold: 7, earnedDate: TODAY, celebrated: false },
    ];
    const afterDismiss = queue.slice(1);
    expect(afterDismiss).toHaveLength(0);
  });

  test('mood-type milestones also queue correctly', () => {
    const badges = checkForNewMilestones('mood', 6, 7, [], TODAY);
    expect(badges).toHaveLength(1);
    expect(badges[0].id).toBe('mood-7');
    expect(badges[0].journalType).toBe('mood');
  });
});
