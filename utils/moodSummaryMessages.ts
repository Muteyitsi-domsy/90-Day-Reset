// Templated encouraging messages for mood summaries
// One message per default emotion - custom emotions use the default fallback

export const MOOD_MESSAGES: Record<string, string> = {
  joyful: "Joy is contagious - by nurturing yours, you brighten the world around you.",
  calm: "In stillness, we find our truest selves.",
  energized: "Channel this vitality into what matters most to you.",
  anxious: "Anxiety often masks deeper wisdom trying to emerge. You kept showing up - that takes courage.",
  sad: "Tears water the seeds of future growth. Every emotion is temporary; your resilience is permanent.",
  angry: "Anger often points to boundaries that need protecting. Use this energy wisely.",
  overwhelmed: "Hang in there - the biggest waves pass. You don't have to carry everything at once.",
  grateful: "Gratitude literally rewires your brain for happiness. Keep counting blessings.",
};

// Used when predominant mood is a custom emotion or not in MOOD_MESSAGES
export const DEFAULT_MESSAGE = "You showed up for yourself this month. Every entry is a step toward self-understanding.";

// Used for the annual recap
export const ANNUAL_MESSAGE = "Congrats for navigating emotional waters skilfully. Looking forward to the next year!";

// Helper to get the appropriate message for a mood
export function getMessageForMood(emotion: string): string {
  return MOOD_MESSAGES[emotion.toLowerCase()] || DEFAULT_MESSAGE;
}
