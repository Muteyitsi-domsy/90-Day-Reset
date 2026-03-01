/**
 * Tests for pause/resume profile transformation logic.
 *
 * The pure transformation functions below mirror the exact logic in
 * App.tsx handlePauseJourney / handleResumeJourney (minus React state
 * and window.confirm). If those handlers change, these tests must
 * be updated — that's intentional: they act as a change-detector.
 */

import { describe, test, expect } from 'vitest';
import { getDayAndMonth } from '../services/geminiService';
import { calculateUpdatedStreak } from '../services/streakService';
import type { UserProfile } from '../types';
import { makeProfile, startDateForDay } from './helpers/factories';

// ─── Mirrors App.tsx handlePauseJourney (pure transform) ──────────────────

function applyPause(profile: UserProfile, now: Date): UserProfile {
  return { ...profile, isPaused: true, pausedDate: now.toISOString() };
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
    startDate: newStartDate,
    lastEntryDate: newLastEntryDate,
  };
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
    // getDayAndMonth uses real Date.now(), which is still "today" from
    // the test's perspective. But the startDate shifted 10 days forward,
    // so if we compute getDayAndMonth from the resumed start date using
    // the same "today" we used before + 10 days:
    const fakeTodayAfterResume = resumeLater;
    const elapsed = Math.ceil(
      Math.max(0, fakeTodayAfterResume.getTime() - new Date(resumed.startDate).getTime()) /
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
