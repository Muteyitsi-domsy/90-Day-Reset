/**
 * Shared test data factories.
 * Keeps test files clean — just call makeProfile(), makeMoodEntry(), etc.
 */

import type { UserProfile, JournalEntry, MoodJournalEntry, FlipJournalEntry } from '../../types';

// ─── Date helpers ────────────────────────────────────────────────────────────

/** YYYY-MM-DD for a date N days before today (0 = today). */
export function localDate(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** ISO string for a date N days before today at noon (noon avoids DST edge-cases). */
export function isoNoon(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/**
 * ISO startDate so that getDayAndMonth() returns targetDay today.
 * getDayAndMonth formula: day = Math.ceil(diffDays) + 1 → targetDay-1 days ago.
 */
export function startDateForDay(targetDay: number): string {
  return isoNoon(targetDay - 1);
}

// ─── Profile factory ─────────────────────────────────────────────────────────

export function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    name: 'Tester',
    arc: 'release',
    startDate: startDateForDay(1), // day 1 by default
    week_count: 1,
    month_count: 1,
    lastMilestoneDayCompleted: 0,
    streak: 0,
    lastEntryDate: '',
    moodStreak: 0,
    lastMoodEntryDate: '',
    flipStreak: 0,
    lastFlipEntryDate: '',
    overallStreak: 0,
    lastOverallEntryDate: '',
    earnedBadges: [],
    ...overrides,
  };
}

// ─── Journal entry factory ───────────────────────────────────────────────────

let _entryId = 0;
export function makeJournalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: `entry-${++_entryId}`,
    date: new Date().toISOString(),
    day: 1,
    week: 1,
    prompt: 'Test prompt',
    rawText: 'Test journal text.',
    type: 'daily',
    ...overrides,
  };
}

// ─── Mood entry factory ──────────────────────────────────────────────────────

let _moodId = 0;
export function makeMoodEntry(overrides: Partial<MoodJournalEntry> = {}): MoodJournalEntry {
  return {
    id: `mood-${++_moodId}`,
    date: localDate(0),
    timestamp: new Date().toISOString(),
    emotion: 'calm',
    intensity: 'medium',
    context: 'mental_health',
    prompt: 'How are you feeling?',
    journalText: 'Feeling present and grounded.',
    isCustomEmotion: false,
    ...overrides,
  };
}

// ─── Flip entry factory ──────────────────────────────────────────────────────

let _flipId = 0;
export function makeFlipEntry(overrides: Partial<FlipJournalEntry> = {}): FlipJournalEntry {
  return {
    id: `flip-${++_flipId}`,
    date: localDate(0),
    timestamp: new Date().toISOString(),
    challenge: 'I keep hitting the same wall.',
    reframingQuestion: 'What is this wall trying to protect?',
    reframedPerspective: 'Maybe the wall is a boundary I needed to see.',
    ...overrides,
  };
}
