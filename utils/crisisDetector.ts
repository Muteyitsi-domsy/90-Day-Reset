
// utils/crisisDetector.ts

export type CrisisSeverity = 0 | 1 | 2 | 3;
/**
 * 0 = no crisis language
 * 1 = low concern (distress wording, passive hopelessness)
 * 2 = moderate concern (talks about wanting to disappear, passive ideation)
 * 3 = high concern (explicit self-harm, suicidal intent, imminent danger)
 */

// HIGH SEVERITY: Explicit suicidal intent or imminent danger
// These are specific enough that they rarely have false positives
const HIGH_WORDS = [
  // Direct suicidal statements
  "i want to kill myself",
  "i'm going to kill myself",
  "i will kill myself",
  "want to kill myself",
  "wanna kill myself",
  "gonna kill myself",
  "i want to die",
  "i'm going to die by",
  "want to die",
  "wanna die",
  "ready to die",

  // End life variations
  "end my life",
  "end it all",
  "i will end it",
  "gonna end it all",
  "going to end it all",
  "want to end it all",
  "ready to end it all",

  // Suicide-related (explicit)
  "commit suicide",
  "kill myself",
  "suicidal thoughts",
  "feeling suicidal",
  "i am suicidal",
  "i'm suicidal",

  // No desire to live (explicit statements)
  "i don't want to live anymore",
  "don't want to live anymore",
  "i don't want to be alive",
  "don't want to be alive",

  // Internet slang (kms, ctb) handled by containsStandaloneAbbreviation() with word boundaries

  // Planning or method mentions
  "planned my suicide",
  "suicide plan",
  "how to kill myself",
  "ways to kill myself",
  "painless way to die",
  "goodbye cruel world",
  "this is my goodbye",
  "my final goodbye",
  "last goodbye forever",
];

// MODERATE SEVERITY: Explicit self-harm or clear passive ideation
// Kept specific - removed overly broad phrases
const MODERATE_WORDS = [
  // Self-harm explicit (with clear self-reference)
  "hurt myself",
  "hurting myself",
  "harm myself",
  "harming myself",
  "cutting myself",
  "cut myself",
  "burn myself",
  "burning myself",
  "self-harm",
  "self harm",

  // Overdose/substances (explicit)
  "overdose on",
  "od on pills",
  "take all my pills to",

  // Clear passive suicidal ideation
  "i wish i was dead",
  "wish i were dead",
  "i wish i wasn't alive",
  "better off dead",
  "world without me",
  "everyone would be better off without me",
  "better off without me",
  "i wish i could disappear forever",
  "wish i would just disappear",

  // Clear crisis states (with "i" self-reference)
  "i can't cope anymore",
  "i cannot cope anymore",
  "i've lost all control",

  // Explicit ending desires
  "end the pain permanently",
  "make it all stop forever",
  "stop existing",
];

// LOW SEVERITY: Distress, hopelessness, emotional pain
// These don't trigger the crisis modal but are tracked
// Includes phrases moved from MODERATE that were too broad
const LOW_WORDS = [
  // Hopelessness
  "hopeless",
  "no hope",
  "lost hope",
  "giving up hope",
  "lost all hope",

  // Worthlessness
  "worthless",
  "i'm worthless",
  "feel worthless",
  "i am worthless",
  "no worth",

  // Emotional emptiness
  "feel empty",
  "hollow inside",
  "feeling numb",
  "emotionally numb",

  // Overwhelm (common but worth noting)
  "overwhelmed",
  "too overwhelmed",
  "drowning in",
  "suffocating",

  // Giving up (general)
  "want to give up",
  "giving up on everything",
  "can't handle this",
  "cannot handle this",

  // Despair
  "in despair",
  "despairing",
  "feel crushed",
  "feel broken",
  "feel shattered",
  "feel destroyed",

  // Burden language
  "burden to everyone",
  "i'm a burden",
  "being a burden",

  // Dark thoughts (general)
  "dark place",
  "dark thoughts",
  "spiraling",
  "falling apart",

  // Moved from MODERATE - too broad without context
  "breaking point",
  "at my limit",
  "can't take it",
  "cannot take it",
  "too much to handle",
  "losing control",
  "lost control",
  "need to escape",
  "want to escape",
  "make it stop",
  "intrusive thoughts",
  "thoughts of death",
  "thinking about death",
  "thoughts of dying",
];

// NEGATION PATTERNS: Phrases that indicate user is NOT in crisis
const NEGATION_PATTERNS = [
  // Explicit negations
  /\b(not|never|no longer|don't|dont|doesn't|doesnt|wasn't|isn't|am not)\s+(want to|going to|thinking about|planning to|feel|feeling)\s+(kill|die|suicide|hurt|harm)/i,

  // Past tense (historical, not current)
  /\b(used to|once|previously|in the past|before|formerly|years ago|months ago)\s+(want|feel|think|consider|have)/i,

  // Helping others
  /\b(helping|supporting|preventing|stopping|talking to|counseling)\s+(someone|others|people|friend|a friend|my friend)/i,

  // Academic/professional context
  /\b(studying|researching|reading about|learning about|writing about|article about|book about)\s+(suicide|depression|mental health|crisis)/i,

  // Positive recovery language
  /\b(recovering from|recovered from|healing from|getting better|feeling better|no longer|glad i didn't|thankful i didn't)/i,

  // Discussing others' experiences
  /\b(my friend|a friend|someone i know|my family member|a colleague)\s+(is|was|has been|had been)/i,

  // Quoting or referencing
  /\b(they said|she said|he said|the article|the book|the show|in the movie)/i,
];

// CONTEXT-AWARE PATTERNS: Require additional context to trigger
// These patterns look for concerning phrases WITH self-referential context
const HIGH_CONTEXT_PATTERNS = [
  // Time-based urgency with suicidal content
  /\b(tonight|today|right now|soon|this week)\b.{0,30}\b(i will|i'm going to|going to|gonna)\b.{0,20}\b(die|kill|end it|end my life)\b/i,

  // Finality language with personal reference
  /\bmy\s+(final|last)\s+(message|words|letter|note|goodbye)\b/i,

  // Method + intent (specific)
  /\b(i have|i've got|i found|i bought)\s+(pills|knife|rope|gun|weapon)\s+(to|for|ready)\b/i,

  // Clear plan indication
  /\b(i plan to|i'm planning to|i've decided to|decided to)\s+(kill myself|end my life|die|commit suicide)\b/i,

  // Saying goodbye in crisis context
  /\b(goodbye|farewell)\s+(everyone|world|all).{0,20}(won't|will not|can't|cannot)\s+(see|be|make it)/i,
];

const MODERATE_CONTEXT_PATTERNS = [
  // Cutting/self-harm with clear self-reference (not "cutting vegetables")
  /\b(i've been|i am|i'm|i started|started)\s+(cutting|burning|hurting|harming)\b/i,

  // Escape in distress context (not "escape for vacation")
  /\b(need to|want to|have to)\s+escape\s+(from)?\s*(this life|everything|it all|my life|reality|the pain)/i,

  // Make it stop in existential context
  /\b(want|need)\s+(it|everything|this|the pain|my life)\s+to\s+stop\b/i,

  // Intrusive thoughts about self-harm specifically
  /\b(intrusive thoughts|can't stop thinking)\s+(about|of)\s+(hurting|harming|killing)\s+(myself|me)\b/i,

  // Thoughts of death with personal suffering context
  /\b(my|i have|i'm having)\s+(thoughts of|obsession with)\s+(death|dying|ending)\b/i,

  // Passive ideation patterns
  /\b(what if|wonder what|imagine if)\s+(i|my life)\s+(wasn't|weren't|ended|disappeared)\b/i,

  // Deteriorating state with crisis language
  /\b(i'm|i am)\s+(at|past|beyond)\s+(my|the)\s+(breaking point|limit|end)\b/i,
];

/**
 * Normalizes text for analysis
 */
function normalize(text: string): string {
  return text.toLowerCase().replace(/\n/g, " ").trim();
}

/**
 * Checks if text contains any of the specified words/phrases
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
 * Checks if text matches any high severity context pattern
 */
function matchesHighContextPattern(text: string): boolean {
  return HIGH_CONTEXT_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Checks if text matches any moderate severity context pattern
 */
function matchesModerateContextPattern(text: string): boolean {
  return MODERATE_CONTEXT_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Check for standalone abbreviations (kms, ctb) that aren't part of other words
 */
function containsStandaloneAbbreviation(text: string): boolean {
  // Match kms/ctb only as standalone words, not part of other words
  return /\b(kms|ctb)\b/i.test(text);
}

/**
 * Check for the word "suicide" or "suicidal" in concerning contexts
 * Avoids false positives from "suicide prevention", "suicide awareness", etc.
 */
function containsSuicideInConcerningContext(text: string): boolean {
  const t = text.toLowerCase();

  // Skip if in clearly educational/supportive context
  if (/\b(suicide\s+prevention|suicide\s+awareness|suicide\s+hotline|preventing\s+suicide|anti-suicide)\b/i.test(t)) {
    return false;
  }

  // Match concerning uses: "my suicide", "commit suicide", "thinking of suicide", etc.
  if (/\b(my|commit|committing|attempted|considering|thinking of|thoughts of|planning)\s+suicide\b/i.test(t)) {
    return true;
  }

  // "suicidal" with self-reference
  if (/\b(i am|i'm|i feel|feeling|i've been)\s+suicidal\b/i.test(t)) {
    return true;
  }

  return false;
}

/**
 * Enhanced crisis detection with context-aware matching.
 * Returns 0-3 severity level.
 *
 * Features:
 * - Focused keyword lists (reduced false positives)
 * - Negation detection
 * - Context-aware pattern matching for ambiguous phrases
 * - Standalone abbreviation detection
 *
 * @param text - The journal entry or text to analyze
 * @returns CrisisSeverity (0-3)
 */
export function detectCrisis(text: string): CrisisSeverity {
  const t = normalize(text);

  if (!t) return 0;

  // Check for negation patterns first (reduce false positives)
  const hasNegationContext = hasNegation(t);

  if (hasNegationContext) {
    // Even with negation, still check for very explicit current crisis language
    // But downgrade severity for most matches
    if (containsAny(t, ["i want to kill myself", "i'm going to kill myself", "kill myself today", "end my life tonight"])) {
      // These are so explicit that negation might not apply - check more carefully
      if (!/\b(not|never|no longer|don't)\s+(want to|going to)\s+kill/i.test(t)) {
        return 3; // Still high severity if direct statement without clear negation
      }
    }
    // With negation context, cap at severity 1 (low concern)
    if (containsAny(t, LOW_WORDS) || matchesModerateContextPattern(t)) {
      return 1;
    }
    return 0;
  }

  // HIGH SEVERITY: Check keywords, abbreviations, and context patterns
  if (containsAny(t, HIGH_WORDS)) {
    return 3;
  }

  if (containsStandaloneAbbreviation(t)) {
    return 3;
  }

  if (containsSuicideInConcerningContext(t)) {
    return 3;
  }

  if (matchesHighContextPattern(t)) {
    return 3;
  }

  // MODERATE SEVERITY: Check explicit self-harm keywords and context patterns
  if (containsAny(t, MODERATE_WORDS)) {
    return 2;
  }

  if (matchesModerateContextPattern(t)) {
    return 2;
  }

  // LOW SEVERITY: Distress language
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
