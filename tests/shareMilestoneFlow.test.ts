/**
 * Tests for the milestone-triggered share prompt flow.
 *
 * Guards four things:
 *   1. Streak-based badge → share milestone mapping (journey-X, overall-X)
 *   2. Day-based share trigger logic (all users hit days 7/30/60/90)
 *   3. Deduplication — consistent users who already earned a streak badge
 *      for that day are NOT also shown the day-based share prompt
 *   4. File-level invariants: correct Play Store URL in SharePrompt,
 *      ShareButton removed from Menu, SharePrompt and day-based trigger
 *      wired into App
 *
 * Run: npx tsx tests/shareMilestoneFlow.test.ts
 */

import fs from 'fs';
import path from 'path';
import type { EarnedBadge } from '../types';

// ─── Harness ────────────────────────────────────────────────────────────────

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

// ─── Streak-based mapping (mirrors App.tsx onDismiss shareMap) ───────────────

type ShareMilestone = 'day7' | 'day30' | 'day60' | 'day90' | 'streak7' | 'streak30';

const STREAK_SHARE_MAP: Partial<Record<string, ShareMilestone>> = {
  'journey-7':  'day7',
  'journey-30': 'day30',
  'journey-60': 'day60',
  'journey-90': 'day90',
  'overall-7':  'streak7',
  'overall-30': 'streak30',
};

function getStreakMilestoneTrigger(badgeId: string): ShareMilestone | null {
  return STREAK_SHARE_MAP[badgeId] ?? null;
}

// ─── Day-based mapping (mirrors App.tsx handleSaveEntry DAY_SHARE_MAP) ───────

const DAY_SHARE_MAP: Partial<Record<number, 'day7' | 'day30' | 'day60' | 'day90'>> = {
  7: 'day7', 30: 'day30', 60: 'day60', 90: 'day90',
};

/**
 * Mirrors the day-based trigger logic in handleSaveEntry.
 * Returns the share milestone to show, or null if:
 *   - the day is not a share day
 *   - a crisis is active (severity >= 2)
 *   - the streak path already covers this day (consistent user)
 */
function getDayShareMilestoneTrigger(
  day: number,
  severity: number,
  allNewBadges: Pick<EarnedBadge, 'id'>[],
  existingBadges: Pick<EarnedBadge, 'id'>[],
): 'day7' | 'day30' | 'day60' | 'day90' | null {
  const milestone = DAY_SHARE_MAP[day];
  if (!milestone || severity >= 2) return null;

  const journeyBadgeId = `journey-${day}`;
  const streakCoversThis =
    allNewBadges.some(b => b.id === journeyBadgeId) ||
    existingBadges.some(b => b.id === journeyBadgeId);

  return streakCoversThis ? null : milestone;
}

// ─── 1. Streak-based qualifying badges ──────────────────────────────────────

section('Streak path — qualifying badges trigger share prompt');

eq(getStreakMilestoneTrigger('journey-7'),  'day7',    'journey-7  → day7');
eq(getStreakMilestoneTrigger('journey-30'), 'day30',   'journey-30 → day30');
eq(getStreakMilestoneTrigger('journey-60'), 'day60',   'journey-60 → day60');
eq(getStreakMilestoneTrigger('journey-90'), 'day90',   'journey-90 → day90');
eq(getStreakMilestoneTrigger('overall-7'),  'streak7', 'overall-7  → streak7');
eq(getStreakMilestoneTrigger('overall-30'), 'streak30','overall-30 → streak30');

// ─── 2. Streak-based non-qualifying badges ───────────────────────────────────

section('Streak path — non-qualifying badges do not trigger share prompt');

eq(getStreakMilestoneTrigger('journey-14'), null, 'journey-14 → null (not a share milestone)');
eq(getStreakMilestoneTrigger('mood-7'),     null, 'mood-7     → null');
eq(getStreakMilestoneTrigger('mood-30'),    null, 'mood-30    → null');
eq(getStreakMilestoneTrigger('flip-7'),     null, 'flip-7     → null');
eq(getStreakMilestoneTrigger('flip-30'),    null, 'flip-30    → null');
eq(getStreakMilestoneTrigger('flip-60'),    null, 'flip-60    → null');
eq(getStreakMilestoneTrigger('flip-90'),    null, 'flip-90    → null');
eq(getStreakMilestoneTrigger('overall-14'), null, 'overall-14 → null');
eq(getStreakMilestoneTrigger('overall-60'), null, 'overall-60 → null');
eq(getStreakMilestoneTrigger('overall-90'), null, 'overall-90 → null');
eq(getStreakMilestoneTrigger(''),           null, 'empty string → null');
eq(getStreakMilestoneTrigger('journey-0'),  null, 'journey-0 (invalid) → null');

// ─── 3. Streak map has exactly 6 entries ────────────────────────────────────

section('Streak share map has exactly the expected 6 entries');

const qualifyingIds = Object.keys(STREAK_SHARE_MAP);
eq(qualifyingIds.length, 6, 'share map has 6 entries');
assert(qualifyingIds.includes('journey-7'),  'journey-7 is in map');
assert(qualifyingIds.includes('journey-30'), 'journey-30 is in map');
assert(qualifyingIds.includes('journey-60'), 'journey-60 is in map');
assert(qualifyingIds.includes('journey-90'), 'journey-90 is in map');
assert(qualifyingIds.includes('overall-7'),  'overall-7 is in map');
assert(qualifyingIds.includes('overall-30'), 'overall-30 is in map');

// ─── 4. Day-based trigger — qualifying days ──────────────────────────────────

section('Day path — qualifying journey days fire share prompt');

// Inconsistent user (no journey badge earned) on each share day
eq(getDayShareMilestoneTrigger(7,  0, [], []), 'day7',  'day 7,  no badge, no crisis → day7');
eq(getDayShareMilestoneTrigger(30, 0, [], []), 'day30', 'day 30, no badge, no crisis → day30');
eq(getDayShareMilestoneTrigger(60, 0, [], []), 'day60', 'day 60, no badge, no crisis → day60');
eq(getDayShareMilestoneTrigger(90, 0, [], []), 'day90', 'day 90, no badge, no crisis → day90');

// ─── 5. Day-based trigger — non-qualifying days ──────────────────────────────

section('Day path — non-share days return null');

const noBadge: Pick<EarnedBadge, 'id'>[] = [];
eq(getDayShareMilestoneTrigger(1,  0, noBadge, noBadge), null, 'day 1  → null');
eq(getDayShareMilestoneTrigger(6,  0, noBadge, noBadge), null, 'day 6  → null (day before first share day)');
eq(getDayShareMilestoneTrigger(8,  0, noBadge, noBadge), null, 'day 8  → null (day after first share day)');
eq(getDayShareMilestoneTrigger(14, 0, noBadge, noBadge), null, 'day 14 → null');
eq(getDayShareMilestoneTrigger(29, 0, noBadge, noBadge), null, 'day 29 → null');
eq(getDayShareMilestoneTrigger(45, 0, noBadge, noBadge), null, 'day 45 → null');
eq(getDayShareMilestoneTrigger(89, 0, noBadge, noBadge), null, 'day 89 → null');

// ─── 6. Day-based trigger — crisis suppression ───────────────────────────────

section('Day path — crisis suppresses share prompt');

eq(getDayShareMilestoneTrigger(7,  2, [], []), null, 'day 7  + severity 2 → null (crisis, no share)');
eq(getDayShareMilestoneTrigger(30, 2, [], []), null, 'day 30 + severity 2 → null');
eq(getDayShareMilestoneTrigger(7,  3, [], []), null, 'day 7  + severity 3 → null');

// severity 1 is below crisis threshold — share should still fire
eq(getDayShareMilestoneTrigger(7,  1, [], []), 'day7', 'day 7 + severity 1 → day7 (below crisis threshold)');

// ─── 7. Day-based trigger — deduplication (consistent users) ─────────────────

section('Day path — deduplication: streak path already covers consistent users');

const journey7Badge: Pick<EarnedBadge, 'id'>[] = [{ id: 'journey-7' }];
const journey30Badge: Pick<EarnedBadge, 'id'>[] = [{ id: 'journey-30' }];
const journey90Badge: Pick<EarnedBadge, 'id'>[] = [{ id: 'journey-90' }];

// Badge in allNewBadges (just earned this session) → skip day-based trigger
eq(getDayShareMilestoneTrigger(7,  0, journey7Badge,  []), null, 'day 7  + journey-7 just earned  → null (streak handles it)');
eq(getDayShareMilestoneTrigger(30, 0, journey30Badge, []), null, 'day 30 + journey-30 just earned → null (streak handles it)');
eq(getDayShareMilestoneTrigger(90, 0, journey90Badge, []), null, 'day 90 + journey-90 just earned → null (streak handles it)');

// Badge in existingBadges (earned in a previous session) → skip day-based trigger
eq(getDayShareMilestoneTrigger(7,  0, [], journey7Badge),  null, 'day 7  + journey-7 previously earned  → null (streak already fired)');
eq(getDayShareMilestoneTrigger(30, 0, [], journey30Badge), null, 'day 30 + journey-30 previously earned → null (streak already fired)');
eq(getDayShareMilestoneTrigger(90, 0, [], journey90Badge), null, 'day 90 + journey-90 previously earned → null (streak already fired)');

// A badge for a DIFFERENT day doesn't block this day's share
const journey30InExisting: Pick<EarnedBadge, 'id'>[] = [{ id: 'journey-30' }];
eq(getDayShareMilestoneTrigger(7, 0, [], journey30InExisting), 'day7',
  'day 7 + journey-30 in existing (different day) → day7 still fires');

// overall-* badges do not deduplicate day-based triggers
const overall7Badge: Pick<EarnedBadge, 'id'>[] = [{ id: 'overall-7' }];
eq(getDayShareMilestoneTrigger(7, 0, overall7Badge, []), 'day7',
  'day 7 + overall-7 just earned → day7 still fires (different badge type)');

// ─── 8. File-level invariants ────────────────────────────────────────────────

section('SharePrompt.tsx — correct Play Store URL');

const sharePromptSrc = fs.readFileSync(
  path.resolve('components/SharePrompt.tsx'),
  'utf8'
);

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.renew90.journal';
assert(
  sharePromptSrc.includes(PLAY_STORE_URL),
  'SharePrompt.tsx contains the Play Store URL'
);
assert(
  !sharePromptSrc.includes('window.location.origin'),
  'SharePrompt.tsx does NOT use window.location.origin (wrong URL pattern)'
);

section('Menu.tsx — ShareButton removed');

const menuSrc = fs.readFileSync(path.resolve('components/Menu.tsx'), 'utf8');

assert(!menuSrc.includes("import { ShareButton }"), 'Menu.tsx does not import ShareButton');
assert(!menuSrc.includes('<ShareButton'),            'Menu.tsx does not render <ShareButton');

section('App.tsx — both share paths wired in');

const appSrc = fs.readFileSync(path.resolve('App.tsx'), 'utf8');

assert(appSrc.includes("import { SharePrompt }"),        'App.tsx imports SharePrompt');
assert(appSrc.includes('shareMilestone'),                'App.tsx has shareMilestone state');
assert(appSrc.includes('<SharePrompt'),                  'App.tsx renders <SharePrompt');
assert(appSrc.includes("crisisSeverity === 0 && shareMilestone"), 'SharePrompt is crisis-gated');

// Streak path
assert(appSrc.includes("'journey-7': 'day7'"),     'App.tsx streak shareMap: journey-7 → day7');
assert(appSrc.includes("'journey-90': 'day90'"),   'App.tsx streak shareMap: journey-90 → day90');
assert(appSrc.includes("'overall-7': 'streak7'"),  'App.tsx streak shareMap: overall-7 → streak7');
assert(appSrc.includes("'overall-30': 'streak30'"),'App.tsx streak shareMap: overall-30 → streak30');

// Day-based path
assert(appSrc.includes('DAY_SHARE_MAP'),              'App.tsx has DAY_SHARE_MAP');
assert(appSrc.includes('dayShareMilestone'),          'App.tsx has dayShareMilestone logic');
assert(appSrc.includes('streakCoversThis'),           'App.tsx has deduplication guard');
assert(appSrc.includes("7: 'day7'"),                  "App.tsx DAY_SHARE_MAP has day 7 → day7");
assert(appSrc.includes("90: 'day90'"),                "App.tsx DAY_SHARE_MAP has day 90 → day90");

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n========================================`);
console.log(`  ${passed + failed} tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
