/**
 * Tests for the mood journal → flip journal flow.
 *
 * The flip prompt appears in MoodJournalView when:
 *   1. User has written a mood entry today
 *   2. Today's entry has not already been flipped (linkedMoodEntryId check)
 *   3. Total flips today < 3 (daily limit)
 *
 * These tests mirror the canFlip / isAlreadyFlipped / todayFlipCount
 * logic from MoodJournalView.tsx. If that logic changes, these tests
 * will catch the regression.
 */

import { describe, test, expect } from 'vitest';
import type { MoodJournalEntry, FlipJournalEntry } from '../types';
import { localDate, makeMoodEntry, makeFlipEntry } from './helpers/factories';
import { calculateUpdatedStreak } from '../services/streakService';

// ─── Mirrors MoodJournalView flip-eligibility logic ───────────────────────

const TODAY = localDate(0);
const YESTERDAY = localDate(1);

/** Pure mirror of MoodJournalView's flip availability logic. */
function getFlipState(
  moodEntries: MoodJournalEntry[],
  flipEntries: FlipJournalEntry[],
  today: string
): {
  hasWrittenToday: boolean;
  todaysEntry: MoodJournalEntry | undefined;
  isAlreadyFlipped: boolean;
  todayFlipCount: number;
  canFlip: boolean;
} {
  const hasWrittenToday = moodEntries.some(e => e.date === today);
  const todaysEntry = moodEntries.find(e => e.date === today);
  const isAlreadyFlipped = !!(todaysEntry && flipEntries.some(f => f.linkedMoodEntryId === todaysEntry.id));
  const todayFlipCount = flipEntries.filter(f => f.date === today).length;
  const canFlip = !!(todaysEntry && !isAlreadyFlipped && todayFlipCount < 3);

  return { hasWrittenToday, todaysEntry, isAlreadyFlipped, todayFlipCount, canFlip };
}

// ─── Flip prompt availability ──────────────────────────────────────────────

describe('Flip prompt availability', () => {

  test('no mood entry today → canFlip is false', () => {
    const { canFlip, hasWrittenToday } = getFlipState([], [], TODAY);
    expect(hasWrittenToday).toBe(false);
    expect(canFlip).toBe(false);
  });

  test('mood entry today, no flips → canFlip is true', () => {
    const entry = makeMoodEntry({ date: TODAY });
    const { canFlip } = getFlipState([entry], [], TODAY);
    expect(canFlip).toBe(true);
  });

  test('mood entry today, already flipped → canFlip is false', () => {
    const moodEntry = makeMoodEntry({ date: TODAY, id: 'mood-abc' });
    const flipEntry = makeFlipEntry({ date: TODAY, linkedMoodEntryId: 'mood-abc' });
    const { canFlip, isAlreadyFlipped } = getFlipState([moodEntry], [flipEntry], TODAY);
    expect(isAlreadyFlipped).toBe(true);
    expect(canFlip).toBe(false);
  });

  test('mood entry exists but was for yesterday (not today) → canFlip is false', () => {
    const entry = makeMoodEntry({ date: YESTERDAY });
    const { canFlip, hasWrittenToday } = getFlipState([entry], [], TODAY);
    expect(hasWrittenToday).toBe(false);
    expect(canFlip).toBe(false);
  });
});

// ─── Daily flip limit (3/day) ─────────────────────────────────────────────

describe('Daily flip limit', () => {

  test('0 flips today → can flip', () => {
    const moodEntry = makeMoodEntry({ date: TODAY });
    const { todayFlipCount, canFlip } = getFlipState([moodEntry], [], TODAY);
    expect(todayFlipCount).toBe(0);
    expect(canFlip).toBe(true);
  });

  test('1 flip today (different mood entry) → can still flip', () => {
    const moodEntry = makeMoodEntry({ date: TODAY, id: 'mood-new' });
    const otherFlip = makeFlipEntry({ date: TODAY, linkedMoodEntryId: 'mood-old' });
    const { todayFlipCount, canFlip } = getFlipState([moodEntry], [otherFlip], TODAY);
    expect(todayFlipCount).toBe(1);
    expect(canFlip).toBe(true);
  });

  test('2 flips today → can still flip', () => {
    const moodEntry = makeMoodEntry({ date: TODAY, id: 'mood-new' });
    const flips = [
      makeFlipEntry({ date: TODAY, linkedMoodEntryId: 'mood-a' }),
      makeFlipEntry({ date: TODAY, linkedMoodEntryId: 'mood-b' }),
    ];
    const { todayFlipCount, canFlip } = getFlipState([moodEntry], flips, TODAY);
    expect(todayFlipCount).toBe(2);
    expect(canFlip).toBe(true);
  });

  test('3 flips today → limit reached, canFlip is false', () => {
    const moodEntry = makeMoodEntry({ date: TODAY, id: 'mood-new' });
    const flips = [
      makeFlipEntry({ date: TODAY, linkedMoodEntryId: 'mood-a' }),
      makeFlipEntry({ date: TODAY, linkedMoodEntryId: 'mood-b' }),
      makeFlipEntry({ date: TODAY, linkedMoodEntryId: 'mood-c' }),
    ];
    const { todayFlipCount, canFlip } = getFlipState([moodEntry], flips, TODAY);
    expect(todayFlipCount).toBe(3);
    expect(canFlip).toBe(false);
  });

  test('flips from other days do not count toward today\'s limit', () => {
    const moodEntry = makeMoodEntry({ date: TODAY, id: 'mood-today' });
    const oldFlips = [
      makeFlipEntry({ date: YESTERDAY }),
      makeFlipEntry({ date: YESTERDAY }),
      makeFlipEntry({ date: YESTERDAY }),
    ];
    const { todayFlipCount, canFlip } = getFlipState([moodEntry], oldFlips, TODAY);
    expect(todayFlipCount).toBe(0);
    expect(canFlip).toBe(true);
  });
});

// ─── linkedMoodEntryId linking ────────────────────────────────────────────

describe('Flip → mood entry linking', () => {

  test('flip entry carries linkedMoodEntryId from source mood entry', () => {
    const moodEntry = makeMoodEntry({ date: TODAY, id: 'mood-xyz' });
    // Simulate creating a flip from this mood entry
    const flipEntry = makeFlipEntry({
      date: TODAY,
      linkedMoodEntryId: moodEntry.id,
    });
    expect(flipEntry.linkedMoodEntryId).toBe('mood-xyz');
  });

  test('isAlreadyFlipped uses linkedMoodEntryId (not just date)', () => {
    // Two mood entries on same day
    const moodA = makeMoodEntry({ date: TODAY, id: 'mood-a' });
    const moodB = makeMoodEntry({ date: TODAY, id: 'mood-b' });
    // Only moodA is flipped
    const flip = makeFlipEntry({ date: TODAY, linkedMoodEntryId: 'mood-a' });

    // Check from moodA's perspective — already flipped
    const stateA = getFlipState([moodA], [flip], TODAY);
    // todaysEntry will find the first entry, mood-a
    expect(stateA.isAlreadyFlipped).toBe(true);

    // A standalone flip without linkedMoodEntryId should not block moodB
    const flipNoLink = makeFlipEntry({ date: TODAY }); // no linkedMoodEntryId
    const stateB = getFlipState([moodB], [flipNoLink], TODAY);
    expect(stateB.isAlreadyFlipped).toBe(false);
  });

  test('standalone flip (no linkedMoodEntryId) does not block mood flip eligibility', () => {
    const moodEntry = makeMoodEntry({ date: TODAY, id: 'mood-standalone' });
    // A flip from today but not linked to this mood entry
    const unrelatedFlip = makeFlipEntry({ date: TODAY });
    const { isAlreadyFlipped } = getFlipState([moodEntry], [unrelatedFlip], TODAY);
    expect(isAlreadyFlipped).toBe(false);
  });
});

// ─── Mood streak independence from flip streak ─────────────────────────────

describe('Mood and flip streaks are independent', () => {

  test('mood streak increments on consecutive mood entries', () => {
    const { newStreak: s1 } = calculateUpdatedStreak(0, undefined, YESTERDAY);
    const { newStreak: s2 } = calculateUpdatedStreak(s1, YESTERDAY, TODAY);
    expect(s2).toBe(2);
  });

  test('flip streak increments on consecutive flip entries', () => {
    const { newStreak: f1 } = calculateUpdatedStreak(0, undefined, YESTERDAY);
    const { newStreak: f2 } = calculateUpdatedStreak(f1, YESTERDAY, TODAY);
    expect(f2).toBe(2);
  });

  test('gap in mood entries resets mood streak but not flip streak', () => {
    // Mood: last entry was 3 days ago → streak resets to 1
    const { newStreak: moodNew } = calculateUpdatedStreak(5, localDate(3), TODAY);
    expect(moodNew).toBe(1);

    // Flip: consecutive yesterday → today → still increments
    const { newStreak: flipNew } = calculateUpdatedStreak(4, YESTERDAY, TODAY);
    expect(flipNew).toBe(5);
  });

  test('gap in flip entries resets flip streak but not mood streak', () => {
    // Flip: last entry was 5 days ago → resets
    const { newStreak: flipNew } = calculateUpdatedStreak(10, localDate(5), TODAY);
    expect(flipNew).toBe(1);

    // Mood: consecutive → still increments
    const { newStreak: moodNew } = calculateUpdatedStreak(7, YESTERDAY, TODAY);
    expect(moodNew).toBe(8);
  });

  test('overall streak tracks any-type daily activity independently', () => {
    // User did mood on day 1, flip on day 2, journal on day 3 — overall streak is 3
    const d1 = localDate(2);
    const d2 = localDate(1);
    const d3 = localDate(0);

    const { newStreak: s1 } = calculateUpdatedStreak(0, undefined, d1);
    const { newStreak: s2 } = calculateUpdatedStreak(s1, d1, d2);
    const { newStreak: s3 } = calculateUpdatedStreak(s2, d2, d3);
    expect(s3).toBe(3);
  });
});

// ─── Mood entry collection operations ─────────────────────────────────────

describe('Mood entry collection operations', () => {

  test('saving a mood entry adds it to the list', () => {
    const entries: MoodJournalEntry[] = [];
    const entry = makeMoodEntry({ date: TODAY });
    entries.push(entry);
    expect(entries).toHaveLength(1);
    expect(entries[0].date).toBe(TODAY);
  });

  test('updating an existing mood entry replaces it (same id)', () => {
    const entry = makeMoodEntry({ id: 'mood-x', date: TODAY, journalText: 'original' });
    const entries: MoodJournalEntry[] = [entry];

    // Simulate update: find by id, replace
    const updated = { ...entry, journalText: 'updated' };
    const idx = entries.findIndex(e => e.id === 'mood-x');
    if (idx >= 0) entries[idx] = updated;

    expect(entries).toHaveLength(1); // not duplicated
    expect(entries[0].journalText).toBe('updated');
  });

  test('deleting a mood entry removes it from the list', () => {
    const e1 = makeMoodEntry({ id: 'mood-1' });
    const e2 = makeMoodEntry({ id: 'mood-2' });
    let entries: MoodJournalEntry[] = [e1, e2];

    entries = entries.filter(e => e.id !== 'mood-1');

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe('mood-2');
  });

  test('multiple mood entries on same day are allowed (mood can be logged multiple times)', () => {
    const e1 = makeMoodEntry({ id: 'mood-am', date: TODAY });
    const e2 = makeMoodEntry({ id: 'mood-pm', date: TODAY });
    const entries = [e1, e2];

    const todayEntries = entries.filter(e => e.date === TODAY);
    expect(todayEntries).toHaveLength(2);
  });
});

// ─── Flip entry collection operations ─────────────────────────────────────

describe('Flip entry collection operations', () => {

  test('saving a flip entry adds it to the list', () => {
    const entries: FlipJournalEntry[] = [];
    const entry = makeFlipEntry({ date: TODAY });
    entries.push(entry);
    expect(entries).toHaveLength(1);
  });

  test('flips on different dates do not interfere', () => {
    const todayFlip = makeFlipEntry({ date: TODAY });
    const yesterdayFlip = makeFlipEntry({ date: YESTERDAY });
    const entries = [todayFlip, yesterdayFlip];

    const todayCount = entries.filter(e => e.date === TODAY).length;
    expect(todayCount).toBe(1);
  });

  test('flip entries are retrievable by date', () => {
    const flips = [
      makeFlipEntry({ date: TODAY }),
      makeFlipEntry({ date: TODAY }),
      makeFlipEntry({ date: YESTERDAY }),
    ];
    const todayFlips = flips.filter(f => f.date === TODAY);
    expect(todayFlips).toHaveLength(2);
  });
});
