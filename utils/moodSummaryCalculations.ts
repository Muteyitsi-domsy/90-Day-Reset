import type { MoodJournalEntry, MoodSummaryState, MonthlySummaryData, AnnualRecapData, CustomEmotion } from '../types';
import { DEFAULT_EMOTION_EMOJIS } from './moodPrompts';
import { getMessageForMood } from './moodSummaryMessages';

// Month names for display
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Get emoji for an emotion (handles both default and custom)
export function getEmotionEmoji(emotion: string, customEmotions: CustomEmotion[] = []): string {
  // Check default emotions first
  const defaultEmoji = DEFAULT_EMOTION_EMOJIS[emotion as keyof typeof DEFAULT_EMOTION_EMOJIS];
  if (defaultEmoji) return defaultEmoji;

  // Check custom emotions
  const customEmotion = customEmotions.find(c => c.name.toLowerCase() === emotion.toLowerCase());
  if (customEmotion) return customEmotion.emoji;

  // Fallback emoji
  return '💫';
}

// Check if monthly summary should be shown
// Triggers: 1st of month (or Dec 30 for December) for previous month
export function shouldShowMonthlySummary(
  summaryState: MoodSummaryState | undefined,
  moodEntries: MoodJournalEntry[]
): { shouldShow: boolean; month: number; year: number } {
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentYear = now.getFullYear();

  // Determine which month to summarize
  let targetMonth: number;
  let targetYear: number;

  if (currentMonth === 11) {
    // December: trigger on Dec 30 for November
    if (currentDay >= 30) {
      targetMonth = 10; // November (0-indexed)
      targetYear = currentYear;
    } else if (currentDay === 1) {
      // Dec 1st: still show November if not already shown
      targetMonth = 10;
      targetYear = currentYear;
    } else {
      return { shouldShow: false, month: 0, year: 0 };
    }
  } else if (currentDay === 1) {
    // 1st of any other month: show previous month
    targetMonth = currentMonth - 1;
    targetYear = currentYear;
    if (targetMonth < 0) {
      targetMonth = 11;
      targetYear = currentYear - 1;
    }
  } else if (currentDay <= 7 && currentMonth === 0) {
    // First week of January: allow showing December summary
    targetMonth = 11;
    targetYear = currentYear - 1;
  } else {
    return { shouldShow: false, month: 0, year: 0 };
  }

  // Check if already shown for this month
  const targetKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  if (summaryState?.lastMonthlySummaryShown === targetKey) {
    return { shouldShow: false, month: 0, year: 0 };
  }

  // Check if there are entries for the target month
  const entriesForMonth = moodEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === targetMonth && entryDate.getFullYear() === targetYear;
  });

  if (entriesForMonth.length === 0) {
    return { shouldShow: false, month: 0, year: 0 };
  }

  return { shouldShow: true, month: targetMonth, year: targetYear };
}

// Check if annual recap should be shown (Dec 31 - Jan 6 window)
export function shouldShowAnnualRecap(
  summaryState: MoodSummaryState | undefined,
  moodEntries: MoodJournalEntry[]
): { shouldShow: boolean; year: number; isWithinDownloadWindow: boolean } {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const currentYear = now.getFullYear();

  let targetYear: number;
  let isWithinWindow = false;

  // Check if within Dec 31 - Jan 6 window
  if (currentMonth === 11 && currentDay === 31) {
    // Dec 31st
    targetYear = currentYear;
    isWithinWindow = true;
  } else if (currentMonth === 0 && currentDay <= 6) {
    // Jan 1-6
    targetYear = currentYear - 1;
    isWithinWindow = true;
  } else {
    return { shouldShow: false, year: 0, isWithinDownloadWindow: false };
  }

  // Check if already shown for this year
  if (summaryState?.lastAnnualSummaryShown === targetYear) {
    // Already shown, but might still be within download window
    return { shouldShow: false, year: targetYear, isWithinDownloadWindow: isWithinWindow };
  }

  // Check if there are entries for the target year
  const entriesForYear = moodEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getFullYear() === targetYear;
  });

  if (entriesForYear.length === 0) {
    return { shouldShow: false, year: 0, isWithinDownloadWindow: false };
  }

  return { shouldShow: true, year: targetYear, isWithinDownloadWindow: isWithinWindow };
}

// Calculate monthly summary data
export function calculateMonthlySummary(
  entries: MoodJournalEntry[],
  month: number, // 0-indexed
  year: number,
  customEmotions: CustomEmotion[] = []
): MonthlySummaryData | null {
  // Filter entries for the target month
  const monthEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getMonth() === month && entryDate.getFullYear() === year;
  });

  if (monthEntries.length === 0) return null;

  // Count emotions
  const emotionCounts: Record<string, number> = {};
  monthEntries.forEach(entry => {
    const emotion = entry.emotion.toLowerCase();
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  });

  // Find predominant mood
  let predominantMood = '';
  let maxCount = 0;
  Object.entries(emotionCounts).forEach(([emotion, count]) => {
    if (count > maxCount) {
      maxCount = count;
      predominantMood = emotion;
    }
  });

  // Capitalize first letter
  predominantMood = predominantMood.charAt(0).toUpperCase() + predominantMood.slice(1);

  return {
    month: month + 1, // 1-indexed for display
    year,
    predominantMood,
    moodEmoji: getEmotionEmoji(predominantMood.toLowerCase(), customEmotions),
    moodCount: maxCount,
    totalEntries: monthEntries.length,
    encouragingMessage: getMessageForMood(predominantMood.toLowerCase()),
  };
}

// Calculate longest streak from entries
function calculateLongestStreak(entries: MoodJournalEntry[]): number {
  if (entries.length === 0) return 0;

  // Sort by date
  const sortedEntries = [...entries].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get unique dates
  const uniqueDates = [...new Set(sortedEntries.map(e => e.date))].sort();

  if (uniqueDates.length === 0) return 0;

  let maxStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return maxStreak;
}

// Find most active month
function findMostActiveMonth(entries: MoodJournalEntry[]): string {
  if (entries.length === 0) return 'N/A';

  const monthCounts: Record<string, number> = {};

  entries.forEach(entry => {
    const date = new Date(entry.date);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
    monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
  });

  let maxMonth = '';
  let maxCount = 0;

  Object.entries(monthCounts).forEach(([key, count]) => {
    if (count > maxCount) {
      maxCount = count;
      maxMonth = key;
    }
  });

  if (!maxMonth) return 'N/A';

  const [year, monthIndex] = maxMonth.split('-').map(Number);
  return MONTH_NAMES[monthIndex];
}

// Calculate annual recap data
export function calculateAnnualRecap(
  entries: MoodJournalEntry[],
  year: number,
  customEmotions: CustomEmotion[] = []
): AnnualRecapData | null {
  // Filter entries for the target year
  const yearEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getFullYear() === year;
  });

  if (yearEntries.length === 0) return null;

  // Count emotions
  const emotionCounts: Record<string, number> = {};
  yearEntries.forEach(entry => {
    const emotion = entry.emotion.toLowerCase();
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  });

  // Sort by count and take top moods
  const sortedEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5 moods

  const topMoods = sortedEmotions.map(([emotion, count]) => ({
    emotion: emotion.charAt(0).toUpperCase() + emotion.slice(1),
    emoji: getEmotionEmoji(emotion, customEmotions),
    count,
    percentage: Math.round((count / yearEntries.length) * 100),
  }));

  return {
    year,
    topMoods,
    totalEntries: yearEntries.length,
    longestStreak: calculateLongestStreak(yearEntries),
    mostActiveMonth: findMostActiveMonth(yearEntries),
  };
}

// Get days remaining in download window (for annual recap)
export function getDaysRemainingInWindow(): number {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  if (currentMonth === 11 && currentDay === 31) {
    return 7; // Full week remaining
  } else if (currentMonth === 0 && currentDay <= 6) {
    return 7 - currentDay; // Days until Jan 6
  }

  return 0;
}
