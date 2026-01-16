
// utils/crisisDetector.ts

export type CrisisSeverity = 0 | 1 | 2 | 3;
/**
 * 0 = no crisis language
 * 1 = low concern (distress wording, passive hopelessness)
 * 2 = moderate concern (talks about wanting to disappear, passive ideation)
 * 3 = high concern (explicit self-harm, suicidal intent, imminent danger)
 */

// HIGH SEVERITY: Explicit suicidal intent or imminent danger
const HIGH_WORDS = [
  // Direct suicidal statements
  "i want to kill myself",
  "i'm going to kill myself",
  "i will kill myself",
  "want to kill myself",
  "wanna kill myself",
  "gonna kill myself",
  "i want to die",
  "i'm going to die",
  "want to die",
  "wanna die",
  "going to die",
  "gonna die",
  "ready to die",

  // End life variations
  "end my life",
  "end it all",
  "i will end it",
  "gonna end it",
  "going to end it",
  "want to end it",
  "ready to end it",

  // Suicide-related
  "suicide",
  "suicidal",
  "commit suicide",
  "kill myself",

  // No desire to live
  "i don't want to live",
  "don't want to live",
  "can't go on",
  "cannot go on",
  "won't make it",
  "can't make it",

  // Internet slang/abbreviations
  "kms", // kill myself
  "ctb", // cease to breathe

  // Planning or method mentions
  "planned my suicide",
  "suicide plan",
  "how to kill myself",
  "ways to die",
  "painless death",
  "goodbye cruel world",
  "this is goodbye",
  "my final",
  "last goodbye",
];

// MODERATE SEVERITY: Self-harm, passive ideation, or strong distress
const MODERATE_WORDS = [
  // Self-harm explicit
  "hurt myself",
  "self-harm",
  "self harm",
  "harm myself",
  "cutting myself",
  "cut myself",
  "cutting",
  "burn myself",
  "burning myself",

  // Overdose/substances
  "overdose",
  "od on",
  "take all my pills",
  "take pills",

  // Passive suicidal ideation
  "i might hurt myself",
  "i wish i wasn't here",
  "wish i would disappear",
  "wish i was dead",
  "wish i were dead",
  "better off dead",
  "world without me",
  "everyone better off",
  "better off without me",

  // Crisis states
  "i can't cope",
  "cannot cope",
  "losing control",
  "lost control",
  "breaking point",
  "can't take it",
  "cannot take it",
  "too much to handle",

  // Escape-focused language
  "need to escape",
  "want to escape",
  "make it stop",
  "end the pain",
  "stop existing",

  // Harm ideation
  "intrusive thoughts",
  "thoughts of dying",
  "thoughts of death",
  "thinking about death",
  "obsessing about death",
];

// LOW SEVERITY: Distress, hopelessness, emotional pain
const LOW_WORDS = [
  // Hopelessness
  "hopeless",
  "no hope",
  "lost hope",
  "giving up hope",

  // Worthlessness
  "worthless",
  "i'm worthless",
  "feel worthless",
  "no worth",

  // Emotional emptiness
  "empty",
  "feel empty",
  "hollow inside",
  "numb",
  "feeling numb",
  "emotionally numb",

  // Overwhelm
  "overwhelmed",
  "too overwhelmed",
  "drowning",
  "suffocating",

  // Giving up
  "give up",
  "giving up",
  "want to give up",
  "can't handle",
  "cannot handle",

  // Despair
  "despair",
  "despairing",
  "crushed",
  "broken",
  "shattered",
  "destroyed",

  // Burden language
  "burden to everyone",
  "a burden",
  "burdening",

  // Dark thoughts
  "dark place",
  "dark thoughts",
  "spiraling",
  "falling apart",
];

// NEGATION PATTERNS: Phrases that indicate user is NOT in crisis
const NEGATION_PATTERNS = [
  // Explicit negations
  /\b(not|never|no longer|don't|dont|doesn't|doesnt)\s+(want to|going to|thinking about|planning to|feel|feeling)\s+(kill|die|suicide|hurt|harm)/i,

  // Past tense (historical, not current)
  /(used to|once|previously|in the past|before|formerly)\s+(want|feel|think|consider)/i,

  // Helping others
  /(helping|supporting|preventing|stopping)\s+(someone|others|people|friend)/i,

  // Academic/professional context
  /(studying|researching|reading about|learning about|writing about)\s+(suicide|depression|mental health)/i,

  // Positive recovery language
  /(recovering from|recovered from|healing from|getting better|feeling better|no longer)/i,
];

// PATTERN-BASED DETECTION: Regex patterns for indirect language
const HIGH_SEVERITY_PATTERNS = [
  // Time-based urgency
  /\b(tonight|today|right now|very soon|this week)\b.*\b(die|kill|end it|suicide)\b/i,

  // Finality language
  /\b(final|last|goodbye|farewell)\b.*\b(message|words|time|day|night)\b/i,

  // Method + intent
  /\b(have|got|found)\s+(pills|knife|rope|gun|weapon)\b/i,

  // Plan indication
  /\b(plan to|planning to|decided to|going to)\s+(kill|die|end|suicide)\b/i,
];

const MODERATE_SEVERITY_PATTERNS = [
  // Frequency patterns (repeated thoughts)
  /\b(always|constantly|every day|all the time|can't stop)\s+(thinking about|thoughts of)\s+(death|dying|ending|hurting)\b/i,

  // Ideation without plan
  /\b(wonder|imagine|think about|fantasize)\s+(what it|how it|if i)\s+(died|wasn't here|disappeared)\b/i,

  // Deteriorating state
  /\b(getting worse|spiraling|losing|can't|cannot)\s+(control|handle|cope|function)\b/i,
];

/**
 * Normalizes text for analysis
 */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\n/g, " ").trim();
}

/**
 * Checks if text contains any of the specified words
 */
function containsAny(text: string, words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/**
 * Checks if text matches any negation pattern (reduces false positives)
 */
function hasNegation(text: string): boolean {
  return NEGATION_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Checks if text matches any high severity pattern
 */
function matchesHighPattern(text: string): boolean {
  return HIGH_SEVERITY_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Checks if text matches any moderate severity pattern
 */
function matchesModeratePattern(text: string): boolean {
  return MODERATE_SEVERITY_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Enhanced crisis detection with pattern matching and negation detection.
 * Returns 0-3 severity level.
 *
 * Features:
 * - Expanded keyword lists with slang and variations
 * - Negation detection to reduce false positives
 * - Pattern-based matching for indirect language
 * - Context-aware severity scoring
 *
 * @param text - The journal entry or text to analyze
 * @returns CrisisSeverity (0-3)
 */
export function detectCrisis(text: string): CrisisSeverity {
  const t = normalize(text);

  if (!t) return 0;

  // Check for negation patterns first (reduce false positives)
  if (hasNegation(text)) {
    // If negation detected, downgrade severity by one level
    // Still check for patterns in case negation is weak
    if (matchesModeratePattern(t) || containsAny(t, MODERATE_WORDS)) {
      return 1; // Downgrade moderate to low
    }
    if (containsAny(t, LOW_WORDS)) {
      return 0; // Downgrade low to none
    }
    return 0;
  }

  // HIGH SEVERITY: Check both keywords and patterns
  if (containsAny(t, HIGH_WORDS) || matchesHighPattern(t)) {
    return 3;
  }

  // MODERATE SEVERITY: Check both keywords and patterns
  if (containsAny(t, MODERATE_WORDS) || matchesModeratePattern(t)) {
    return 2;
  }

  // LOW SEVERITY: Distress language only
  if (containsAny(t, LOW_WORDS)) {
    return 1;
  }

  return 0;
}

/**
 * Gets a human-readable description of the crisis severity level
 */
export function getCrisisDescription(severity: CrisisSeverity): string {
  switch (severity) {
    case 3:
      return "High concern: Explicit self-harm or suicidal intent detected";
    case 2:
      return "Moderate concern: Self-harm ideation or strong distress detected";
    case 1:
      return "Low concern: Distress or hopelessness language detected";
    case 0:
    default:
      return "No crisis language detected";
  }
}

/**
 * Returns crisis support resources based on severity
 */
export function getCrisisResources(severity: CrisisSeverity): string[] {
  if (severity >= 3) {
    return [
      "🆘 National Suicide Prevention Lifeline: 988 (US)",
      "🆘 Crisis Text Line: Text HOME to 741741",
      "🆘 International: findahelpline.com",
      "⚠️ If in immediate danger, call emergency services (911)",
    ];
  }

  if (severity >= 2) {
    return [
      "📞 National Suicide Prevention Lifeline: 988 (US)",
      "💬 Crisis Text Line: Text HOME to 741741",
      "🌐 International: findahelpline.com",
      "Consider reaching out to a trusted friend, family member, or therapist",
    ];
  }

  if (severity >= 1) {
    return [
      "Consider talking to a mental health professional",
      "Reach out to supportive friends or family",
      "Practice self-care and coping strategies",
      "Crisis resources available 24/7: 988 (US) or text HOME to 741741",
    ];
  }

  return [];
}
