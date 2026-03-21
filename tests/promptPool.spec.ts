/**
 * Prompt pool integrity tests.
 *
 * Guards against accidental prompt deletion, malformed entries,
 * and duplicate text within any arc/month bucket.
 *
 * Floor is set at 45 — below every current count — so the test
 * only fails if someone accidentally wipes a significant chunk
 * of a section. It is NOT a strict count test; it is a safety net.
 *
 * Current counts (at time of writing):
 *   release    M1:50  M2:46  M3:50
 *   reaffirm   M1:50  M2:52  M3:50
 *   reignition M1:50  M2:58  M3:60
 *   Total: 466
 */

import { describe, it, expect } from 'vitest';
import { PROMPTS } from '../services/promptGenerator';

const ARCS = ['release', 'reaffirm', 'reignition'] as const;
const MONTHS = [1, 2, 3] as const;
const FLOOR = 45;
const TOTAL_FLOOR = 450;
const VALID_CATEGORIES = ['intention', 'reflection'] as const;

describe('Prompt pool — minimum counts', () => {
  for (const arc of ARCS) {
    for (const month of MONTHS) {
      it(`${arc} M${month} has at least ${FLOOR} prompts`, () => {
        expect(PROMPTS[arc][month].length).toBeGreaterThanOrEqual(FLOOR);
      });
    }
  }

  it(`total prompt pool has at least ${TOTAL_FLOOR} prompts`, () => {
    const total = ARCS.flatMap(arc =>
      MONTHS.map(month => PROMPTS[arc][month].length)
    ).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(TOTAL_FLOOR);
  });
});

describe('Prompt pool — structural integrity', () => {
  for (const arc of ARCS) {
    for (const month of MONTHS) {
      describe(`${arc} M${month}`, () => {
        it('every prompt has a non-empty text field', () => {
          for (const prompt of PROMPTS[arc][month]) {
            expect(typeof prompt.text).toBe('string');
            expect(prompt.text.trim().length).toBeGreaterThan(0);
          }
        });

        it('every prompt has a valid category', () => {
          for (const prompt of PROMPTS[arc][month]) {
            expect(VALID_CATEGORIES).toContain(prompt.category);
          }
        });

        it('no duplicate prompt text within the bucket', () => {
          const texts = PROMPTS[arc][month].map(p => p.text.trim().toLowerCase());
          const unique = new Set(texts);
          expect(unique.size).toBe(texts.length);
        });
      });
    }
  }
});

describe('Prompt pool — cross-arc uniqueness', () => {
  it('intention and reflection prompts both present across the full pool', () => {
    const allPrompts = ARCS.flatMap(arc =>
      MONTHS.flatMap(month => PROMPTS[arc][month])
    );
    const hasIntention = allPrompts.some(p => p.category === 'intention');
    const hasReflection = allPrompts.some(p => p.category === 'reflection');
    expect(hasIntention).toBe(true);
    expect(hasReflection).toBe(true);
  });
});
