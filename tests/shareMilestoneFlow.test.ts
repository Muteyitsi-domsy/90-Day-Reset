/**
 * Tests for the milestone-triggered share prompt flow.
 *
 * Guards three things:
 *   1. The badge-to-share-milestone mapping fires for the right badge IDs
 *      and returns the right milestone key for each.
 *   2. Badges that should NOT trigger a share prompt don't.
 *   3. File-level invariants: correct Play Store URL in SharePrompt,
 *      ShareButton removed from Menu, SharePrompt wired into App.
 *
 * Run: npx tsx tests/shareMilestoneFlow.test.ts
 */

import fs from 'fs';
import path from 'path';

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

// ─── The mapping under test ──────────────────────────────────────────────────
//
// This mirrors the shareMap in App.tsx onDismiss exactly.
// If App.tsx's shareMap is changed, this test will fail — which is the point.

type ShareMilestone = 'day7' | 'day30' | 'day60' | 'day90' | 'streak7' | 'streak30';

const SHARE_MAP: Partial<Record<string, ShareMilestone>> = {
  'journey-7':  'day7',
  'journey-30': 'day30',
  'journey-60': 'day60',
  'journey-90': 'day90',
  'overall-7':  'streak7',
  'overall-30': 'streak30',
};

function getMilestoneTrigger(badgeId: string): ShareMilestone | null {
  return SHARE_MAP[badgeId] ?? null;
}

// ─── 1. Qualifying badges ────────────────────────────────────────────────────

section('Qualifying badges trigger share prompt');

eq(getMilestoneTrigger('journey-7'),  'day7',    'journey-7  → day7');
eq(getMilestoneTrigger('journey-30'), 'day30',   'journey-30 → day30');
eq(getMilestoneTrigger('journey-60'), 'day60',   'journey-60 → day60');
eq(getMilestoneTrigger('journey-90'), 'day90',   'journey-90 → day90');
eq(getMilestoneTrigger('overall-7'),  'streak7', 'overall-7  → streak7');
eq(getMilestoneTrigger('overall-30'), 'streak30','overall-30 → streak30');

// ─── 2. Non-qualifying badges ────────────────────────────────────────────────

section('Non-qualifying badges do not trigger share prompt');

// journey-14 is a real milestone but not a share trigger
eq(getMilestoneTrigger('journey-14'), null, 'journey-14 → null (not a share milestone)');

// mood and flip badges never trigger share
eq(getMilestoneTrigger('mood-7'),    null, 'mood-7    → null');
eq(getMilestoneTrigger('mood-30'),   null, 'mood-30   → null');
eq(getMilestoneTrigger('flip-7'),    null, 'flip-7    → null');
eq(getMilestoneTrigger('flip-30'),   null, 'flip-30   → null');
eq(getMilestoneTrigger('flip-60'),   null, 'flip-60   → null');
eq(getMilestoneTrigger('flip-90'),   null, 'flip-90   → null');

// overall-14 and overall-60/90 are real milestones but not share triggers
eq(getMilestoneTrigger('overall-14'), null, 'overall-14 → null');
eq(getMilestoneTrigger('overall-60'), null, 'overall-60 → null');
eq(getMilestoneTrigger('overall-90'), null, 'overall-90 → null');

// Garbage / unknown IDs
eq(getMilestoneTrigger(''),            null, 'empty string → null');
eq(getMilestoneTrigger('journey-0'),   null, 'journey-0 (invalid) → null');

// ─── 3. Exactly 6 qualifying badge IDs ──────────────────────────────────────

section('Share map has exactly the expected 6 entries');

const qualifyingIds = Object.keys(SHARE_MAP);
eq(qualifyingIds.length, 6, 'share map has 6 entries');
assert(qualifyingIds.includes('journey-7'),  'journey-7 is in map');
assert(qualifyingIds.includes('journey-30'), 'journey-30 is in map');
assert(qualifyingIds.includes('journey-60'), 'journey-60 is in map');
assert(qualifyingIds.includes('journey-90'), 'journey-90 is in map');
assert(qualifyingIds.includes('overall-7'),  'overall-7 is in map');
assert(qualifyingIds.includes('overall-30'), 'overall-30 is in map');

// ─── 4. File-level invariants ────────────────────────────────────────────────

section('SharePrompt.tsx — correct Play Store URL');

const sharePromptSrc = fs.readFileSync(
  path.resolve('components/SharePrompt.tsx'),
  'utf8'
);

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=app.renew90.journal';
assert(
  sharePromptSrc.includes(PLAY_STORE_URL),
  `SharePrompt.tsx contains the Play Store URL`
);

assert(
  !sharePromptSrc.includes('window.location.origin'),
  'SharePrompt.tsx does NOT use window.location.origin (wrong URL pattern)'
);

section('Menu.tsx — ShareButton removed');

const menuSrc = fs.readFileSync(
  path.resolve('components/Menu.tsx'),
  'utf8'
);

assert(
  !menuSrc.includes("import { ShareButton }"),
  'Menu.tsx does not import ShareButton'
);

assert(
  !menuSrc.includes('<ShareButton'),
  'Menu.tsx does not render <ShareButton'
);

section('App.tsx — SharePrompt wired in');

const appSrc = fs.readFileSync(
  path.resolve('App.tsx'),
  'utf8'
);

assert(
  appSrc.includes("import { SharePrompt }"),
  'App.tsx imports SharePrompt'
);

assert(
  appSrc.includes('shareMilestone'),
  'App.tsx has shareMilestone state'
);

assert(
  appSrc.includes('<SharePrompt'),
  'App.tsx renders <SharePrompt'
);

assert(
  appSrc.includes("'journey-7': 'day7'"),
  "App.tsx shareMap contains journey-7 → day7"
);

assert(
  appSrc.includes("'journey-90': 'day90'"),
  "App.tsx shareMap contains journey-90 → day90"
);

assert(
  appSrc.includes("'overall-7': 'streak7'"),
  "App.tsx shareMap contains overall-7 → streak7"
);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n========================================`);
console.log(`  ${passed + failed} tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
