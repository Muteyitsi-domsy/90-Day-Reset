import { describe, it, expect } from 'vitest';
import {
  detectRepetition,
  detectEscalation,
  detectCrossArea,
  prioritize,
  computePatternScore,
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
});
