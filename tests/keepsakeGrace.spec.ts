/**
 * keepsakeGrace.spec.ts
 *
 * Tests for the journey90 keepsake grace period logic.
 *
 * Rules:
 * - journey90 users get 7 days after journeyCompletedDate to download their keepsake
 * - Grace banner shows only when: tier=journey90, status=expired, journeyCompleted=true,
 *   and now < journeyCompletedDate + 7 days
 * - journey90 expired users must NOT be redirected out of the journey view
 */

import { describe, test, expect } from 'vitest';

const GRACE_DAYS = 7;

// Mirrors the keepsakeGraceEndDate useMemo in App.tsx
function calcKeepsakeGraceEndDate(params: {
  tier: string;
  status: string;
  journeyCompleted: boolean;
  journeyCompletedDate: string | null;
  now?: Date;
}): string | null {
  const { tier, status, journeyCompleted, journeyCompletedDate, now = new Date() } = params;
  if (tier !== 'journey90') return null;
  if (status !== 'expired') return null;
  if (!journeyCompleted || !journeyCompletedDate) return null;
  const end = new Date(journeyCompletedDate);
  end.setDate(end.getDate() + GRACE_DAYS);
  if (end <= now) return null;
  return end.toISOString();
}

// Mirrors the daysLeft calculation in KeepsakeGraceBanner.tsx
function calcDaysLeft(graceEndDate: string, now: Date): number {
  const end = new Date(graceEndDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// Mirrors the view redirect logic in App.tsx for journey90 expired users
function applyViewRedirect(params: {
  isActive: boolean;
  tier: string;
  currentView: string;
}): string {
  const { isActive, tier, currentView } = params;
  if (isActive) return currentView;
  if (currentView === 'flip') return 'mood';
  if (currentView === 'journey' && tier !== 'journey90') return 'mood';
  return currentView;
}

const COMPLETED_DATE = new Date('2026-03-25T10:00:00.000Z');
const WITHIN_GRACE = new Date('2026-03-28T10:00:00.000Z'); // 3 days after completion
const LAST_DAY = new Date('2026-04-01T00:00:01.000Z');     // just inside 7-day window
const AFTER_GRACE = new Date('2026-04-02T10:00:00.000Z');  // 8 days after, window closed

describe('Keepsake grace period — activation', () => {
  test('returns grace end date for expired journey90 user who completed journey', () => {
    const result = calcKeepsakeGraceEndDate({
      tier: 'journey90',
      status: 'expired',
      journeyCompleted: true,
      journeyCompletedDate: COMPLETED_DATE.toISOString(),
      now: WITHIN_GRACE,
    });
    expect(result).not.toBeNull();
    const end = new Date(result!);
    const expected = new Date(COMPLETED_DATE);
    expected.setDate(expected.getDate() + 7);
    expect(end.toISOString()).toBe(expected.toISOString());
  });

  test('returns null for monthly expired user — grace only for journey90', () => {
    const result = calcKeepsakeGraceEndDate({
      tier: 'monthly',
      status: 'expired',
      journeyCompleted: true,
      journeyCompletedDate: COMPLETED_DATE.toISOString(),
      now: WITHIN_GRACE,
    });
    expect(result).toBeNull();
  });

  test('returns null when journey90 subscription is still active', () => {
    const result = calcKeepsakeGraceEndDate({
      tier: 'journey90',
      status: 'active',
      journeyCompleted: true,
      journeyCompletedDate: COMPLETED_DATE.toISOString(),
      now: WITHIN_GRACE,
    });
    expect(result).toBeNull();
  });

  test('returns null when journey not yet completed', () => {
    const result = calcKeepsakeGraceEndDate({
      tier: 'journey90',
      status: 'expired',
      journeyCompleted: false,
      journeyCompletedDate: null,
      now: WITHIN_GRACE,
    });
    expect(result).toBeNull();
  });

  test('returns null when grace window has already closed', () => {
    const result = calcKeepsakeGraceEndDate({
      tier: 'journey90',
      status: 'expired',
      journeyCompleted: true,
      journeyCompletedDate: COMPLETED_DATE.toISOString(),
      now: AFTER_GRACE,
    });
    expect(result).toBeNull();
  });
});

describe('Keepsake grace period — countdown', () => {
  test('returns correct days left within grace window', () => {
    const graceEnd = new Date(COMPLETED_DATE);
    graceEnd.setDate(graceEnd.getDate() + 7);
    const daysLeft = calcDaysLeft(graceEnd.toISOString(), WITHIN_GRACE);
    expect(daysLeft).toBe(4); // 7 - 3 = 4 days remaining
  });

  test('returns 1 on the last day', () => {
    const graceEnd = new Date(COMPLETED_DATE);
    graceEnd.setDate(graceEnd.getDate() + 7);
    const daysLeft = calcDaysLeft(graceEnd.toISOString(), LAST_DAY);
    expect(daysLeft).toBe(1);
  });

  test('returns 0 when grace period has ended', () => {
    const graceEnd = new Date(COMPLETED_DATE);
    graceEnd.setDate(graceEnd.getDate() + 7);
    const daysLeft = calcDaysLeft(graceEnd.toISOString(), AFTER_GRACE);
    expect(daysLeft).toBe(0);
  });

  test('grace window is exactly 7 days', () => {
    const graceEnd = calcKeepsakeGraceEndDate({
      tier: 'journey90',
      status: 'expired',
      journeyCompleted: true,
      journeyCompletedDate: COMPLETED_DATE.toISOString(),
      now: WITHIN_GRACE,
    });
    const end = new Date(graceEnd!);
    const start = new Date(COMPLETED_DATE);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(7);
  });
});

describe('View redirect — journey90 expired users stay in journey view', () => {
  test('journey90 expired: journey view is NOT redirected to mood', () => {
    const result = applyViewRedirect({ isActive: false, tier: 'journey90', currentView: 'journey' });
    expect(result).toBe('journey');
  });

  test('journey90 expired: flip view IS redirected to mood', () => {
    const result = applyViewRedirect({ isActive: false, tier: 'journey90', currentView: 'flip' });
    expect(result).toBe('mood');
  });

  test('monthly expired: journey view IS redirected to mood', () => {
    const result = applyViewRedirect({ isActive: false, tier: 'monthly', currentView: 'journey' });
    expect(result).toBe('mood');
  });

  test('active subscription: view is never redirected', () => {
    const result = applyViewRedirect({ isActive: true, tier: 'journey90', currentView: 'journey' });
    expect(result).toBe('journey');
  });

  test('journey90 expired: mood view stays as mood', () => {
    const result = applyViewRedirect({ isActive: false, tier: 'journey90', currentView: 'mood' });
    expect(result).toBe('mood');
  });
});
