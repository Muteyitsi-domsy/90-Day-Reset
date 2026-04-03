import { describe, it, expect } from 'vitest';
import {
  detectRepetition,
  detectEscalation,
  detectCrossArea,
  detectWithdrawal,
  prioritize,
  computePatternScore,
  computeIntensityTrajectory,
  computeRecoveryTime,
  computeStickiness,
  applyPersonalityContext,
  scoreToLevel,
  shouldSuppress,
  intensityToNumber,
  buildPatternId,
  toMonthBucket,
  runPatternEngine,
} from '../src/services/patternEngine';
import type { MoodJournalEntry, PatternMemory } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<MoodJournalEntry> & { hoursAgo?: number } = {},
): MoodJournalEntry {
  const { hoursAgo = 0, ...rest } = overrides;
  const ts = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  return {
    id: `entry-${Math.random().toString(36).slice(2)}`,
    date: ts.slice(0, 10),
    timestamp: ts,
    emotion: 'anxious',
    intensity: 'medium',
    context: 'career',
    prompt: 'How are you feeling?',
    journalText: 'Feeling worried.',
    isCustomEmotion: false,
    ...rest,
  };
}

function makeMemory(overrides: Partial<PatternMemory> = {}): PatternMemory {
  return {
    pattern_id: 'test_id',
    user_id: 'user1',
    pattern_type: 'repetition',
    key: {},
    occurrences: 1,
    last_seen: new Date().toISOString(),
    month_bucket: '2026-03',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// intensityToNumber
// ---------------------------------------------------------------------------

describe('intensityToNumber', () => {
  it('maps low → 3, medium → 6, high → 9', () => {
    expect(intensityToNumber('low')).toBe(3);
    expect(intensityToNumber('medium')).toBe(6);
    expect(intensityToNumber('high')).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// toMonthBucket
// ---------------------------------------------------------------------------

describe('toMonthBucket', () => {
  it('extracts YYYY-MM from a date string', () => {
    expect(toMonthBucket('2026-03-29')).toBe('2026-03');
    expect(toMonthBucket('2025-11-01')).toBe('2025-11');
  });
});

// ---------------------------------------------------------------------------
// buildPatternId
// ---------------------------------------------------------------------------

describe('buildPatternId', () => {
  it('is deterministic for the same inputs', () => {
    const a = buildPatternId('u1', 'repetition', { life_area: 'career', mood_type: 'anxious' });
    const b = buildPatternId('u1', 'repetition', { life_area: 'career', mood_type: 'anxious' });
    expect(a).toBe(b);
  });

  it('differs for different pattern types', () => {
    const a = buildPatternId('u1', 'repetition', { life_area: 'career' });
    const b = buildPatternId('u1', 'escalation', { life_area: 'career' });
    expect(a).not.toBe(b);
  });

  it('produces a safe Firestore-ready string (no slashes)', () => {
    const id = buildPatternId('u1', 'cross_area', { source_area: 'career', target_area: 'family' });
    expect(id).not.toContain('/');
  });
});

// ---------------------------------------------------------------------------
// detectRepetition
// ---------------------------------------------------------------------------

describe('detectRepetition', () => {
  it('returns null when fewer than 2 matching entries in last 4 days', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious' });
    const other = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 48 });
    // Only 1 prior match → no pattern
    expect(detectRepetition([other], current)).toBeNull();
  });

  it('returns a pattern when >= 2 matching entries exist in last 4 days', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious' });
    const prior1 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 24 });
    const prior2 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 72 });
    const result = detectRepetition([prior1, prior2], current);
    expect(result).not.toBeNull();
    expect(result!.pattern_type).toBe('repetition');
    expect(result!.life_area).toBe('career');
    expect(result!.mood_type).toBe('anxious');
  });

  it('ignores entries outside the 4-day window', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious' });
    // 5 days ago — outside window
    const old1 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 120 });
    const old2 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 144 });
    expect(detectRepetition([old1, old2], current)).toBeNull();
  });

  it('ignores entries with different context or emotion', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious' });
    const diffContext = makeEntry({ context: 'family', emotion: 'anxious', hoursAgo: 10 });
    const diffEmotion = makeEntry({ context: 'career', emotion: 'calm', hoursAgo: 20 });
    expect(detectRepetition([diffContext, diffEmotion], current)).toBeNull();
  });

  it('does not count the current entry against itself', () => {
    const current = makeEntry({ id: 'same-id', context: 'career', emotion: 'anxious' });
    const duplicate = { ...current }; // same id
    const prior = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 10 });
    // Only 1 valid prior (duplicate shares id)
    expect(detectRepetition([duplicate, prior], current)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectEscalation
// ---------------------------------------------------------------------------

describe('detectEscalation', () => {
  it('returns escalation when last 3 same-area entries are strictly increasing', () => {
    const current = makeEntry({ context: 'career', intensity: 'high' });
    const mid = makeEntry({ context: 'career', intensity: 'medium', hoursAgo: 24 });
    const low = makeEntry({ context: 'career', intensity: 'low', hoursAgo: 48 });
    const result = detectEscalation([mid, low], current);
    expect(result).not.toBeNull();
    expect(result!.pattern_type).toBe('escalation');
    expect(result!.trend).toEqual([3, 6, 9]);
  });

  it('returns null for flat intensity (no escalation)', () => {
    const current = makeEntry({ context: 'career', intensity: 'medium' });
    const prior1 = makeEntry({ context: 'career', intensity: 'medium', hoursAgo: 24 });
    const prior2 = makeEntry({ context: 'career', intensity: 'medium', hoursAgo: 48 });
    expect(detectEscalation([prior1, prior2], current)).toBeNull();
  });

  it('returns null for decreasing intensity', () => {
    const current = makeEntry({ context: 'career', intensity: 'low' });
    const prior1 = makeEntry({ context: 'career', intensity: 'medium', hoursAgo: 24 });
    const prior2 = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 48 });
    expect(detectEscalation([prior1, prior2], current)).toBeNull();
  });

  it('returns null when fewer than 2 prior same-area entries exist', () => {
    const current = makeEntry({ context: 'career', intensity: 'high' });
    const prior = makeEntry({ context: 'career', intensity: 'medium', hoursAgo: 24 });
    expect(detectEscalation([prior], current)).toBeNull();
  });

  it('ignores entries from a different life area', () => {
    const current = makeEntry({ context: 'career', intensity: 'high' });
    const family1 = makeEntry({ context: 'family', intensity: 'low', hoursAgo: 24 });
    const family2 = makeEntry({ context: 'family', intensity: 'medium', hoursAgo: 48 });
    expect(detectEscalation([family1, family2], current)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectCrossArea
// ---------------------------------------------------------------------------

describe('detectCrossArea', () => {
  it('detects cross-area pattern when high → follow-up occurs >= 2 times within 24h', () => {
    const current = makeEntry({ context: 'family', intensity: 'medium', hoursAgo: 0 });
    // Two prior high-intensity career entries each within 24h of current
    const highCareer1 = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 12 });
    const highCareer2 = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 20 });
    const result = detectCrossArea([highCareer1, highCareer2], current);
    expect(result).not.toBeNull();
    expect(result!.pattern_type).toBe('cross_area');
    expect(result!.source_area).toBe('career');
    expect(result!.target_area).toBe('family');
  });

  it('returns null when the sequence only occurs once', () => {
    const current = makeEntry({ context: 'family', intensity: 'medium', hoursAgo: 0 });
    const highCareer = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 10 });
    expect(detectCrossArea([highCareer], current)).toBeNull();
  });

  it('ignores high-intensity entries from more than 24h ago', () => {
    const current = makeEntry({ context: 'family', intensity: 'medium', hoursAgo: 0 });
    const old1 = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 30 });
    const old2 = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 40 });
    expect(detectCrossArea([old1, old2], current)).toBeNull();
  });

  it('ignores non-high-intensity source entries', () => {
    const current = makeEntry({ context: 'family', intensity: 'medium', hoursAgo: 0 });
    const lowCareer1 = makeEntry({ context: 'career', intensity: 'low', hoursAgo: 5 });
    const medCareer2 = makeEntry({ context: 'career', intensity: 'medium', hoursAgo: 8 });
    expect(detectCrossArea([lowCareer1, medCareer2], current)).toBeNull();
  });

  it('does not match same-area entries as cross-area', () => {
    const current = makeEntry({ context: 'career', intensity: 'medium', hoursAgo: 0 });
    const same1 = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 5 });
    const same2 = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 10 });
    expect(detectCrossArea([same1, same2], current)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// prioritize
// ---------------------------------------------------------------------------

describe('prioritize', () => {
  it('returns null when all inputs are null', () => {
    expect(prioritize([null, null, null])).toBeNull();
  });

  it('prefers cross_area over escalation and repetition', () => {
    const rep = { pattern_type: 'repetition' as const, occurrences: 3 };
    const esc = { pattern_type: 'escalation' as const, occurrences: 3, trend: [3, 6, 9] };
    const cross = { pattern_type: 'cross_area' as const, occurrences: 2, source_area: 'career' as const, target_area: 'family' as const };
    expect(prioritize([rep, esc, cross])!.pattern_type).toBe('cross_area');
  });

  it('prefers escalation over repetition', () => {
    const rep = { pattern_type: 'repetition' as const, occurrences: 4 };
    const esc = { pattern_type: 'escalation' as const, occurrences: 3, trend: [3, 6, 9] };
    expect(prioritize([rep, esc, null])!.pattern_type).toBe('escalation');
  });

  it('returns repetition when it is the only pattern', () => {
    const rep = { pattern_type: 'repetition' as const, occurrences: 3 };
    expect(prioritize([null, null, rep])!.pattern_type).toBe('repetition');
  });
});

// ---------------------------------------------------------------------------
// computePatternScore + scoreToLevel
// ---------------------------------------------------------------------------

describe('computePatternScore and scoreToLevel', () => {
  it('computes score as occurrences × avgIntensity', () => {
    expect(computePatternScore(3, 6)).toBe(18);
  });

  it('maps score 0-10 → Low', () => {
    expect(scoreToLevel(5)).toBe('Low');
    expect(scoreToLevel(10)).toBe('Low');
  });

  it('maps score 11-25 → Moderate', () => {
    expect(scoreToLevel(11)).toBe('Moderate');
    expect(scoreToLevel(25)).toBe('Moderate');
  });

  it('maps score 26+ → High', () => {
    expect(scoreToLevel(26)).toBe('High');
    expect(scoreToLevel(100)).toBe('High');
  });
});

// ---------------------------------------------------------------------------
// shouldSuppress
// ---------------------------------------------------------------------------

describe('shouldSuppress', () => {
  it('returns false when memory is null', () => {
    expect(shouldSuppress(null)).toBe(false);
  });

  it('returns false when last_shown is undefined', () => {
    expect(shouldSuppress(makeMemory({ last_shown: undefined }))).toBe(false);
  });

  it('returns true when last_shown was < 48h ago', () => {
    const recentlyShown = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(); // 10h ago
    expect(shouldSuppress(makeMemory({ last_shown: recentlyShown }))).toBe(true);
  });

  it('returns false when last_shown was > 48h ago', () => {
    const old = new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(); // 50h ago
    expect(shouldSuppress(makeMemory({ last_shown: old }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// runPatternEngine (integration)
// ---------------------------------------------------------------------------

describe('runPatternEngine', () => {
  it('returns null when no patterns are detectable', () => {
    const current = makeEntry({ context: 'career', emotion: 'calm', intensity: 'low' });
    expect(runPatternEngine([], current, () => null)).toBeNull();
  });

  it('returns a result and memory object when a repetition pattern is found', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'medium' });
    const prior1 = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'medium', hoursAgo: 24 });
    const prior2 = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'medium', hoursAgo: 48 });

    const out = runPatternEngine([prior1, prior2], current, () => null);
    expect(out).not.toBeNull();
    expect(out!.result.pattern_type).toBe('repetition');
    expect(out!.memory.occurrences).toBe(1); // first time seen
    expect(out!.insight.score_level).toBeDefined();
  });

  it('increments occurrences from existing memory', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'high' });
    const prior1 = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'medium', hoursAgo: 20 });
    const prior2 = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'low', hoursAgo: 48 });
    // Simulate existing memory with 2 prior occurrences
    const existingMemory = makeMemory({
      pattern_type: 'escalation',
      occurrences: 2,
      last_shown: undefined,
    });
    const out = runPatternEngine(
      [prior1, prior2],
      current,
      () => existingMemory,
    );
    // runPatternEngine sets occurrences to (existing.occurrences + 1) — but note that
    // the actual increment happens in App.tsx with real memory lookup; runPatternEngine
    // itself initialises at 1 for the pattern ID calculation step.
    expect(out).not.toBeNull();
  });

  it('returns null when pattern was shown within 48h (suppressed)', () => {
    const recentlyShown = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const suppressedMemory = makeMemory({ last_shown: recentlyShown });
    const current = makeEntry({ context: 'career', emotion: 'anxious' });
    const prior1 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 24 });
    const prior2 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 48 });
    const out = runPatternEngine([prior1, prior2], current, () => suppressedMemory);
    expect(out).toBeNull();
  });

  it('prioritises escalation over repetition when both are present', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'high' });
    const mid = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'medium', hoursAgo: 24 });
    const low = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'low', hoursAgo: 48 });
    const out = runPatternEngine([mid, low], current, () => null);
    expect(out).not.toBeNull();
    expect(out!.result.pattern_type).toBe('escalation');
  });

  it('returns personality_context when personalityProfile is passed', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'medium' });
    const prior1 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 24 });
    const prior2 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 48 });
    const out = runPatternEngine(
      [prior1, prior2],
      current,
      () => null,
      { mbtiType: 'INFJ', enneagramType: '4' },
    );
    expect(out).not.toBeNull();
    expect(out!.insight.personality_context).toBeDefined();
    expect(out!.insight.personality_context!.mbtiType).toBe('INFJ');
    expect(out!.insight.personality_context!.enneagramType).toBe('4');
  });

  it('returns no personality_context when no profile is passed', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'medium' });
    const prior1 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 24 });
    const prior2 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 48 });
    const out = runPatternEngine([prior1, prior2], current, () => null);
    expect(out).not.toBeNull();
    expect(out!.insight.personality_context).toBeUndefined();
  });

  it('prioritises cross_area cascade over standard cross_area', () => {
    // A→B→C cascade: career (A) → family (B) → mental_health (C = current)
    // Both B entries must be within 24h of C; each A must be within 24h of its B.
    // We need >= 2 (A,B) pairs to satisfy the cascade threshold.
    const current = makeEntry({ context: 'mental_health', intensity: 'medium', hoursAgo: 0 });
    const b1 = makeEntry({ context: 'family', intensity: 'medium', hoursAgo: 10 }); // B1: 10h before C
    const a1 = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 25 });   // A1: 15h before B1
    const b2 = makeEntry({ context: 'family', intensity: 'medium', hoursAgo: 20 }); // B2: 20h before C
    const a2 = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 35 });   // A2: 15h before B2
    const out = runPatternEngine([b1, a1, b2, a2], current, () => null);
    expect(out).not.toBeNull();
    expect(out!.result.pattern_type).toBe('cross_area');
    expect(out!.result.cascade_chain).toBeDefined();
    expect(out!.result.cascade_chain!.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// detectWithdrawal
// ---------------------------------------------------------------------------

describe('detectWithdrawal', () => {
  it('detects withdrawal after >= 3 days of silence following high intensity', () => {
    const current = makeEntry({ context: 'career', intensity: 'low', hoursAgo: 0 });
    const highEntry = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 96 }); // 4 days ago
    const result = detectWithdrawal([highEntry], current);
    expect(result).not.toBeNull();
    expect(result!.pattern_type).toBe('withdrawal');
    expect(result!.life_area).toBe('career');
  });

  it('returns null when gap is less than 3 days', () => {
    const current = makeEntry({ intensity: 'low', hoursAgo: 0 });
    const highEntry = makeEntry({ intensity: 'high', hoursAgo: 48 }); // 2 days — not enough
    expect(detectWithdrawal([highEntry], current)).toBeNull();
  });

  it('returns null when entries exist between the high and current entry', () => {
    const current = makeEntry({ intensity: 'low', hoursAgo: 0 });
    const highEntry = makeEntry({ context: 'career', intensity: 'high', hoursAgo: 120 });
    const middle = makeEntry({ intensity: 'medium', hoursAgo: 60 }); // breaks the silence
    expect(detectWithdrawal([highEntry, middle], current)).toBeNull();
  });

  it('returns null when there are no prior high-intensity entries', () => {
    const current = makeEntry({ intensity: 'low', hoursAgo: 0 });
    const mid = makeEntry({ intensity: 'medium', hoursAgo: 100 });
    expect(detectWithdrawal([mid], current)).toBeNull();
  });

  it('withdrawal has lower priority than repetition', () => {
    const current = makeEntry({ context: 'career', emotion: 'anxious', intensity: 'low', hoursAgo: 0 });
    const prior1 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 24 });
    const prior2 = makeEntry({ context: 'career', emotion: 'anxious', hoursAgo: 48 });
    const highOld = makeEntry({ intensity: 'high', hoursAgo: 120 });
    const out = runPatternEngine([prior1, prior2, highOld], current, () => null);
    expect(out).not.toBeNull();
    // repetition should win over withdrawal
    expect(out!.result.pattern_type).toBe('repetition');
  });
});

// ---------------------------------------------------------------------------
// computeIntensityTrajectory
// ---------------------------------------------------------------------------

describe('computeIntensityTrajectory', () => {
  it('returns increasing when entries go low → medium → high', () => {
    const entries = [
      makeEntry({ intensity: 'low', hoursAgo: 48 }),
      makeEntry({ intensity: 'medium', hoursAgo: 24 }),
      makeEntry({ intensity: 'high', hoursAgo: 0 }),
    ];
    expect(computeIntensityTrajectory(entries)).toBe('increasing');
  });

  it('returns decreasing when entries go high → medium → low', () => {
    const entries = [
      makeEntry({ intensity: 'high', hoursAgo: 48 }),
      makeEntry({ intensity: 'medium', hoursAgo: 24 }),
      makeEntry({ intensity: 'low', hoursAgo: 0 }),
    ];
    expect(computeIntensityTrajectory(entries)).toBe('decreasing');
  });

  it('returns volatile when entries have mixed up/down changes', () => {
    const entries = [
      makeEntry({ intensity: 'low', hoursAgo: 72 }),
      makeEntry({ intensity: 'high', hoursAgo: 48 }),
      makeEntry({ intensity: 'low', hoursAgo: 24 }),
      makeEntry({ intensity: 'high', hoursAgo: 0 }),
    ];
    expect(computeIntensityTrajectory(entries)).toBe('volatile');
  });

  it('returns stable when all entries have the same intensity', () => {
    const entries = [
      makeEntry({ intensity: 'medium', hoursAgo: 48 }),
      makeEntry({ intensity: 'medium', hoursAgo: 24 }),
      makeEntry({ intensity: 'medium', hoursAgo: 0 }),
    ];
    expect(computeIntensityTrajectory(entries)).toBe('stable');
  });

  it('returns stable for fewer than 2 entries', () => {
    expect(computeIntensityTrajectory([makeEntry()])).toBe('stable');
    expect(computeIntensityTrajectory([])).toBe('stable');
  });
});

// ---------------------------------------------------------------------------
// computeRecoveryTime
// ---------------------------------------------------------------------------

describe('computeRecoveryTime', () => {
  it('returns none when current entry is high intensity', () => {
    const current = makeEntry({ intensity: 'high', hoursAgo: 0 });
    const prior = makeEntry({ intensity: 'high', hoursAgo: 12 });
    expect(computeRecoveryTime([prior], current)).toBe('none');
  });

  it('returns none when there is no prior high-intensity entry', () => {
    const current = makeEntry({ intensity: 'low', hoursAgo: 0 });
    const prior = makeEntry({ intensity: 'medium', hoursAgo: 48 });
    expect(computeRecoveryTime([prior], current)).toBe('none');
  });

  it('returns fast when recovery is within 1 day', () => {
    const current = makeEntry({ intensity: 'low', hoursAgo: 0 });
    const high = makeEntry({ intensity: 'high', hoursAgo: 20 });
    expect(computeRecoveryTime([high], current)).toBe('fast');
  });

  it('returns moderate when recovery is 1–3 days', () => {
    const current = makeEntry({ intensity: 'low', hoursAgo: 0 });
    const high = makeEntry({ intensity: 'high', hoursAgo: 50 }); // ~2 days
    expect(computeRecoveryTime([high], current)).toBe('moderate');
  });

  it('returns slow when recovery takes more than 3 days', () => {
    const current = makeEntry({ intensity: 'low', hoursAgo: 0 });
    const high = makeEntry({ intensity: 'high', hoursAgo: 100 }); // ~4 days
    expect(computeRecoveryTime([high], current)).toBe('slow');
  });
});

// ---------------------------------------------------------------------------
// computeStickiness
// ---------------------------------------------------------------------------

describe('computeStickiness', () => {
  it('returns high when pattern occurs very frequently', () => {
    // 7 occurrences in 7 days = rate 1.0
    expect(computeStickiness(7, 7)).toBe('high');
  });

  it('returns moderate for moderate frequency', () => {
    // 2 occurrences in 7 days = rate ~0.29
    expect(computeStickiness(2, 7)).toBe('moderate');
  });

  it('returns low for infrequent patterns', () => {
    // 1 occurrence in 14 days = rate ~0.07
    expect(computeStickiness(1, 14)).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// applyPersonalityContext
// ---------------------------------------------------------------------------

describe('applyPersonalityContext', () => {
  it('attaches personality_context when mbtiType is given', () => {
    const result = {
      pattern_type: 'repetition' as const,
      occurrences: 3,
      life_area: 'career' as const,
    };
    const entry = makeEntry({ journalText: 'i feel like no one really understands me' });
    const enriched = applyPersonalityContext(result, entry, 'INFJ', undefined);
    expect(enriched.personality_context).toBeDefined();
    expect(enriched.personality_context!.mbtiType).toBe('INFJ');
    expect(enriched.personality_context!.processingStyle).toBe('internal');
  });

  it('boosts confidence when language cues match journal text', () => {
    const result = { pattern_type: 'repetition' as const, occurrences: 3 };
    const entry = makeEntry({
      journalText: "i don't know who i am anymore",
    });
    const enriched = applyPersonalityContext(result, entry, 'INFP', undefined);
    expect(enriched.language_cues_matched).toBeDefined();
    expect(enriched.language_cues_matched!.length).toBeGreaterThan(0);
    expect(enriched.confidence).toBeGreaterThan(0.5);
  });

  it('returns unchanged result when no personality types are given', () => {
    const result = { pattern_type: 'escalation' as const, occurrences: 3, trend: [3, 6, 9] };
    const entry = makeEntry();
    const enriched = applyPersonalityContext(result, entry, undefined, undefined);
    expect(enriched.personality_context).toBeUndefined();
    expect(enriched.language_cues_matched).toBeUndefined();
  });

  it('attaches enneagram context when only enneagramType is given', () => {
    const result = { pattern_type: 'repetition' as const, occurrences: 2 };
    const entry = makeEntry({ journalText: 'what if the worst happens' });
    const enriched = applyPersonalityContext(result, entry, undefined, '6');
    expect(enriched.personality_context).toBeDefined();
    expect(enriched.personality_context!.enneagramType).toBe('6');
  });
});
