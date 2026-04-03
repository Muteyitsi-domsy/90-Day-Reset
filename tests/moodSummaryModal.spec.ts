/**
 * moodSummaryModal.spec.ts
 *
 * Regression tests for the mood summary modal trigger conditions.
 *
 * Bugs caught:
 * - Modal was firing on the welcome screen because the useEffect in App.tsx
 *   was missing an `appState === 'journal'` guard. Now tested here.
 * - `shouldShowMonthlySummary` and `shouldShowAnnualRecap` already-shown and
 *   no-entries guards are validated to prevent duplicate popups.
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { shouldShowMonthlySummary, shouldShowAnnualRecap } from '../utils/moodSummaryCalculations';
import { makeMoodEntry } from './helpers/factories';
import type { MoodSummaryState } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Mirror of the full guard used in App.tsx's mood summary useEffect. */
function shouldTriggerMoodSummaryCheck(params: {
  appState: string;
  isLoading: boolean;
  hasMoodEntries: boolean;
  hasUserProfile: boolean;
}): boolean {
  const { appState, isLoading, hasMoodEntries, hasUserProfile } = params;
  if (!hasUserProfile || !hasMoodEntries || isLoading || appState !== 'journal') return false;
  return true;
}

function setDate(isoString: string) {
  vi.setSystemTime(new Date(isoString));
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

// ─── AppState guard ──────────────────────────────────────────────────────────

describe('appState guard — modal only fires inside the journal', () => {
  test('fires when appState is "journal"', () => {
    expect(shouldTriggerMoodSummaryCheck({
      appState: 'journal', isLoading: false, hasMoodEntries: true, hasUserProfile: true,
    })).toBe(true);
  });

  test('does NOT fire on "welcome" screen', () => {
    expect(shouldTriggerMoodSummaryCheck({
      appState: 'welcome', isLoading: false, hasMoodEntries: true, hasUserProfile: true,
    })).toBe(false);
  });

  test('does NOT fire on "onboarding" screen', () => {
    expect(shouldTriggerMoodSummaryCheck({
      appState: 'onboarding', isLoading: false, hasMoodEntries: true, hasUserProfile: true,
    })).toBe(false);
  });

  test('does NOT fire while initial loading is in progress', () => {
    expect(shouldTriggerMoodSummaryCheck({
      appState: 'journal', isLoading: true, hasMoodEntries: true, hasUserProfile: true,
    })).toBe(false);
  });

  test('does NOT fire when there are no mood entries', () => {
    expect(shouldTriggerMoodSummaryCheck({
      appState: 'journal', isLoading: false, hasMoodEntries: false, hasUserProfile: true,
    })).toBe(false);
  });
});

// ─── shouldShowMonthlySummary ────────────────────────────────────────────────

describe('shouldShowMonthlySummary', () => {
  const noState: MoodSummaryState | undefined = undefined;

  test('day 1 of a month → shows previous month summary', () => {
    setDate('2026-03-01T10:00:00Z');
    const entry = makeMoodEntry({ date: '2026-02-15' });
    const result = shouldShowMonthlySummary(noState, [entry]);
    expect(result.shouldShow).toBe(true);
    expect(result.month).toBe(1); // February = index 1
    expect(result.year).toBe(2026);
  });

  test('day 7 of a month → still shows (within the 7-day window)', () => {
    setDate('2026-03-07T10:00:00Z');
    const entry = makeMoodEntry({ date: '2026-02-15' });
    expect(shouldShowMonthlySummary(noState, [entry]).shouldShow).toBe(true);
  });

  test('day 8 of a month → window closed, does not show', () => {
    setDate('2026-03-08T10:00:00Z');
    const entry = makeMoodEntry({ date: '2026-02-15' });
    expect(shouldShowMonthlySummary(noState, [entry]).shouldShow).toBe(false);
  });

  test('already shown for this month → does not show again', () => {
    setDate('2026-03-02T10:00:00Z');
    const entry = makeMoodEntry({ date: '2026-02-15' });
    const state: MoodSummaryState = {
      lastMonthlySummaryShown: '2026-02',
      monthlySummaryDownloaded: false,
      lastAnnualSummaryShown: null,
      annualSummaryDownloaded: false,
    };
    expect(shouldShowMonthlySummary(state, [entry]).shouldShow).toBe(false);
  });

  test('no entries for target month → does not show', () => {
    setDate('2026-03-02T10:00:00Z');
    // Entry is for March, not February
    const entry = makeMoodEntry({ date: '2026-03-01' });
    expect(shouldShowMonthlySummary(noState, [entry]).shouldShow).toBe(false);
  });

  test('January 1st wraps correctly to December of previous year', () => {
    setDate('2026-01-01T10:00:00Z');
    const entry = makeMoodEntry({ date: '2025-12-15' });
    const result = shouldShowMonthlySummary(noState, [entry]);
    expect(result.shouldShow).toBe(true);
    expect(result.month).toBe(11); // December = index 11
    expect(result.year).toBe(2025);
  });

  test('December 30 triggers November summary', () => {
    setDate('2026-12-30T10:00:00Z');
    const entry = makeMoodEntry({ date: '2026-11-10' });
    const result = shouldShowMonthlySummary(noState, [entry]);
    expect(result.shouldShow).toBe(true);
    expect(result.month).toBe(10); // November = index 10
  });
});

// ─── shouldShowAnnualRecap ───────────────────────────────────────────────────

describe('shouldShowAnnualRecap', () => {
  const noState: MoodSummaryState | undefined = undefined;

  test('Dec 31 → shows current year recap', () => {
    setDate('2025-12-31T10:00:00Z');
    const entry = makeMoodEntry({ date: '2025-06-01' });
    const result = shouldShowAnnualRecap(noState, [entry]);
    expect(result.shouldShow).toBe(true);
    expect(result.year).toBe(2025);
    expect(result.isWithinDownloadWindow).toBe(true);
  });

  test('Jan 1 → shows previous year recap', () => {
    setDate('2026-01-01T10:00:00Z');
    const entry = makeMoodEntry({ date: '2025-06-01' });
    const result = shouldShowAnnualRecap(noState, [entry]);
    expect(result.shouldShow).toBe(true);
    expect(result.year).toBe(2025);
  });

  test('Jan 6 → still within window', () => {
    setDate('2026-01-06T10:00:00Z');
    const entry = makeMoodEntry({ date: '2025-06-01' });
    expect(shouldShowAnnualRecap(noState, [entry]).shouldShow).toBe(true);
  });

  test('Jan 7 → window is closed, does not show', () => {
    setDate('2026-01-07T10:00:00Z');
    const entry = makeMoodEntry({ date: '2025-06-01' });
    expect(shouldShowAnnualRecap(noState, [entry]).shouldShow).toBe(false);
  });

  test('mid-year date → does not show', () => {
    setDate('2026-06-15T10:00:00Z');
    const entry = makeMoodEntry({ date: '2025-06-01' });
    expect(shouldShowAnnualRecap(noState, [entry]).shouldShow).toBe(false);
  });

  test('already shown for this year → does not show again', () => {
    setDate('2026-01-02T10:00:00Z');
    const entry = makeMoodEntry({ date: '2025-06-01' });
    const state: MoodSummaryState = {
      lastMonthlySummaryShown: null,
      monthlySummaryDownloaded: false,
      lastAnnualSummaryShown: 2025,
      annualSummaryDownloaded: false,
    };
    expect(shouldShowAnnualRecap(state, [entry]).shouldShow).toBe(false);
  });

  test('no entries for target year → does not show', () => {
    setDate('2026-01-02T10:00:00Z');
    // Entry is from 2026, not 2025
    const entry = makeMoodEntry({ date: '2026-01-01' });
    expect(shouldShowAnnualRecap(noState, [entry]).shouldShow).toBe(false);
  });
});
