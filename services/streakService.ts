// ⚠️ Core streak math. Covered by tests.
// Do not modify without updating tests.

/**
 * Streak calculation service.
 * Pure functions for calculating and updating journal streaks.
 */

function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Normalize an ISO datetime or YYYY-MM-DD string to YYYY-MM-DD. */
function toDateOnly(dateStr: string): string {
  // If it's already YYYY-MM-DD (10 chars), return as-is
  if (dateStr.length === 10) return dateStr;
  // Otherwise parse as Date and extract local YYYY-MM-DD
  return getLocalDateString(new Date(dateStr));
}

function daysBetween(dateStrA: string, dateStrB: string): number {
  const a = new Date(toDateOnly(dateStrA) + 'T00:00:00');
  const b = new Date(toDateOnly(dateStrB) + 'T00:00:00');
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate an updated streak given the current streak state and a new entry date.
 *
 * Rules:
 * - Same day as last entry → no change
 * - Next consecutive day → increment by 1
 * - Gap > 1 day → reset to 1
 * - No previous entry → start at 1
 */
export function calculateUpdatedStreak(
  currentStreak: number,
  lastEntryDate: string | undefined,
  newEntryDate: string
): { newStreak: number; lastEntryDate: string } {
  if (!lastEntryDate) {
    return { newStreak: 1, lastEntryDate: newEntryDate };
  }

  const diff = daysBetween(newEntryDate, lastEntryDate);

  if (diff === 0) {
    // Same day — keep current streak (minimum 1)
    return { newStreak: Math.max(currentStreak, 1), lastEntryDate: newEntryDate };
  } else if (diff === 1) {
    // Consecutive day — increment
    return { newStreak: currentStreak + 1, lastEntryDate: newEntryDate };
  } else {
    // Gap > 1 day — reset
    return { newStreak: 1, lastEntryDate: newEntryDate };
  }
}

/**
 * Recalculate a streak from a list of unique entry dates (YYYY-MM-DD),
 * sorted most-recent-first. Walks backward from today counting consecutive days.
 *
 * This matches the existing mood streak recalculation pattern.
 */
export function recalculateStreakFromDates(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;

  let streak = 0;
  const checkDate = new Date();

  for (const date of sortedDatesDesc) {
    const checkDateStr = getLocalDateString(checkDate);
    if (date === checkDateStr) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
