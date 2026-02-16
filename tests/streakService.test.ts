/**
 * Lightweight deterministic tests for streakService.
 * Run: npx tsx tests/streakService.test.ts
 */

import { calculateUpdatedStreak, recalculateStreakFromDates } from '../services/streakService';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL  ${label}`);
  }
}

function eq<T>(actual: T, expected: T, label: string) {
  const match = JSON.stringify(actual) === JSON.stringify(expected);
  if (!match) {
    console.error(`         expected: ${JSON.stringify(expected)}`);
    console.error(`         actual:   ${JSON.stringify(actual)}`);
  }
  assert(match, label);
}

function section(name: string) {
  console.log(`\n--- ${name} ---`);
}

// ─── calculateUpdatedStreak ──────────────────────────────────────────

section('First entry ever (no lastEntryDate)');
eq(
  calculateUpdatedStreak(0, undefined, '2026-02-16'),
  { newStreak: 1, lastEntryDate: '2026-02-16' },
  'undefined lastEntryDate → streak 1'
);

section('Same day entry');
eq(
  calculateUpdatedStreak(5, '2026-02-16', '2026-02-16'),
  { newStreak: 5, lastEntryDate: '2026-02-16' },
  'same day keeps existing streak'
);
eq(
  calculateUpdatedStreak(0, '2026-02-16', '2026-02-16'),
  { newStreak: 1, lastEntryDate: '2026-02-16' },
  'same day with streak 0 floors to 1'
);

section('Next day increment');
eq(
  calculateUpdatedStreak(3, '2026-02-15', '2026-02-16'),
  { newStreak: 4, lastEntryDate: '2026-02-16' },
  'consecutive day increments streak'
);
eq(
  calculateUpdatedStreak(1, '2026-02-15', '2026-02-16'),
  { newStreak: 2, lastEntryDate: '2026-02-16' },
  'streak 1 → 2 on next day'
);

section('Two-day gap reset');
eq(
  calculateUpdatedStreak(10, '2026-02-14', '2026-02-16'),
  { newStreak: 1, lastEntryDate: '2026-02-16' },
  '2-day gap resets to 1'
);
eq(
  calculateUpdatedStreak(50, '2026-01-01', '2026-02-16'),
  { newStreak: 1, lastEntryDate: '2026-02-16' },
  'large gap resets to 1'
);

section('Month boundary');
eq(
  calculateUpdatedStreak(7, '2026-01-31', '2026-02-01'),
  { newStreak: 8, lastEntryDate: '2026-02-01' },
  'Jan 31 → Feb 1 is consecutive'
);
eq(
  calculateUpdatedStreak(3, '2026-02-28', '2026-03-01'),
  { newStreak: 4, lastEntryDate: '2026-03-01' },
  'Feb 28 → Mar 1 is consecutive (non-leap year 2026)'
);
eq(
  calculateUpdatedStreak(3, '2026-03-31', '2026-04-01'),
  { newStreak: 4, lastEntryDate: '2026-04-01' },
  'Mar 31 → Apr 1 is consecutive'
);

section('Year boundary');
eq(
  calculateUpdatedStreak(15, '2025-12-31', '2026-01-01'),
  { newStreak: 16, lastEntryDate: '2026-01-01' },
  'Dec 31 → Jan 1 is consecutive'
);
eq(
  calculateUpdatedStreak(5, '2025-12-30', '2026-01-01'),
  { newStreak: 1, lastEntryDate: '2026-01-01' },
  'Dec 30 → Jan 1 is a 2-day gap, resets'
);

section('ISO vs YYYY-MM-DD input handling');
eq(
  calculateUpdatedStreak(3, '2026-02-15T14:30:00.000Z', '2026-02-16'),
  { newStreak: 4, lastEntryDate: '2026-02-16' },
  'ISO lastEntryDate + YYYY-MM-DD newEntryDate → consecutive'
);
eq(
  calculateUpdatedStreak(5, '2026-02-16T08:00:00.000Z', '2026-02-16'),
  { newStreak: 5, lastEntryDate: '2026-02-16' },
  'ISO same day → keeps streak'
);
// Note: '2026-02-14T23:59:59.999Z' resolves to local date 2026-02-15 in UTC+
// timezones, so this is actually a 1-day diff there. Test with unambiguous dates.
eq(
  calculateUpdatedStreak(2, '2026-02-14T10:00:00.000Z', '2026-02-16'),
  { newStreak: 1, lastEntryDate: '2026-02-16' },
  'ISO 2-day gap (midday UTC, unambiguous) → resets'
);

section('Pause-resume scenario input consistency');
// Simulates: user pauses, resume handler reads lastEntryDate as ISO,
// then next entry uses YYYY-MM-DD. Both formats must produce correct diff.
{
  const isoStored = '2026-02-10T09:15:00.000Z'; // stored by old code path
  const resumeDay = '2026-02-10';                // same day in YYYY-MM-DD

  const result1 = calculateUpdatedStreak(4, isoStored, resumeDay);
  eq(result1, { newStreak: 4, lastEntryDate: resumeDay },
    'ISO stored + same day YYYY-MM-DD → no change');

  const nextDay = '2026-02-11';
  const result2 = calculateUpdatedStreak(result1.newStreak, isoStored, nextDay);
  eq(result2, { newStreak: 5, lastEntryDate: nextDay },
    'ISO stored + next day YYYY-MM-DD → increment');

  const gapDay = '2026-02-13';
  const result3 = calculateUpdatedStreak(result1.newStreak, isoStored, gapDay);
  eq(result3, { newStreak: 1, lastEntryDate: gapDay },
    'ISO stored + 3-day gap YYYY-MM-DD → reset');
}

// ─── recalculateStreakFromDates ──────────────────────────────────────

section('recalculateStreakFromDates');

eq(
  recalculateStreakFromDates([]),
  0,
  'empty array → 0'
);

// Build dates relative to today for deterministic tests
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

eq(
  recalculateStreakFromDates([daysAgo(0)]),
  1,
  'single entry today → streak 1'
);

eq(
  recalculateStreakFromDates([daysAgo(0), daysAgo(1), daysAgo(2)]),
  3,
  '3 consecutive days ending today → streak 3'
);

eq(
  recalculateStreakFromDates([daysAgo(0), daysAgo(1), daysAgo(3)]),
  2,
  'gap after 2 days → streak 2'
);

eq(
  recalculateStreakFromDates([daysAgo(1), daysAgo(2), daysAgo(3)]),
  0,
  'no entry today → streak 0 (starts from today)'
);

eq(
  recalculateStreakFromDates([daysAgo(0), daysAgo(0), daysAgo(1)]),
  1,
  'duplicate today date → counts as 1 (breaks on second match attempt)'
);

// ─── Summary ─────────────────────────────────────────────────────────

console.log(`\n========================================`);
console.log(`  ${passed + failed} tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
