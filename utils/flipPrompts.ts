/**
 * Flip Journal Prompts Utility
 * Provides fallback reframing questions when AI is unavailable
 * and helper functions for the Flip Journal feature
 */

// Fallback reframing questions for when AI is unavailable
// These are generic perspective-shifting questions from a wiser self
export const FALLBACK_REFRAMING_QUESTIONS: string[] = [
  "What would you tell your younger self if they came to you with this same challenge?",
  "If you knew this situation would lead to something beautiful, what might that be?",
  "What strength are you being invited to discover through this experience?",
  "Ten years from now, what wisdom will you have gained from navigating this?",
  "What would someone who deeply loves you see in this situation that you might be missing?",
  "If this challenge were a teacher, what lesson might it be offering?",
  "What small truth about yourself is this situation revealing?",
  "How might this be protecting you or preparing you for something ahead?",
  "What part of this story haven't you explored yet?",
  "If fear wasn't a factor, what possibility would you see here?",
  "What would change if you trusted yourself completely in this moment?",
  "What hidden gift might be wrapped in this difficult experience?",
];

/**
 * Gets a random fallback reframing question
 * Used when AI generation fails or is unavailable
 */
export function getRandomFallbackQuestion(): string {
  const randomIndex = Math.floor(Math.random() * FALLBACK_REFRAMING_QUESTIONS.length);
  return FALLBACK_REFRAMING_QUESTIONS[randomIndex];
}

/**
 * Character limit for challenge input
 * Keeps entries focused (~1-2 paragraphs)
 */
export const CHALLENGE_MAX_LENGTH = 500;

/**
 * Character limit for reframed perspective input
 * Encourages focused, thoughtful responses (~2 paragraphs)
 */
export const PERSPECTIVE_MAX_LENGTH = 800;

/**
 * Maximum entries allowed per day
 */
export const MAX_ENTRIES_PER_DAY = 3;

/**
 * Gets local date string in YYYY-MM-DD format
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Counts entries for a specific date
 */
export function countEntriesForDate(
  entries: Array<{ date: string }>,
  dateString: string
): number {
  return entries.filter(entry => entry.date === dateString).length;
}

/**
 * Checks if user can create a new entry today
 */
export function canCreateEntryToday(
  entries: Array<{ date: string }>,
  maxPerDay: number = MAX_ENTRIES_PER_DAY
): boolean {
  const today = getLocalDateString();
  const todayCount = countEntriesForDate(entries, today);
  return todayCount < maxPerDay;
}

/**
 * Gets remaining entries allowed for today
 */
export function getRemainingEntriesToday(
  entries: Array<{ date: string }>,
  maxPerDay: number = MAX_ENTRIES_PER_DAY
): number {
  const today = getLocalDateString();
  const todayCount = countEntriesForDate(entries, today);
  return Math.max(0, maxPerDay - todayCount);
}
