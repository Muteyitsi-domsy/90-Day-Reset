
// utils/crisisDetector.ts

export type CrisisSeverity = 0 | 1 | 2 | 3;
/**
 * 0 = no crisis language
 * 1 = low concern (distress wording, passive hopelessness)
 * 2 = moderate concern (talks about wanting to disappear, passive ideation)
 * 3 = high concern (explicit self-harm, suicidal intent, imminent danger)
 */

const HIGH_WORDS = [
  "i want to kill myself",
  "i'm going to kill myself",
  "i will kill myself",
  "i want to die",
  "i'm going to die",
  "end my life",
  "suicide",
  "suicidal",
  "i will end it",
  "i don't want to live",
  "i can't go on",
  "want to end it all",
];

const MODERATE_WORDS = [
  "hurt myself",
  "self-harm",
  "harm myself",
  "cutting",
  "cut myself",
  "overdose",
  "abuse",
  "i might hurt myself",
  "i wish i wasn't here",
  "wish i would disappear",
  "i can't cope",
];

const LOW_WORDS = [
  "hopeless",
  "worthless",
  "empty",
  "overwhelmed",
  "can't handle",
  "numb",
  "crushed",
  "give up",
];

function normalize(text: string) {
  return text.toLowerCase().replace(/\n/g, " ").trim();
}

function containsAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

/**
 * Basic heuristic detection. Returns 0-3 severity.
 * This is intentionally conservative: any explicit phrase in HIGH_WORDS => severity 3.
 * If moderate words exist => severity 2. Low words => 1. Otherwise 0.
 *
 * You can extend this with pattern matches, ML classifier, or confidence weighting.
 */
export function detectCrisis(text: string): CrisisSeverity {
  const t = normalize(text);

  if (!t) return 0;

  if (containsAny(t, HIGH_WORDS)) return 3;
  if (containsAny(t, MODERATE_WORDS)) return 2;
  if (containsAny(t, LOW_WORDS)) return 1;

  return 0;
}
