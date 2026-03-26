/**
 * Tests for custom emotion creation: emoji validation, grapheme extraction,
 * name sanitization, and the storage boundary guard.
 *
 * The pure functions below mirror the exact logic added to:
 *   - MoodInputModal.tsx  (isValidEmoji, handleEmojiChange)
 *   - App.tsx             (handleAddCustomEmotion → sanitizeText on name)
 *
 * If any of those change these tests must be updated — they act as
 * change-detectors for the custom emotion input pipeline.
 */

import { describe, test, expect } from 'vitest';
import { sanitizeText } from '../src/utils/validation';

// ─── Mirrors MoodInputModal.tsx isValidEmoji ──────────────────────────────

function isValidEmoji(str: string): boolean {
  return str.length > 0 && /\p{Extended_Pictographic}/u.test(str);
}

// ─── Mirrors MoodInputModal.tsx handleEmojiChange (pure transform) ─────────
// Takes raw input string, returns the first grapheme cluster only.

function extractFirstGrapheme(raw: string): string {
  if (!raw) return '';
  const segmenter = new Intl.Segmenter();
  return Array.from(segmenter.segment(raw))[0]?.segment ?? '';
}

// ─── Mirrors App.tsx handleAddCustomEmotion name sanitization ──────────────

function buildCustomEmotion(rawName: string, emoji: string) {
  return {
    id: `custom-test`,
    name: sanitizeText(rawName),
    emoji,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// isValidEmoji
// ═══════════════════════════════════════════════════════════════════════════

describe('isValidEmoji — accepts real emoji', () => {

  test('basic smiley face', () => {
    expect(isValidEmoji('😊')).toBe(true);
  });

  test('commonly used basic emoji', () => {
    expect(isValidEmoji('🥺')).toBe(true);
    expect(isValidEmoji('🙏')).toBe(true);
    expect(isValidEmoji('💭')).toBe(true);
    expect(isValidEmoji('🔥')).toBe(true);
  });

  test('skin-tone variant (4 UTF-16 code units)', () => {
    expect(isValidEmoji('👋🏻')).toBe(true); // waving hand + light skin tone
    expect(isValidEmoji('👍🏾')).toBe(true); // thumbs up + medium-dark skin tone
  });

  test('ZWJ sequence — family emoji', () => {
    expect(isValidEmoji('👨‍👩‍👧‍👦')).toBe(true);
  });

  test('ZWJ sequence — rainbow flag', () => {
    expect(isValidEmoji('🏳️‍🌈')).toBe(true);
  });

  test('heart with variation selector', () => {
    expect(isValidEmoji('❤️')).toBe(true);
  });
});

describe('isValidEmoji — rejects non-emoji input', () => {

  test('plain letter', () => {
    expect(isValidEmoji('A')).toBe(false);
  });

  test('number', () => {
    expect(isValidEmoji('3')).toBe(false);
  });

  test('word', () => {
    expect(isValidEmoji('happy')).toBe(false);
  });

  test('empty string', () => {
    expect(isValidEmoji('')).toBe(false);
  });

  test('whitespace only', () => {
    expect(isValidEmoji('   ')).toBe(false);
  });

  test('punctuation', () => {
    expect(isValidEmoji('!')).toBe(false);
    expect(isValidEmoji(':)')).toBe(false);
  });

  test('null byte', () => {
    expect(isValidEmoji('\0')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// extractFirstGrapheme — Intl.Segmenter grapheme extraction
// ═══════════════════════════════════════════════════════════════════════════

describe('extractFirstGrapheme — keeps exactly one visual character', () => {

  test('basic emoji returns that emoji', () => {
    expect(extractFirstGrapheme('😊')).toBe('😊');
  });

  test('skin-tone variant is kept intact as a single cluster', () => {
    const result = extractFirstGrapheme('👋🏻');
    // The whole variant (base + modifier) must come back, not just the base
    expect(result).toBe('👋🏻');
    // And it must still pass emoji validation
    expect(isValidEmoji(result)).toBe(true);
  });

  test('ZWJ family emoji is kept intact as a single cluster', () => {
    const result = extractFirstGrapheme('👨‍👩‍👧‍👦');
    expect(result).toBe('👨‍👩‍👧‍👦');
    expect(isValidEmoji(result)).toBe(true);
  });

  test('only the first emoji is kept when user types two', () => {
    const result = extractFirstGrapheme('😊🔥');
    expect(result).toBe('😊');
  });

  test('only the first grapheme is kept when user types emoji + letter', () => {
    const result = extractFirstGrapheme('🥺x');
    expect(result).toBe('🥺');
  });

  test('empty string returns empty string', () => {
    expect(extractFirstGrapheme('')).toBe('');
  });

  test('plain letter returns that letter (validation gate catches it later)', () => {
    // extractFirstGrapheme does not validate — it only extracts.
    // isValidEmoji is the gate.
    expect(extractFirstGrapheme('A')).toBe('A');
    expect(isValidEmoji('A')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Name sanitization at the App.tsx boundary
// ═══════════════════════════════════════════════════════════════════════════

describe('Custom emotion name — sanitizeText applied at storage boundary', () => {

  test('normal name is preserved', () => {
    const e = buildCustomEmotion('Nostalgic', '🥺');
    expect(e.name).toBe('Nostalgic');
  });

  test('leading/trailing whitespace is trimmed', () => {
    const e = buildCustomEmotion('  Hopeful  ', '🌱');
    expect(e.name).toBe('Hopeful');
  });

  test('null byte is removed', () => {
    const e = buildCustomEmotion('Grate\0ful', '🙏');
    expect(e.name).toBe('Grateful');
  });

  test('control characters are stripped', () => {
    const e = buildCustomEmotion('Good\x01Mood', '😊');
    expect(e.name).toBe('GoodMood');
  });

  test('consecutive whitespace is collapsed to a single space', () => {
    const e = buildCustomEmotion('Very   Happy', '😄');
    expect(e.name).toBe('Very Happy');
  });

  test('emoji in the name field is preserved (sanitizeText does not strip emoji)', () => {
    // Users shouldn't put emoji in the name field but if they do it won't corrupt
    const e = buildCustomEmotion('Happy 😊', '🌟');
    expect(e.name).toBe('Happy 😊');
  });

  test('emoji field is passed through unchanged (no sanitizeText on emoji)', () => {
    const skinToneEmoji = '👋🏻';
    const e = buildCustomEmotion('Wave', skinToneEmoji);
    expect(e.emoji).toBe(skinToneEmoji);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Full pipeline: extract → validate → sanitize
// ═══════════════════════════════════════════════════════════════════════════

describe('Full custom emotion creation pipeline', () => {

  function simulateFormSubmit(rawName: string, rawEmoji: string) {
    const emoji = extractFirstGrapheme(rawEmoji);
    const emojiOk = isValidEmoji(emoji);
    const nameOk = rawName.trim().length > 0;
    if (!emojiOk || !nameOk) return null;
    return buildCustomEmotion(rawName.trim(), emoji);
  }

  test('valid name + basic emoji produces a clean emotion object', () => {
    const result = simulateFormSubmit('Nostalgic', '🥺');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('Nostalgic');
    expect(result!.emoji).toBe('🥺');
  });

  test('valid name + skin-tone emoji works end to end', () => {
    const result = simulateFormSubmit('Warm', '👋🏻');
    expect(result).not.toBeNull();
    expect(result!.emoji).toBe('👋🏻');
    expect(isValidEmoji(result!.emoji)).toBe(true);
  });

  test('valid name + ZWJ emoji works end to end', () => {
    const result = simulateFormSubmit('Family', '👨‍👩‍👧‍👦');
    expect(result).not.toBeNull();
    expect(isValidEmoji(result!.emoji)).toBe(true);
  });

  test('typing two emojis only saves the first one', () => {
    const result = simulateFormSubmit('Mixed', '😊🔥');
    expect(result!.emoji).toBe('😊');
  });

  test('text in emoji field is blocked — returns null', () => {
    expect(simulateFormSubmit('Happy', 'abc')).toBeNull();
  });

  test('empty emoji field is blocked — returns null', () => {
    expect(simulateFormSubmit('Happy', '')).toBeNull();
  });

  test('empty name field is blocked — returns null', () => {
    expect(simulateFormSubmit('', '😊')).toBeNull();
  });

  test('whitespace-only name is blocked — returns null', () => {
    expect(simulateFormSubmit('   ', '😊')).toBeNull();
  });

  test('name with control chars is sanitized but still saved', () => {
    const result = simulateFormSubmit('Good\x01Mood', '😊');
    expect(result).not.toBeNull();
    expect(result!.name).toBe('GoodMood');
  });
});
