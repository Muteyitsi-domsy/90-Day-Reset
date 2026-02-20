/**
 * Deterministic tests for milestoneService.
 * Run: npx tsx tests/milestoneService.test.ts
 */

import { checkForNewMilestones, getBadgeDisplayInfo, getMilestonesForType } from '../services/milestoneService';
import type { EarnedBadge } from '../types';

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

const TODAY = '2026-02-17';

// ─── checkForNewMilestones ──────────────────────────────────────────

section('No milestone when streak does not increment');

eq(
  checkForNewMilestones('journey', 5, 5, [], TODAY),
  [],
  'same streak (same-day entry) → no milestone'
);

eq(
  checkForNewMilestones('journey', 10, 1, [], TODAY),
  [],
  'streak reset (gap) → no milestone'
);

eq(
  checkForNewMilestones('journey', 7, 7, [], TODAY),
  [],
  'at threshold but no increment → no milestone'
);

section('Milestone at exact boundary');

eq(
  checkForNewMilestones('journey', 6, 7, [], TODAY),
  [{
    id: 'journey-7',
    journalType: 'journey',
    threshold: 7,
    earnedDate: TODAY,
    celebrated: false,
  }],
  'streak 6 → 7 triggers 7-day milestone'
);

eq(
  checkForNewMilestones('mood', 13, 14, [], TODAY),
  [{
    id: 'mood-14',
    journalType: 'mood',
    threshold: 14,
    earnedDate: TODAY,
    celebrated: false,
  }],
  'streak 13 → 14 triggers 14-day milestone'
);

eq(
  checkForNewMilestones('overall', 29, 30, [], TODAY),
  [{
    id: 'overall-30',
    journalType: 'overall',
    threshold: 30,
    earnedDate: TODAY,
    celebrated: false,
  }],
  'streak 29 → 30 triggers 30-day milestone'
);

eq(
  checkForNewMilestones('flip', 59, 60, [], TODAY),
  [{
    id: 'flip-60',
    journalType: 'flip',
    threshold: 60,
    earnedDate: TODAY,
    celebrated: false,
  }],
  'streak 59 → 60 triggers 60-day milestone'
);

eq(
  checkForNewMilestones('journey', 89, 90, [], TODAY),
  [{
    id: 'journey-90',
    journalType: 'journey',
    threshold: 90,
    earnedDate: TODAY,
    celebrated: false,
  }],
  'streak 89 → 90 triggers 90-day milestone'
);

section('Multiple thresholds crossed at once (ascending order)');

eq(
  checkForNewMilestones('journey', 6, 14, [], TODAY),
  [
    {
      id: 'journey-7',
      journalType: 'journey',
      threshold: 7,
      earnedDate: TODAY,
      celebrated: false,
    },
    {
      id: 'journey-14',
      journalType: 'journey',
      threshold: 14,
      earnedDate: TODAY,
      celebrated: false,
    },
  ],
  'streak 6 → 14 triggers both 7 and 14 in ascending order'
);

eq(
  checkForNewMilestones('overall', 0, 90, [], TODAY),
  [
    { id: 'overall-7', journalType: 'overall', threshold: 7, earnedDate: TODAY, celebrated: false },
    { id: 'overall-14', journalType: 'overall', threshold: 14, earnedDate: TODAY, celebrated: false },
    { id: 'overall-30', journalType: 'overall', threshold: 30, earnedDate: TODAY, celebrated: false },
    { id: 'overall-60', journalType: 'overall', threshold: 60, earnedDate: TODAY, celebrated: false },
    { id: 'overall-90', journalType: 'overall', threshold: 90, earnedDate: TODAY, celebrated: false },
  ],
  'streak 0 → 90 triggers all 5 milestones ascending'
);

section('Duplicate prevention (idempotent)');

const existing7: EarnedBadge = {
  id: 'journey-7',
  journalType: 'journey',
  threshold: 7,
  earnedDate: '2026-02-10',
  celebrated: true,
};

eq(
  checkForNewMilestones('journey', 6, 7, [existing7], TODAY),
  [],
  'badge already earned → no duplicate'
);

eq(
  checkForNewMilestones('journey', 6, 14, [existing7], TODAY),
  [{
    id: 'journey-14',
    journalType: 'journey',
    threshold: 14,
    earnedDate: TODAY,
    celebrated: false,
  }],
  '7-day already earned, 14-day new → only 14-day returned'
);

const existingAll: EarnedBadge[] = [7, 14, 30, 60, 90].map(t => ({
  id: `journey-${t}`,
  journalType: 'journey' as const,
  threshold: t as 7 | 14 | 30 | 60 | 90,
  earnedDate: '2026-01-01',
  celebrated: true,
}));

eq(
  checkForNewMilestones('journey', 89, 90, existingAll, TODAY),
  [],
  'all badges already earned → empty array'
);

section('No milestone below threshold');

eq(
  checkForNewMilestones('journey', 4, 5, [], TODAY),
  [],
  'streak 4 → 5 (below 7) → no milestone'
);

eq(
  checkForNewMilestones('journey', 7, 8, [], TODAY),
  [],
  'streak 7 → 8 (between thresholds) → no milestone'
);

section('Cross-type isolation');

const moodBadge: EarnedBadge = {
  id: 'mood-7',
  journalType: 'mood',
  threshold: 7,
  earnedDate: '2026-02-10',
  celebrated: true,
};

eq(
  checkForNewMilestones('journey', 6, 7, [moodBadge], TODAY),
  [{
    id: 'journey-7',
    journalType: 'journey',
    threshold: 7,
    earnedDate: TODAY,
    celebrated: false,
  }],
  'mood-7 badge does not block journey-7 badge'
);

// ─── getBadgeDisplayInfo ────────────────────────────────────────────

section('getBadgeDisplayInfo');

const badge7: EarnedBadge = {
  id: 'journey-7',
  journalType: 'journey',
  threshold: 7,
  earnedDate: TODAY,
  celebrated: false,
};

const info = getBadgeDisplayInfo(badge7);
assert(info.title === 'The First Lantern', 'title for 7-day badge');
assert(info.icon === '🕯️', 'icon for 7-day badge');
assert(info.typeLabel === 'Journey', 'type label for journey');

const badge90: EarnedBadge = {
  id: 'overall-90',
  journalType: 'overall',
  threshold: 90,
  earnedDate: TODAY,
  celebrated: false,
};

const info90 = getBadgeDisplayInfo(badge90);
assert(info90.title === 'The One Who Returned', 'title for 90-day badge (non-journey)');
assert(info90.icon === '🌟', 'icon for 90-day badge (non-journey)');
assert(info90.typeLabel === 'Overall', 'type label for overall');

const journey90: EarnedBadge = {
  id: 'journey-90',
  journalType: 'journey',
  threshold: 90,
  earnedDate: TODAY,
  celebrated: false,
};

const infoJ90 = getBadgeDisplayInfo(journey90);
assert(infoJ90.title === 'You showed up for yourself.', 'journey-90 has reflective title');
assert(infoJ90.icon === '🪞', 'journey-90 uses mirror icon');
assert(infoJ90.reflective === true, 'journey-90 flagged as reflective');
assert(infoJ90.description.includes('commitment'), 'journey-90 description mentions commitment');

// ─── getMilestonesForType ───────────────────────────────────────────

section('getMilestonesForType');

const milestones = getMilestonesForType('journey', [existing7]);
assert(milestones.length === 5, 'returns all 5 thresholds');
assert(milestones[0].threshold === 7, 'first threshold is 7');
assert(milestones[0].earned === true, '7-day is earned');
assert(milestones[0].badge?.id === 'journey-7', '7-day badge attached');
assert(milestones[1].threshold === 14, 'second threshold is 14');
assert(milestones[1].earned === false, '14-day is not earned');
assert(milestones[1].badge === undefined, '14-day has no badge');

// ─── Summary ─────────────────────────────────────────────────────────

console.log(`\n========================================`);
console.log(`  ${passed + failed} tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

process.exit(failed > 0 ? 1 : 0);
