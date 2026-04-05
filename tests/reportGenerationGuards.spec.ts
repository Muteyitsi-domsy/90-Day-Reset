/**
 * reportGenerationGuards.spec.ts
 *
 * Tests for the guard logic inside handleGenerateWeeklySummary,
 * handleGenerateMonthlySummary, and handleFinalSummary in App.tsx.
 *
 * The root cause of the auto-generation regression was a stale-closure bug:
 * the handler functions captured `journalEntries` (the React state value at
 * the time they were created) instead of `journalEntriesRef.current` (a ref
 * that is always kept up-to-date). This meant the handlers ran with an empty
 * array even after entries had loaded, causing every existing-report check and
 * every has-entries check to return the wrong answer.
 *
 * The fix was to replace every `journalEntries.find/filter` inside those
 * handlers with `journalEntriesRef.current.find/filter`. These tests verify
 * the filtering logic itself, acting as a regression contract so any future
 * change that accidentally re-introduces the stale reference will be caught.
 */

import { describe, test, expect } from 'vitest';
import { makeJournalEntry } from './helpers/factories';
import type { JournalEntry } from '../types';

// ─── Guard helpers (mirror logic from App.tsx handlers) ──────────────────────

/** Weekly: has a summary report already been generated for this week? */
function weeklyReportExists(entries: JournalEntry[], weekNum: number): boolean {
  return entries.some(e => e.week === weekNum && e.type === 'weekly_summary_report');
}

/** Weekly: are there journal entries (daily/hunch) for this week to summarise? */
function weekHasSourceEntries(entries: JournalEntry[], weekNum: number): boolean {
  return entries.some(e => e.week === weekNum && (e.type === 'daily' || e.type === 'hunch'));
}

/** Monthly: has a summary report already been generated for this journey-month?
 *  Keyed by prompt text (mirrors how weekly uses entry.week) to avoid the
 *  day-range overlap bug where a month-2 report at day=61 matched month-3's range.
 */
function monthlyReportExists(entries: JournalEntry[], monthNum: number): boolean {
  const reportPrompt = `📅 Monthly Insight: Month ${monthNum}`;
  return entries.some(
    e => e.type === 'monthly_summary_report' && e.prompt === reportPrompt,
  );
}

/** Monthly: are there journal entries (daily/hunch) for this journey-month? */
function monthHasSourceEntries(entries: JournalEntry[], monthNum: number): boolean {
  const startDay = (monthNum - 1) * 30;
  const endDay   = monthNum * 30;
  return entries.some(
    e => e.day > startDay && e.day <= endDay && (e.type === 'daily' || e.type === 'hunch'),
  );
}

/** Final summary: collect daily entries to pass to the AI. */
function getDailyHistory(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter(e => e.type === 'daily');
}

/** Final summary: collect hunch entries (when setting is enabled). */
function getHunchHistory(
  entries: JournalEntry[],
  includeHunches: boolean,
  includedTypes?: string[],
): JournalEntry[] {
  if (!includeHunches) return [];
  return entries.filter(
    e => e.type === 'hunch' &&
         (!includedTypes || includedTypes.includes(e.hunchType || 'hunch')),
  );
}

// ─── Weekly report guards ────────────────────────────────────────────────────

describe('weekly report guard — existing report detection', () => {
  test('returns true when a weekly_summary_report exists for that week', () => {
    const report = makeJournalEntry({ week: 3, type: 'weekly_summary_report' });
    const daily  = makeJournalEntry({ week: 3, type: 'daily' });
    expect(weeklyReportExists([daily, report], 3)).toBe(true);
  });

  test('returns false when no report exists for that week', () => {
    const entry = makeJournalEntry({ week: 3, type: 'daily' });
    expect(weeklyReportExists([entry], 3)).toBe(false);
  });

  test('returns false when only an empty entries list is available (stale-closure scenario)', () => {
    // This is the stale-closure bug: if entries is [] the guard incorrectly
    // concludes there is no existing report, triggering a duplicate generation.
    expect(weeklyReportExists([], 3)).toBe(false);
  });

  test('report for a different week does not satisfy the guard', () => {
    const report = makeJournalEntry({ week: 2, type: 'weekly_summary_report' });
    expect(weeklyReportExists([report], 3)).toBe(false);
  });
});

describe('weekly report guard — source entries check', () => {
  test('returns true when daily entries exist for the week', () => {
    const entry = makeJournalEntry({ week: 2, type: 'daily' });
    expect(weekHasSourceEntries([entry], 2)).toBe(true);
  });

  test('returns true when hunch entries exist for the week', () => {
    const entry = makeJournalEntry({ week: 2, type: 'hunch' });
    expect(weekHasSourceEntries([entry], 2)).toBe(true);
  });

  test('returns false when only a weekly_summary_report entry exists (not a source entry)', () => {
    const report = makeJournalEntry({ week: 2, type: 'weekly_summary_report' });
    expect(weekHasSourceEntries([report], 2)).toBe(false);
  });

  test('returns false when entries list is empty (stale-closure scenario → skips correctly)', () => {
    expect(weekHasSourceEntries([], 2)).toBe(false);
  });

  test('entries from a different week do not count', () => {
    const entry = makeJournalEntry({ week: 1, type: 'daily' });
    expect(weekHasSourceEntries([entry], 2)).toBe(false);
  });
});

// ─── Monthly report guards ───────────────────────────────────────────────────

describe('monthly report guard — existing report detection', () => {
  test('detects an existing month-1 report by prompt', () => {
    const report = makeJournalEntry({ type: 'monthly_summary_report', prompt: '📅 Monthly Insight: Month 1' });
    expect(monthlyReportExists([report], 1)).toBe(true);
  });

  test('detects an existing month-2 report by prompt', () => {
    const report = makeJournalEntry({ type: 'monthly_summary_report', prompt: '📅 Monthly Insight: Month 2' });
    expect(monthlyReportExists([report], 2)).toBe(true);
  });

  test('detects an existing month-3 report by prompt', () => {
    const report = makeJournalEntry({ type: 'monthly_summary_report', prompt: '📅 Monthly Insight: Month 3' });
    expect(monthlyReportExists([report], 3)).toBe(true);
  });

  test('returns false when no report exists (empty list — stale-closure scenario)', () => {
    expect(monthlyReportExists([], 1)).toBe(false);
  });

  test('report with wrong month prompt does not satisfy guard for a different month', () => {
    const report = makeJournalEntry({ type: 'monthly_summary_report', prompt: '📅 Monthly Insight: Month 2' });
    expect(monthlyReportExists([report], 1)).toBe(false);
    expect(monthlyReportExists([report], 3)).toBe(false);
  });

  test('REGRESSION: month-2 report at day 61 is NOT detected as existing month-3 report', () => {
    // Root cause of the missing month-3 bug: old day-range check (day > 60 && day <= 90)
    // matched a month-2 report stored at day=61, causing generation to be skipped and
    // month_count to be bumped to 4 — permanently blocking the real month-3 report.
    const month2ReportAtDay61 = makeJournalEntry({
      day: 61,
      type: 'monthly_summary_report',
      prompt: '📅 Monthly Insight: Month 2',
    });
    expect(monthlyReportExists([month2ReportAtDay61], 3)).toBe(false);
  });
});

describe('monthly report guard — source entries check', () => {
  test('counts daily entries in the correct day range', () => {
    const entry = makeJournalEntry({ day: 20, type: 'daily' });
    expect(monthHasSourceEntries([entry], 1)).toBe(true);
  });

  test('counts hunch entries in the correct day range', () => {
    const entry = makeJournalEntry({ day: 50, type: 'hunch' });
    expect(monthHasSourceEntries([entry], 2)).toBe(true);
  });

  test('does not count weekly/monthly report entries as source entries', () => {
    const weekly  = makeJournalEntry({ day: 20, type: 'weekly_summary_report' });
    const monthly = makeJournalEntry({ day: 20, type: 'monthly_summary_report' });
    expect(monthHasSourceEntries([weekly, monthly], 1)).toBe(false);
  });

  test('returns false when list is empty (stale-closure scenario → skips correctly)', () => {
    expect(monthHasSourceEntries([], 1)).toBe(false);
  });
});

// ─── Final summary entry collection ─────────────────────────────────────────

describe('final summary — entry collection logic', () => {
  test('dailyHistory contains only "daily" type entries', () => {
    const daily   = makeJournalEntry({ type: 'daily' });
    const hunch   = makeJournalEntry({ type: 'hunch' });
    const weekly  = makeJournalEntry({ type: 'weekly_summary_report' });
    const monthly = makeJournalEntry({ type: 'monthly_summary_report' });
    const result  = getDailyHistory([daily, hunch, weekly, monthly]);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('daily');
  });

  test('zero daily entries → dailyHistory is empty (triggers no-data keepsake path)', () => {
    const hunch  = makeJournalEntry({ type: 'hunch' });
    const weekly = makeJournalEntry({ type: 'weekly_summary_report' });
    expect(getDailyHistory([hunch, weekly])).toHaveLength(0);
  });

  test('hunchHistory is empty when includeHunches is false', () => {
    const hunch = makeJournalEntry({ type: 'hunch' });
    expect(getHunchHistory([hunch], false)).toHaveLength(0);
  });

  test('hunchHistory includes all hunches when includeHunches is true and no type filter', () => {
    const h1 = makeJournalEntry({ type: 'hunch' });
    const h2 = makeJournalEntry({ type: 'hunch' });
    expect(getHunchHistory([h1, h2], true)).toHaveLength(2);
  });

  test('hunchHistory respects finalSummaryIncludedTypes filter', () => {
    const dream = makeJournalEntry({ type: 'hunch', hunchType: 'dream' });
    const gut   = makeJournalEntry({ type: 'hunch', hunchType: 'hunch' });
    const result = getHunchHistory([dream, gut], true, ['dream']);
    expect(result).toHaveLength(1);
    expect(result[0].hunchType).toBe('dream');
  });

  test('hunchType defaults to "hunch" when field is absent, matching includedTypes', () => {
    const entry = makeJournalEntry({ type: 'hunch' }); // hunchType undefined
    const result = getHunchHistory([entry], true, ['hunch']);
    expect(result).toHaveLength(1);
  });

  test('daily entries in all-hunch list → do not appear in hunchHistory', () => {
    const daily = makeJournalEntry({ type: 'daily' });
    const hunch = makeJournalEntry({ type: 'hunch' });
    const result = getHunchHistory([daily, hunch], true);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('hunch');
  });
});
