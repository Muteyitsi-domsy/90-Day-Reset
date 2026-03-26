/**
 * Tests for pause/resume profile transformation logic.
 *
 * The pure transformation functions below mirror the exact logic in
 * App.tsx handlePauseJourney / handleResumeJourney (minus React state
 * and window.confirm). If those handlers change, these tests must
 * be updated — that's intentional: they act as a change-detector.
 *
 * Also covers:
 *   - Subscription-lapse auto-pause (mirrors the initSubscription effect)
 *   - Subscription-restore auto-unpause (same effect)
 *   - Grace period end-date and countdown calculation
 */

import { describe, test, expect } from 'vitest';
import { getDayAndMonth } from '../services/geminiService';
import { calculateUpdatedStreak } from '../services/streakService';
import type { UserProfile, SubscriptionStatus, SubscriptionTier } from '../types';
import { makeProfile, startDateForDay } from './helpers/factories';

// ─── Mirrors App.tsx handlePauseJourney (pure transform) ──────────────────

function applyPause(profile: UserProfile, now: Date): UserProfile {
  return { ...profile, isPaused: true, pausedDate: now.toISOString(), pauseReason: 'user' };
}

// ─── Mirrors App.tsx handleResumeJourney (pure transform) ─────────────────

function applyResume(profile: UserProfile, resumedAt: Date): UserProfile {
  if (!profile.isPaused || !profile.pausedDate) return profile;

  const pausedAt = new Date(profile.pausedDate);
  const pausedDuration = resumedAt.getTime() - pausedAt.getTime();

  const newStartDate = new Date(
    new Date(profile.startDate).getTime() + pausedDuration
  ).toISOString();

  const oldLastEntry = profile.lastEntryDate ? new Date(profile.lastEntryDate) : null;
  const newLastEntryDate = oldLastEntry
    ? new Date(oldLastEntry.getTime() + pausedDuration).toISOString()
    : profile.lastEntryDate;

  return {
    ...profile,
    isPaused: false,
    pausedDate: undefined,
    pauseReason: undefined,
    startDate: newStartDate,
    lastEntryDate: newLastEntryDate,
  };
}

// ─── Mirrors App.tsx initSubscription auto-pause (pure transform) ──────────
// Applies the subscription-lapse branch: sets isPaused + pauseReason:'subscription_lapsed'.
// Returns the profile unchanged when the guard conditions are not met.

function applySubscriptionLapsePause(
  profile: UserProfile | null,
  subStatus: SubscriptionStatus,
  subTier: SubscriptionTier,
  now: Date
): UserProfile | null {
  const shouldPause =
    subStatus === 'expired' &&
    subTier !== 'journey90' &&
    subTier !== 'free' &&
    subTier !== 'beta';

  if (!shouldPause) return profile;
  if (!profile) return profile;
  if (profile.isPaused) return profile;
  if (profile.journeyCompleted) return profile;
  if (!profile.startDate) return profile;

  return {
    ...profile,
    isPaused: true,
    pausedDate: now.toISOString(),
    pauseReason: 'subscription_lapsed',
  };
}

// ─── Mirrors App.tsx initSubscription auto-unpause (pure transform) ────────
// Applies the subscription-restore branch: resumes only if pauseReason is
// 'subscription_lapsed'. User-initiated pauses are left untouched.

function applySubscriptionRestoreResume(
  profile: UserProfile | null,
  isActive: boolean,
  subStatus: SubscriptionStatus,
  resumedAt: Date
): UserProfile | null {
  if (!profile) return profile;
  if (!isActive || subStatus === 'grace_period') return profile;
  if (!profile.isPaused || profile.pauseReason !== 'subscription_lapsed') return profile;

  const pausedAt = profile.pausedDate ? new Date(profile.pausedDate) : resumedAt;
  const pausedMs = resumedAt.getTime() - pausedAt.getTime();
  const newStartDate = new Date(new Date(profile.startDate).getTime() + pausedMs).toISOString();
  const newLastEntry = profile.lastEntryDate
    ? new Date(new Date(profile.lastEntryDate).getTime() + pausedMs).toISOString()
    : profile.lastEntryDate;

  return {
    ...profile,
    isPaused: false,
    pausedDate: undefined,
    pauseReason: undefined,
    startDate: newStartDate,
    lastEntryDate: newLastEntry,
  };
}

// ─── Mirrors subscriptionService.ts grace period end-date calculation ──────

function calcGracePeriodEndDate(billingIssueAt: Date, platform: 'ios' | 'android'): Date {
  const graceDays = platform === 'ios' ? 3 : 7;
  const end = new Date(billingIssueAt);
  end.setDate(end.getDate() + graceDays);
  return end;
}

// ─── Mirrors GracePeriodBanner.tsx daysLeft calculation ───────────────────

function calcGracePeriodDaysLeft(gracePeriodEndDate: Date, now: Date): number {
  const diff = gracePeriodEndDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const DAYS_MS = (n: number) => n * 24 * 60 * 60 * 1000;

// Fixed anchor dates — all at noon UTC to stay unambiguous across timezones
const T_START  = new Date('2026-01-01T12:00:00.000Z'); // journey start
const T_PAUSE  = new Date('2026-01-15T12:00:00.000Z'); // paused on day 15
const T_RESUME = new Date('2026-01-22T12:00:00.000Z'); // resumed 7 days later

describe('Pause logic', () => {

  test('isPaused is set to true', () => {
    const p = applyPause(makeProfile(), T_PAUSE);
    expect(p.isPaused).toBe(true);
  });

  test('pausedDate is recorded correctly', () => {
    const p = applyPause(makeProfile(), T_PAUSE);
    expect(p.pausedDate).toBe(T_PAUSE.toISOString());
  });

  test('pauseReason is set to user for manual pause', () => {
    const p = applyPause(makeProfile(), T_PAUSE);
    expect(p.pauseReason).toBe('user');
  });

  test('startDate is unchanged after pause', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });
    const p = applyPause(profile, T_PAUSE);
    expect(p.startDate).toBe(T_START.toISOString());
  });

  test('streak values are NOT modified by pause', () => {
    const profile = makeProfile({ streak: 14, moodStreak: 7, flipStreak: 3, overallStreak: 20 });
    const p = applyPause(profile, T_PAUSE);
    expect(p.streak).toBe(14);
    expect(p.moodStreak).toBe(7);
    expect(p.flipStreak).toBe(3);
    expect(p.overallStreak).toBe(20);
  });
});

describe('Resume logic', () => {

  test('isPaused is cleared to false', () => {
    const paused = applyPause(makeProfile({ startDate: T_START.toISOString() }), T_PAUSE);
    const r = applyResume(paused, T_RESUME);
    expect(r.isPaused).toBe(false);
  });

  test('pausedDate is cleared to undefined', () => {
    const paused = applyPause(makeProfile({ startDate: T_START.toISOString() }), T_PAUSE);
    const r = applyResume(paused, T_RESUME);
    expect(r.pausedDate).toBeUndefined();
  });

  test('pauseReason is cleared to undefined on resume', () => {
    const paused = applyPause(makeProfile({ startDate: T_START.toISOString() }), T_PAUSE);
    const r = applyResume(paused, T_RESUME);
    expect(r.pauseReason).toBeUndefined();
  });

  test('startDate is shifted forward by the exact pause duration', () => {
    const paused = applyPause(makeProfile({ startDate: T_START.toISOString() }), T_PAUSE);
    const r = applyResume(paused, T_RESUME);

    const shiftedBy = new Date(r.startDate).getTime() - T_START.getTime();
    const pauseDuration = T_RESUME.getTime() - T_PAUSE.getTime(); // 7 days

    expect(shiftedBy).toBe(pauseDuration);
  });

  test('lastEntryDate is shifted forward by the exact pause duration', () => {
    const lastEntry = new Date('2026-01-14T12:00:00.000Z');
    const paused = applyPause(
      makeProfile({ startDate: T_START.toISOString(), lastEntryDate: lastEntry.toISOString() }),
      T_PAUSE
    );
    const r = applyResume(paused, T_RESUME);

    const shiftedBy = new Date(r.lastEntryDate!).getTime() - lastEntry.getTime();
    const pauseDuration = T_RESUME.getTime() - T_PAUSE.getTime();
    expect(shiftedBy).toBe(pauseDuration);
  });

  test('empty lastEntryDate is left unchanged (no crash)', () => {
    const paused = applyPause(makeProfile({ lastEntryDate: '' }), T_PAUSE);
    const r = applyResume(paused, T_RESUME);
    expect(r.lastEntryDate).toBe('');
  });

  test('streak values are NOT modified by resume', () => {
    const profile = makeProfile({
      startDate: T_START.toISOString(),
      streak: 14, moodStreak: 8, flipStreak: 2, overallStreak: 22,
    });
    const paused = applyPause(profile, T_PAUSE);
    const r = applyResume(paused, T_RESUME);
    expect(r.streak).toBe(14);
    expect(r.moodStreak).toBe(8);
    expect(r.flipStreak).toBe(2);
    expect(r.overallStreak).toBe(22);
  });

  test('resume on a non-paused profile is a no-op', () => {
    const profile = makeProfile({ isPaused: false });
    const result = applyResume(profile, T_RESUME);
    expect(result).toEqual(profile);
  });
});

describe('Pause/Resume — journey day preservation', () => {

  test('user is on the same journey day immediately after resuming', () => {
    // User starts journey 20 days ago → they're on day 21
    const profile = makeProfile({ startDate: startDateForDay(21) });
    const { day: dayBefore } = getDayAndMonth(profile.startDate);
    expect(dayBefore).toBe(21);

    // Pause now, resume 10 days later
    const pauseNow = new Date();
    const resumeLater = new Date(pauseNow.getTime() + DAYS_MS(10));
    const resumed = applyResume(applyPause(profile, pauseNow), resumeLater);

    // Immediately after resuming the clock is at resumeLater.
    // getDayAndMonth normalises both dates to midnight before diffing, so we
    // must do the same here — otherwise sub-day time differences (e.g. pauseNow
    // being after noon while startDate was set to noon) cause Math.ceil to round up.
    const fakeTodayAfterResume = new Date(resumeLater);
    fakeTodayAfterResume.setHours(0, 0, 0, 0);
    const resumedStart = new Date(resumed.startDate);
    resumedStart.setHours(0, 0, 0, 0);
    const elapsed = Math.ceil(
      Math.max(0, fakeTodayAfterResume.getTime() - resumedStart.getTime()) /
      (1000 * 60 * 60 * 24)
    ) + 1;
    // Should still be day 21 (the start date shifted exactly 10 days forward)
    expect(elapsed).toBe(21);
  });
});

describe('Pause/Resume — streak continuity', () => {

  test('streak increments normally on first entry after resume', () => {
    // User was on streak 5, last entry on 2026-01-14.
    // They pause on 2026-01-15, resume on 2026-01-22.
    // After resume, lastEntryDate shifts to 2026-01-21 (14 + 7 days offset).
    // User enters on 2026-01-22 → consecutive day → streak becomes 6.
    const lastEntry = new Date('2026-01-14T12:00:00.000Z');
    const pauseTime = new Date('2026-01-15T12:00:00.000Z');
    const resumeTime = new Date('2026-01-22T12:00:00.000Z'); // +7 days
    const profile = makeProfile({ streak: 5, lastEntryDate: lastEntry.toISOString() });
    const resumed = applyResume(applyPause(profile, pauseTime), resumeTime);

    // Shifted lastEntryDate should be 2026-01-21
    const shiftedDate = new Date(resumed.lastEntryDate!);
    expect(shiftedDate.toISOString().startsWith('2026-01-21')).toBe(true);

    // Entry on 2026-01-22 (one day after shifted lastEntryDate) → streak 6
    const { newStreak } = calculateUpdatedStreak(resumed.streak, resumed.lastEntryDate, '2026-01-22');
    expect(newStreak).toBe(6);
  });

  test('missing an entry on resume day does not incorrectly break streak', () => {
    // Streak of 8. Paused, resumed. If user does NOT enter on resume day,
    // the streak number itself is still 8 (unchanged). It will break only
    // when they skip a calendar day after resuming.
    const profile = makeProfile({ streak: 8, lastEntryDate: '2026-01-10T12:00:00.000Z' });
    const paused = applyPause(profile, new Date('2026-01-11T12:00:00.000Z'));
    const resumed = applyResume(paused, new Date('2026-01-18T12:00:00.000Z'));
    expect(resumed.streak).toBe(8); // unchanged until user enters
  });

  test('multiple pause/resume cycles accumulate correctly', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });

    // First pause: 5 days
    const p1Time = new Date('2026-01-10T12:00:00.000Z');
    const r1Time = new Date('2026-01-15T12:00:00.000Z');
    // Second pause: 3 days
    const p2Time = new Date('2026-01-20T12:00:00.000Z');
    const r2Time = new Date('2026-01-23T12:00:00.000Z');

    const afterCycle = applyResume(
      applyPause(
        applyResume(applyPause(profile, p1Time), r1Time),
        p2Time
      ),
      r2Time
    );

    expect(afterCycle.isPaused).toBe(false);
    expect(afterCycle.pausedDate).toBeUndefined();

    // startDate should be shifted by 5+3 = 8 days total
    const totalShift = new Date(afterCycle.startDate).getTime() - T_START.getTime();
    expect(totalShift).toBe(DAYS_MS(8));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Subscription-lapse auto-pause
// ═══════════════════════════════════════════════════════════════════════════

describe('Subscription lapse — auto-pause', () => {

  test('monthly subscription lapse pauses an active journey', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });
    const result = applySubscriptionLapsePause(profile, 'expired', 'monthly', T_PAUSE);
    expect(result?.isPaused).toBe(true);
    expect(result?.pauseReason).toBe('subscription_lapsed');
    expect(result?.pausedDate).toBe(T_PAUSE.toISOString());
  });

  test('yearly subscription lapse pauses an active journey', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });
    const result = applySubscriptionLapsePause(profile, 'expired', 'yearly', T_PAUSE);
    expect(result?.isPaused).toBe(true);
    expect(result?.pauseReason).toBe('subscription_lapsed');
  });

  test('journey90 lapse does NOT auto-pause (one-time plan completes fully)', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });
    const result = applySubscriptionLapsePause(profile, 'expired', 'journey90', T_PAUSE);
    expect(result?.isPaused).toBeFalsy();
  });

  test('free tier status change does NOT auto-pause', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });
    const result = applySubscriptionLapsePause(profile, 'expired', 'free', T_PAUSE);
    expect(result?.isPaused).toBeFalsy();
  });

  test('beta expiry does NOT auto-pause', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });
    const result = applySubscriptionLapsePause(profile, 'expired', 'beta', T_PAUSE);
    expect(result?.isPaused).toBeFalsy();
  });

  test('active status does NOT trigger auto-pause', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });
    const result = applySubscriptionLapsePause(profile, 'active', 'monthly', T_PAUSE);
    expect(result?.isPaused).toBeFalsy();
  });

  test('grace_period status does NOT trigger auto-pause (still active)', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });
    const result = applySubscriptionLapsePause(profile, 'grace_period', 'monthly', T_PAUSE);
    expect(result?.isPaused).toBeFalsy();
  });

  test('already-paused journey is not double-paused', () => {
    const profile = makeProfile({
      startDate: T_START.toISOString(),
      isPaused: true,
      pausedDate: T_PAUSE.toISOString(),
      pauseReason: 'user',
    });
    const result = applySubscriptionLapsePause(profile, 'expired', 'monthly', T_RESUME);
    // Should remain unchanged (original pausedDate, original pauseReason)
    expect(result?.pausedDate).toBe(T_PAUSE.toISOString());
    expect(result?.pauseReason).toBe('user');
  });

  test('completed journey is not auto-paused', () => {
    const profile = makeProfile({ startDate: T_START.toISOString(), journeyCompleted: true });
    const result = applySubscriptionLapsePause(profile, 'expired', 'monthly', T_PAUSE);
    expect(result?.isPaused).toBeFalsy();
  });

  test('profile with no startDate is not auto-paused', () => {
    const profile = makeProfile({ startDate: '' });
    const result = applySubscriptionLapsePause(profile, 'expired', 'monthly', T_PAUSE);
    expect(result?.isPaused).toBeFalsy();
  });

  test('null profile returns null', () => {
    const result = applySubscriptionLapsePause(null, 'expired', 'monthly', T_PAUSE);
    expect(result).toBeNull();
  });

  test('startDate is unchanged after auto-pause', () => {
    const profile = makeProfile({ startDate: T_START.toISOString() });
    const result = applySubscriptionLapsePause(profile, 'expired', 'monthly', T_PAUSE);
    expect(result?.startDate).toBe(T_START.toISOString());
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Subscription restore — auto-unpause
// ═══════════════════════════════════════════════════════════════════════════

describe('Subscription restore — auto-unpause', () => {

  test('subscription_lapsed journey is unpaused when subscription becomes active', () => {
    const profile = makeProfile({
      startDate: T_START.toISOString(),
      isPaused: true,
      pausedDate: T_PAUSE.toISOString(),
      pauseReason: 'subscription_lapsed',
    });
    const result = applySubscriptionRestoreResume(profile, true, 'active', T_RESUME);
    expect(result?.isPaused).toBe(false);
    expect(result?.pausedDate).toBeUndefined();
    expect(result?.pauseReason).toBeUndefined();
  });

  test('startDate is shifted forward by the paused duration on restore', () => {
    const profile = makeProfile({
      startDate: T_START.toISOString(),
      isPaused: true,
      pausedDate: T_PAUSE.toISOString(),
      pauseReason: 'subscription_lapsed',
    });
    const result = applySubscriptionRestoreResume(profile, true, 'active', T_RESUME);
    const expectedShift = T_RESUME.getTime() - T_PAUSE.getTime(); // 7 days
    const actualShift = new Date(result!.startDate).getTime() - T_START.getTime();
    expect(actualShift).toBe(expectedShift);
  });

  test('lastEntryDate is shifted forward by the paused duration on restore', () => {
    const lastEntry = new Date('2026-01-14T12:00:00.000Z');
    const profile = makeProfile({
      startDate: T_START.toISOString(),
      lastEntryDate: lastEntry.toISOString(),
      isPaused: true,
      pausedDate: T_PAUSE.toISOString(),
      pauseReason: 'subscription_lapsed',
    });
    const result = applySubscriptionRestoreResume(profile, true, 'active', T_RESUME);
    const expectedShift = T_RESUME.getTime() - T_PAUSE.getTime();
    const actualShift = new Date(result!.lastEntryDate!).getTime() - lastEntry.getTime();
    expect(actualShift).toBe(expectedShift);
  });

  test('user-paused journey is NOT auto-unpaused when subscription restores', () => {
    const profile = makeProfile({
      startDate: T_START.toISOString(),
      isPaused: true,
      pausedDate: T_PAUSE.toISOString(),
      pauseReason: 'user',
    });
    const result = applySubscriptionRestoreResume(profile, true, 'active', T_RESUME);
    // Must stay paused — user chose this, not subscription system
    expect(result?.isPaused).toBe(true);
    expect(result?.pauseReason).toBe('user');
  });

  test('pause with no pauseReason (legacy) is NOT auto-unpaused', () => {
    const profile = makeProfile({
      startDate: T_START.toISOString(),
      isPaused: true,
      pausedDate: T_PAUSE.toISOString(),
      // pauseReason intentionally absent
    });
    const result = applySubscriptionRestoreResume(profile, true, 'active', T_RESUME);
    expect(result?.isPaused).toBe(true);
  });

  test('grace_period restoration does NOT trigger auto-unpause', () => {
    const profile = makeProfile({
      startDate: T_START.toISOString(),
      isPaused: true,
      pausedDate: T_PAUSE.toISOString(),
      pauseReason: 'subscription_lapsed',
    });
    const result = applySubscriptionRestoreResume(profile, true, 'grace_period', T_RESUME);
    expect(result?.isPaused).toBe(true);
  });

  test('isActive:false does NOT trigger auto-unpause', () => {
    const profile = makeProfile({
      startDate: T_START.toISOString(),
      isPaused: true,
      pausedDate: T_PAUSE.toISOString(),
      pauseReason: 'subscription_lapsed',
    });
    const result = applySubscriptionRestoreResume(profile, false, 'expired', T_RESUME);
    expect(result?.isPaused).toBe(true);
  });

  test('null profile returns null', () => {
    const result = applySubscriptionRestoreResume(null, true, 'active', T_RESUME);
    expect(result).toBeNull();
  });

  test('journey day is preserved after auto-unpause (same as manual resume)', () => {
    // User was on day 30 when they lapsed. After 7-day billing gap, they restore.
    // They should still be on day 30, not day 37.
    const profile = makeProfile({ startDate: startDateForDay(30) });
    const { day: dayBefore } = getDayAndMonth(profile.startDate);
    expect(dayBefore).toBe(30);

    const pauseNow = new Date();
    const pausedProfile = { ...profile, isPaused: true, pausedDate: pauseNow.toISOString(), pauseReason: 'subscription_lapsed' as const };

    const resumeDate = new Date(pauseNow.getTime() + DAYS_MS(7));
    const result = applySubscriptionRestoreResume(pausedProfile, true, 'active', resumeDate)!;

    const fakeToday = new Date(resumeDate);
    fakeToday.setHours(0, 0, 0, 0);
    const newStart = new Date(result.startDate);
    newStart.setHours(0, 0, 0, 0);
    const dayAfter = Math.ceil(Math.max(0, fakeToday.getTime() - newStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    expect(dayAfter).toBe(30);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Grace period end-date and countdown calculation
// ═══════════════════════════════════════════════════════════════════════════

describe('Grace period — end-date calculation', () => {

  const BILLING_ISSUE = new Date('2026-03-20T12:00:00.000Z');

  test('iOS grace period ends 3 days after billing issue', () => {
    const end = calcGracePeriodEndDate(BILLING_ISSUE, 'ios');
    const expected = new Date('2026-03-23T12:00:00.000Z');
    expect(end.getTime()).toBe(expected.getTime());
  });

  test('Android grace period ends 7 days after billing issue', () => {
    const end = calcGracePeriodEndDate(BILLING_ISSUE, 'android');
    const expected = new Date('2026-03-27T12:00:00.000Z');
    expect(end.getTime()).toBe(expected.getTime());
  });
});

describe('Grace period — countdown (daysLeft)', () => {

  test('returns correct days remaining when well within grace period', () => {
    const end = new Date('2026-03-27T12:00:00.000Z');
    const now = new Date('2026-03-24T12:00:00.000Z'); // 3 days before end
    expect(calcGracePeriodDaysLeft(end, now)).toBe(3);
  });

  test('returns 1 on the last day', () => {
    const end = new Date('2026-03-27T12:00:00.000Z');
    const now = new Date('2026-03-27T06:00:00.000Z'); // same day, earlier
    expect(calcGracePeriodDaysLeft(end, now)).toBe(1);
  });

  test('returns 0 when grace period has already ended', () => {
    const end = new Date('2026-03-27T12:00:00.000Z');
    const now = new Date('2026-03-28T12:00:00.000Z'); // 1 day past end
    expect(calcGracePeriodDaysLeft(end, now)).toBe(0);
  });

  test('never returns a negative value', () => {
    const end = new Date('2026-03-20T12:00:00.000Z');
    const now = new Date('2026-04-01T12:00:00.000Z'); // 12 days past end
    expect(calcGracePeriodDaysLeft(end, now)).toBe(0);
  });

  test('iOS: 3-day window gives correct countdown from day 1', () => {
    const billingIssue = new Date('2026-03-20T12:00:00.000Z');
    const end = calcGracePeriodEndDate(billingIssue, 'ios');
    const now = new Date('2026-03-20T18:00:00.000Z'); // same day as issue, 6h later
    expect(calcGracePeriodDaysLeft(end, now)).toBe(3);
  });

  test('Android: 7-day window gives correct countdown from day 1', () => {
    const billingIssue = new Date('2026-03-20T12:00:00.000Z');
    const end = calcGracePeriodEndDate(billingIssue, 'android');
    const now = new Date('2026-03-20T18:00:00.000Z');
    expect(calcGracePeriodDaysLeft(end, now)).toBe(7);
  });
});
