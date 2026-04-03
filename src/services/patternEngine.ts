/**
 * Pattern Engine — rule-based mood pattern detection (Pro feature).
 *
 * Detects four pattern types from a user's recent mood entries:
 *   1. Repetition   — same area + mood >= 2× in last 4 days
 *   2. Escalation   — last 3 entries in same area show rising intensity
 *   3. Cross-area   — high-intensity entry in Area A consistently followed
 *                     by entry in Area B within 24 h (>= 2 occurrences);
 *                     upgraded to A → B → C cascade detection when evidence exists
 *   4. Withdrawal   — silence of >= 3 days following a high-intensity entry,
 *                     signalled on the user's return to journalling
 *
 * Priority: cross_area > escalation > repetition > withdrawal.
 * Only one insight is shown per entry submission.
 * The same pattern is suppressed for 48 h after it was last shown.
 *
 * HARD RULE: Patterns are always derived from user data.
 * Personality context ONLY adjusts interpretation, tone, and insight framing —
 * never detection logic.
 */

import {
  MoodJournalEntry,
  MoodContext,
  PatternType,
  PatternMemory,
  PatternInsight,
  PatternScoreLevel,
  IntensityTrajectory,
  RecoverySpeed,
  PatternStickiness,
  PersonalityContext,
} from '../../types';

import {
  buildPersonalityContext,
  getLanguageCues,
  matchLanguageCues,
} from './personalityPatterns';

// ---------------------------------------------------------------------------
// Internal result shape — richer than PatternInsight, used before AI phrasing
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
  // Enhanced dynamics
  cascade_chain?: MoodContext[];          // A→B→C sequence when detected
  intensity_trend?: IntensityTrajectory;
  recovery_time?: RecoverySpeed;
  stickiness?: PatternStickiness;
  spread?: MoodContext[];                 // all areas involved in cross-area spread
  language_cues_matched?: string[];
  confidence?: number;                    // 0–1, boosted by language cues
  personality_context?: PersonalityContext;
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
// Intensity trajectory
// ---------------------------------------------------------------------------

/**
 * Computes the directional trend across a set of entries ordered oldest → newest.
 * Returns 'volatile' when there are both upward and downward moves.
 */
export function computeIntensityTrajectory(entries: MoodJournalEntry[]): IntensityTrajectory {
  if (entries.length < 2) return 'stable';
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const values = sorted.map(e => intensityToNumber(e.intensity));
  let ups = 0;
  let downs = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) ups++;
    else if (values[i] < values[i - 1]) downs++;
  }
  if (ups > 0 && downs > 0) return 'volatile';
  if (ups > downs) return 'increasing';
  if (downs > ups) return 'decreasing';
  return 'stable';
}

// ---------------------------------------------------------------------------
// Recovery time
// ---------------------------------------------------------------------------

/**
 * Measures how quickly the user returned to baseline after their last high-intensity
 * entry in the same life area.
 * Returns 'none' when the current entry is itself high or there is no prior high entry.
 */
export function computeRecoveryTime(
  sameAreaEntries: MoodJournalEntry[],
  current: MoodJournalEntry,
): RecoverySpeed {
  if (current.intensity === 'high') return 'none';
  const lastHigh = [...sameAreaEntries]
    .filter(e => e.id !== current.id && e.intensity === 'high')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  if (!lastHigh) return 'none';
  const diffDays =
    (new Date(current.timestamp).getTime() - new Date(lastHigh.timestamp).getTime()) /
    (24 * 60 * 60 * 1000);
  if (diffDays <= 1) return 'fast';
  if (diffDays <= 3) return 'moderate';
  return 'slow';
}

// ---------------------------------------------------------------------------
// Pattern stickiness
// ---------------------------------------------------------------------------

/**
 * Rates how persistent a pattern is based on how often it has occurred
 * relative to the observation window.
 */
export function computeStickiness(occurrences: number, windowDays: number): PatternStickiness {
  const rate = occurrences / Math.max(windowDays, 1);
  if (rate >= 0.5) return 'high';
  if (rate >= 0.2) return 'moderate';
  return 'low';
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

  const allEntries = [...matches, current];
  const trajectory = computeIntensityTrajectory(allEntries);
  const recovery = computeRecoveryTime(matches, current);
  const stickiness = computeStickiness(matches.length + 1, 4);

  return {
    pattern_type: 'repetition',
    life_area: current.context,
    mood_type: current.emotion,
    occurrences: matches.length + 1,
    intensity_trend: trajectory,
    recovery_time: recovery,
    stickiness,
    spread: [current.context],
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
  const sameArea = recentEntries
    .filter(e => e.id !== current.id && e.context === current.context)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 2);

  if (sameArea.length < 2) return null;

  const ordered = [...sameArea].reverse();
  const trend = [
    intensityToNumber(ordered[0].intensity),
    intensityToNumber(ordered[1].intensity),
    intensityToNumber(current.intensity),
  ];

  const isStrictlyIncreasing = trend[0] < trend[1] && trend[1] < trend[2];
  if (!isStrictlyIncreasing) return null;

  const allThree = [...ordered, current];
  const recovery = computeRecoveryTime(sameArea, current);

  return {
    pattern_type: 'escalation',
    life_area: current.context,
    occurrences: 3,
    trend,
    intensity_trend: 'increasing',
    recovery_time: recovery,
    stickiness: computeStickiness(3, 4),
    spread: [current.context],
  };
}

/**
 * Cross-area — high-intensity entry in Area A is followed within 24 h by an
 * entry in Area B, and this sequence happened >= 2 times in the last 14 days.
 *
 * Upgraded: also detects A → B → C cascade when a third area can be traced.
 * Cascade is represented in the same cross_area result via cascade_chain.
 */
export function detectCrossArea(
  recentEntries: MoodJournalEntry[],
  current: MoodJournalEntry,
): PatternResult | null {
  const MS_24H = 24 * 60 * 60 * 1000;

  // ── Step 1: A → B (existing logic, current = B) ─────────────────────────
  const highEntries = recentEntries.filter(
    e => e.id !== current.id && e.intensity === 'high',
  );

  const sequenceCounts: Record<string, { source: MoodContext; target: MoodContext; count: number }> = {};

  for (const high of highEntries) {
    const diff = new Date(current.timestamp).getTime() - new Date(high.timestamp).getTime();
    if (diff > 0 && diff <= MS_24H && high.context !== current.context) {
      const key = `${high.context}->${current.context}`;
      if (!sequenceCounts[key]) {
        sequenceCounts[key] = { source: high.context, target: current.context, count: 0 };
      }
      sequenceCounts[key].count += 1;
    }
  }

  const bestAB = Object.values(sequenceCounts)
    .filter(s => s.count >= 2)
    .sort((a, b) => b.count - a.count)[0];

  // ── Step 2: A → B → C cascade (current = C) ─────────────────────────────
  // Look for entries in a different area (B) that occurred before current within 24h,
  // preceded by a high-intensity entry in area A within 24h of that B entry.
  const cTime = new Date(current.timestamp).getTime();

  const cascadeCounts: Record<string, {
    a: MoodContext; b: MoodContext; c: MoodContext; count: number;
  }> = {};

  const bCandidates = recentEntries.filter(
    e =>
      e.id !== current.id &&
      e.context !== current.context &&
      cTime - new Date(e.timestamp).getTime() > 0 &&
      cTime - new Date(e.timestamp).getTime() <= MS_24H,
  );

  for (const bEntry of bCandidates) {
    const bTime = new Date(bEntry.timestamp).getTime();
    const aHighEntries = recentEntries.filter(
      e =>
        e.id !== current.id &&
        e.id !== bEntry.id &&
        e.intensity === 'high' &&
        e.context !== bEntry.context &&
        bTime - new Date(e.timestamp).getTime() > 0 &&
        bTime - new Date(e.timestamp).getTime() <= MS_24H,
    );
    for (const aEntry of aHighEntries) {
      // Only meaningful if all three areas are distinct
      if (aEntry.context === current.context) continue;
      const cascadeKey = `${aEntry.context}->${bEntry.context}->${current.context}`;
      if (!cascadeCounts[cascadeKey]) {
        cascadeCounts[cascadeKey] = {
          a: aEntry.context,
          b: bEntry.context,
          c: current.context,
          count: 0,
        };
      }
      cascadeCounts[cascadeKey].count++;
    }
  }

  const bestCascade = Object.values(cascadeCounts)
    .filter(s => s.count >= 2)
    .sort((a, b) => b.count - a.count)[0];

  // ── Prefer cascade if detected, else standard A→B ───────────────────────
  if (!bestCascade && !bestAB) return null;

  if (bestCascade) {
    const chain: MoodContext[] = [bestCascade.a, bestCascade.b, bestCascade.c];
    return {
      pattern_type: 'cross_area',
      source_area: bestCascade.a,
      target_area: bestCascade.c,
      cascade_chain: chain,
      occurrences: bestCascade.count + 1,
      spread: chain,
      intensity_trend: computeIntensityTrajectory(recentEntries.slice(-5)),
      stickiness: computeStickiness(bestCascade.count + 1, 14),
    };
  }

  // Standard A→B
  const spread: MoodContext[] = [bestAB!.source, bestAB!.target];
  return {
    pattern_type: 'cross_area',
    source_area: bestAB!.source,
    target_area: bestAB!.target,
    occurrences: bestAB!.count + 1,
    spread,
    intensity_trend: computeIntensityTrajectory(recentEntries.slice(-5)),
    stickiness: computeStickiness(bestAB!.count + 1, 14),
  };
}

/**
 * Withdrawal — a high-intensity entry was followed by >= 3 days of silence,
 * and the current entry is the user's return after that gap.
 *
 * This signals a pattern of withdrawal rather than a structural escalation,
 * and is the lowest-priority pattern type.
 */
export function detectWithdrawal(
  recentEntries: MoodJournalEntry[],
  current: MoodJournalEntry,
): PatternResult | null {
  const MS_3DAYS = 3 * 24 * 60 * 60 * 1000;
  const cTime = new Date(current.timestamp).getTime();

  // Find the most recent high-intensity entry before current
  const lastHigh = [...recentEntries]
    .filter(e => e.id !== current.id && e.intensity === 'high')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  if (!lastHigh) return null;

  const highTime = new Date(lastHigh.timestamp).getTime();
  const gap = cTime - highTime;

  if (gap < MS_3DAYS) return null;

  // Confirm the gap is genuine: no entries between lastHigh and current
  const entriesBetween = recentEntries.filter(
    e =>
      e.id !== current.id &&
      e.id !== lastHigh.id &&
      new Date(e.timestamp).getTime() > highTime &&
      new Date(e.timestamp).getTime() < cTime,
  );
  if (entriesBetween.length > 0) return null;

  const gapDays = gap / (24 * 60 * 60 * 1000);
  const recovery: RecoverySpeed = gapDays >= 7 ? 'slow' : 'moderate';

  return {
    pattern_type: 'withdrawal',
    life_area: lastHigh.context,
    occurrences: 1,
    intensity_trend: 'decreasing',
    recovery_time: recovery,
    stickiness: 'low',
    spread: [lastHigh.context],
  };
}

// ---------------------------------------------------------------------------
// Prioritization
// ---------------------------------------------------------------------------

/** Return the single highest-priority pattern, or null. */
export function prioritize(patterns: (PatternResult | null)[]): PatternResult | null {
  const order: PatternType[] = ['cross_area', 'escalation', 'repetition', 'withdrawal'];
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
// Personality enrichment
// ---------------------------------------------------------------------------

/**
 * Enriches a detected pattern result with personality context.
 * Scans the entry's journal text for type-specific language cues and
 * adjusts the confidence and context of the pattern accordingly.
 *
 * HARD RULE: This never changes which pattern was detected — only adds
 * interpretive context for the insight generation step.
 */
export function applyPersonalityContext(
  result: PatternResult,
  currentEntry: MoodJournalEntry,
  mbtiType: string | undefined,
  enneagramType: string | undefined,
): PatternResult {
  if (!mbtiType && !enneagramType) return result;

  const intensityIsHigh = currentEntry.intensity === 'high';
  const personalityCtx = buildPersonalityContext(mbtiType, enneagramType, intensityIsHigh);
  if (!personalityCtx) return result;

  // Scan journal text for personality-specific language cues
  const cues = getLanguageCues(mbtiType, enneagramType);
  const matched = currentEntry.journalText
    ? matchLanguageCues(currentEntry.journalText, cues)
    : [];

  // Confidence: start at baseline 0.5, boost by language cues (max 1.0)
  const baseConfidence = result.confidence ?? 0.5;
  const boost = Math.min(matched.length * 0.1, 0.4);
  const confidence = Math.min(baseConfidence + boost, 1.0);

  return {
    ...result,
    language_cues_matched: matched.length > 0 ? matched : undefined,
    confidence,
    personality_context: personalityCtx,
  };
}

// ---------------------------------------------------------------------------
// Main entry point — run engine on a freshly submitted mood entry
// ---------------------------------------------------------------------------

/**
 * Runs all four detectors, picks the top pattern, checks suppression, updates
 * memory, and returns a PatternInsight ready for the modal (without AI text).
 *
 * The caller is responsible for:
 *   1. Passing the last-14-days entries (excluding the new entry)
 *   2. Looking up + passing existing PatternMemory for the detected pattern
 *   3. Saving the updated PatternMemory after this call
 *
 * @param personalityProfile  Optional user personality types for context enrichment.
 *                            Pass undefined when personalityInsightsEnabled is false.
 *
 * Returns null when no displayable pattern is found.
 */
export function runPatternEngine(
  recentEntries: MoodJournalEntry[],
  current: MoodJournalEntry,
  getMemory: (id: string) => PatternMemory | null,
  personalityProfile?: { mbtiType?: string; enneagramType?: string },
): {
  result: PatternResult;
  memory: PatternMemory;
  insight: Omit<PatternInsight, 'insight_text'>;
} | null {
  const patterns = [
    detectCrossArea(recentEntries, current),
    detectEscalation(recentEntries, current),
    detectRepetition(recentEntries, current),
    detectWithdrawal(recentEntries, current),
  ];

  let top = prioritize(patterns);
  if (!top) return null;

  // Apply personality enrichment when available
  if (personalityProfile?.mbtiType || personalityProfile?.enneagramType) {
    top = applyPersonalityContext(
      top,
      current,
      personalityProfile.mbtiType,
      personalityProfile.enneagramType,
    );
  }

  // Build the key for this pattern
  const key: Record<string, string> =
    top.pattern_type === 'cross_area'
      ? { source_area: top.source_area!, target_area: top.target_area! }
      : top.pattern_type === 'withdrawal'
      ? { life_area: top.life_area!, pattern: 'withdrawal' }
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
    cascade_chain: top.cascade_chain,
    occurrences: updatedOccurrences,
    score_level: scoreLevel,
    intensity_trend: top.intensity_trend,
    recovery_time: top.recovery_time,
    stickiness: top.stickiness,
    spread: top.spread,
    personality_context: top.personality_context,
    is_recurring: updatedOccurrences > 1,
  };

  return { result: top, memory: updatedMemory, insight };
}
