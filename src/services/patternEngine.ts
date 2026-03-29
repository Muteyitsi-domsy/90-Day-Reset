/**
 * Pattern Engine — rule-based mood pattern detection (Pro feature).
 *
 * Detects three pattern types from a user's recent mood entries:
 *   1. Repetition   — same area + mood >= 2× in last 4 days
 *   2. Escalation   — last 3 entries in same area show rising intensity
 *   3. Cross-area   — high-intensity entry in Area A consistently followed
 *                     by entry in Area B within 24 h (>= 2 occurrences)
 *
 * Priority: cross_area > escalation > repetition.
 * Only one insight is shown per entry submission.
 * The same pattern is suppressed for 48 h after it was last shown.
 */

import {
  MoodJournalEntry,
  MoodContext,
  PatternType,
  PatternMemory,
  PatternInsight,
  PatternScoreLevel,
} from '../../types';

// ---------------------------------------------------------------------------
// Internal result shape (richer than PatternInsight — used before AI phrasing)
// ---------------------------------------------------------------------------
export interface PatternResult {
  pattern_type: PatternType;
  life_area?: MoodContext;
  mood_type?: string;
  source_area?: MoodContext;
  target_area?: MoodContext;
  occurrences: number;
  /** Numeric intensities involved (for escalation trend display) */
  trend?: number[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map the three-level intensity to a comparable number. */
export function intensityToNumber(intensity: 'low' | 'medium' | 'high'): number {
  return intensity === 'high' ? 9 : intensity === 'medium' ? 6 : 3;
}

/** Return a YYYY-MM-DD string from an ISO timestamp. */
function toDateStr(iso: string): string {
  return iso.slice(0, 10);
}

/** Return YYYY-MM from an ISO date string. */
export function toMonthBucket(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Deterministic pattern ID — no external hashing library needed.
 * Format keeps IDs Firestore-safe (no slashes or special chars).
 */
export function buildPatternId(
  userId: string,
  patternType: PatternType,
  key: Record<string, string>,
): string {
  const keyStr = Object.entries(key)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
  // Simple djb2-style hash to keep the ID short
  let hash = 5381;
  const combined = `${userId}_${patternType}_${keyStr}`;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return `${patternType}_${hash.toString(36)}`;
}

// ---------------------------------------------------------------------------
// Detection functions
// ---------------------------------------------------------------------------

/**
 * Repetition — same life_area + mood_type appears >= 2 times in last 4 days
 * (not counting the current entry).
 */
export function detectRepetition(
  recentEntries: MoodJournalEntry[],
  current: MoodJournalEntry,
): PatternResult | null {
  const cutoff = new Date(current.timestamp);
  cutoff.setDate(cutoff.getDate() - 4);

  const matches = recentEntries.filter(
    e =>
      e.id !== current.id &&
      e.context === current.context &&
      e.emotion === current.emotion &&
      new Date(e.timestamp) >= cutoff,
  );

  if (matches.length < 2) return null;

  return {
    pattern_type: 'repetition',
    life_area: current.context,
    mood_type: current.emotion,
    occurrences: matches.length + 1, // +1 for current entry
  };
}

/**
 * Escalation — last 3 entries (including current) in same life_area show
 * strictly increasing intensity.
 */
export function detectEscalation(
  recentEntries: MoodJournalEntry[],
  current: MoodJournalEntry,
): PatternResult | null {
  // Gather same-area entries sorted newest-first, then take the 2 before current
  const sameArea = recentEntries
    .filter(e => e.id !== current.id && e.context === current.context)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 2);

  if (sameArea.length < 2) return null;

  // Arrange oldest → newest → current
  const ordered = [...sameArea].reverse();
  const trend = [
    intensityToNumber(ordered[0].intensity),
    intensityToNumber(ordered[1].intensity),
    intensityToNumber(current.intensity),
  ];

  const isStrictlyIncreasing = trend[0] < trend[1] && trend[1] < trend[2];
  if (!isStrictlyIncreasing) return null;

  return {
    pattern_type: 'escalation',
    life_area: current.context,
    occurrences: 3,
    trend,
  };
}

/**
 * Cross-area — high-intensity entry in Area A is followed within 24 h by an
 * entry in Area B, and this sequence happened >= 2 times in the last 14 days.
 */
export function detectCrossArea(
  recentEntries: MoodJournalEntry[],
  current: MoodJournalEntry,
): PatternResult | null {
  const MS_24H = 24 * 60 * 60 * 1000;

  // High-intensity entries other than the current one
  const highEntries = recentEntries.filter(
    e => e.id !== current.id && e.intensity === 'high',
  );

  // Map: "sourceArea → targetArea" → count
  const sequenceCounts: Record<string, { source: MoodContext; target: MoodContext; count: number }> =
    {};

  for (const high of highEntries) {
    // Check if the current entry follows this high-intensity one within 24 h
    const diff = new Date(current.timestamp).getTime() - new Date(high.timestamp).getTime();
    if (diff > 0 && diff <= MS_24H && high.context !== current.context) {
      const key = `${high.context}->${current.context}`;
      if (!sequenceCounts[key]) {
        sequenceCounts[key] = { source: high.context, target: current.context, count: 0 };
      }
      sequenceCounts[key].count += 1;
    }
  }

  // Find the most frequent cross-area sequence that hit >= 2
  const best = Object.values(sequenceCounts)
    .filter(s => s.count >= 2)
    .sort((a, b) => b.count - a.count)[0];

  if (!best) return null;

  return {
    pattern_type: 'cross_area',
    source_area: best.source,
    target_area: best.target,
    occurrences: best.count + 1,
  };
}

// ---------------------------------------------------------------------------
// Prioritization
// ---------------------------------------------------------------------------

/** Return the single highest-priority pattern, or null. */
export function prioritize(patterns: (PatternResult | null)[]): PatternResult | null {
  const order: PatternType[] = ['cross_area', 'escalation', 'repetition'];
  for (const type of order) {
    const match = patterns.find(p => p?.pattern_type === type);
    if (match) return match;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pattern score
// ---------------------------------------------------------------------------

export function computePatternScore(occurrences: number, avgIntensity: number): number {
  return occurrences * avgIntensity;
}

export function scoreToLevel(score: number): PatternScoreLevel {
  if (score <= 10) return 'Low';
  if (score <= 25) return 'Moderate';
  return 'High';
}

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

const SUPPRESS_MS = 48 * 60 * 60 * 1000;

/** Returns true if this pattern was shown within the last 48 hours. */
export function shouldSuppress(memory: PatternMemory | null): boolean {
  if (!memory?.last_shown) return false;
  return Date.now() - new Date(memory.last_shown).getTime() < SUPPRESS_MS;
}

// ---------------------------------------------------------------------------
// Main entry point — run engine on a freshly submitted mood entry
// ---------------------------------------------------------------------------

/**
 * Runs all three detectors, picks the top pattern, checks suppression, updates
 * memory, and returns a PatternInsight ready for the modal (without AI text).
 *
 * The caller is responsible for:
 *   1. Passing the last-14-days entries (excluding the new entry)
 *   2. Looking up + passing existing PatternMemory for the detected pattern
 *   3. Saving the updated PatternMemory after this call
 *
 * Returns null when no displayable pattern is found.
 */
export function runPatternEngine(
  recentEntries: MoodJournalEntry[],
  current: MoodJournalEntry,
  getMemory: (id: string) => PatternMemory | null,
): {
  result: PatternResult;
  memory: PatternMemory;
  insight: Omit<PatternInsight, 'insight_text'>;
} | null {
  const patterns = [
    detectCrossArea(recentEntries, current),
    detectEscalation(recentEntries, current),
    detectRepetition(recentEntries, current),
  ];

  const top = prioritize(patterns);
  if (!top) return null;

  // Build the key for this pattern
  const key: Record<string, string> =
    top.pattern_type === 'cross_area'
      ? { source_area: top.source_area!, target_area: top.target_area! }
      : { life_area: top.life_area!, mood_type: top.mood_type ?? '' };

  const patternId = buildPatternId('', top.pattern_type, key);
  const existing = getMemory(patternId);

  if (shouldSuppress(existing)) return null;

  // Average intensity for scoring
  const avgIntensity =
    top.trend
      ? top.trend.reduce((s, v) => s + v, 0) / top.trend.length
      : intensityToNumber(current.intensity);

  const updatedOccurrences = (existing?.occurrences ?? 0) + 1;
  const score = computePatternScore(updatedOccurrences, avgIntensity);
  const scoreLevel = scoreToLevel(score);

  const now = new Date().toISOString();
  const updatedMemory: PatternMemory = {
    pattern_id: patternId,
    user_id: existing?.user_id ?? '',
    pattern_type: top.pattern_type,
    key,
    occurrences: updatedOccurrences,
    last_seen: now,
    month_bucket: toMonthBucket(toDateStr(now)),
    last_shown: now,
  };

  const insight: Omit<PatternInsight, 'insight_text'> = {
    pattern_type: top.pattern_type,
    life_area: top.life_area,
    mood_type: top.mood_type,
    source_area: top.source_area,
    target_area: top.target_area,
    occurrences: updatedOccurrences,
    score_level: scoreLevel,
    is_recurring: updatedOccurrences > 1,
  };

  return { result: top, memory: updatedMemory, insight };
}
