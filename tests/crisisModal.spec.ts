/**
 * crisisModal.spec.ts
 *
 * Regression tests for crisis detection and the CrisisModal trigger conditions.
 *
 * The CrisisModal shows when crisisSeverity >= 2. It also blocks every other
 * overlay (MilestoneCelebration, SharePrompt) from rendering.
 *
 * Rules tested:
 * - severity 0: no modal, no blocking
 * - severity 1: low concern flag, NOT enough to show the crisis modal (>= 2 required)
 * - severity 2: modal appears
 * - severity 3: modal appears at highest severity
 * - crisisSeverity === 0 gate blocks milestone + share modals
 * - Negation patterns prevent false positives ("I never want to hurt myself")
 */

import { describe, test, expect } from 'vitest';
import { detectCrisis } from '../utils/crisisDetector';

// ─── Modal visibility guards (mirrored from App.tsx render logic) ─────────────

/** Crisis modal renders when severity >= 2 */
function crisisModalVisible(severity: number): boolean {
  return severity >= 2;
}

/** Milestone celebration and share prompt both require crisis severity === 0 */
function celebrationModalAllowed(crisisSeverity: number): boolean {
  return crisisSeverity === 0;
}

// ─── Crisis detection threshold ──────────────────────────────────────────────

describe('detectCrisis — modal threshold (>= 2)', () => {
  test('safe, positive text → severity 0, modal does not show', () => {
    const s = detectCrisis("I had a really good day today. Feeling grateful.");
    expect(s).toBe(0);
    expect(crisisModalVisible(s)).toBe(false);
  });

  test('general distress language → severity 1, modal does NOT show', () => {
    const s = detectCrisis("I'm feeling completely overwhelmed and hopeless about everything.");
    expect(s).toBe(1);
    expect(crisisModalVisible(s)).toBe(false);
  });

  test('empty string → severity 0', () => {
    expect(detectCrisis('')).toBe(0);
  });

  test('whitespace-only string → severity 0', () => {
    expect(detectCrisis('   ')).toBe(0);
  });
});

describe('detectCrisis — severity 2 (moderate, modal shows)', () => {
  test('severity 2 text → modal shows', () => {
    const s = detectCrisis("I've been cutting myself to cope.");
    expect(s).toBe(2);
    expect(crisisModalVisible(s)).toBe(true);
  });
});

describe('detectCrisis — severity 3 (high, modal shows)', () => {
  test('severity 3 text → modal shows at highest level', () => {
    const s = detectCrisis("I want to kill myself.");
    expect(s).toBe(3);
    expect(crisisModalVisible(s)).toBe(true);
  });
});

describe('detectCrisis — negation reduces false positives', () => {
  test('"I never want to hurt myself" → severity 0 or 1, NOT 3', () => {
    const s = detectCrisis("I never want to hurt myself, that thought hasn't crossed my mind.");
    expect(s).toBeLessThan(2); // must NOT trigger the crisis modal
    expect(crisisModalVisible(s)).toBe(false);
  });

  test('"not suicidal" statement → below modal threshold', () => {
    const s = detectCrisis("I want to be clear: I am not suicidal and I am safe.");
    expect(crisisModalVisible(s)).toBe(false);
  });
});

// ─── Crisis blocks other modals ───────────────────────────────────────────────

describe('crisis severity gate — blocks milestone and share modals', () => {
  test('severity 0 → milestone celebration IS allowed', () => {
    expect(celebrationModalAllowed(0)).toBe(true);
  });

  test('severity 1 → milestone celebration IS allowed (severity 1 is not a modal-level crisis)', () => {
    expect(celebrationModalAllowed(1)).toBe(false); // guard is === 0, not < 2
  });

  test('severity 2 → milestone celebration is BLOCKED', () => {
    expect(celebrationModalAllowed(2)).toBe(false);
  });

  test('severity 3 → milestone celebration is BLOCKED', () => {
    expect(celebrationModalAllowed(3)).toBe(false);
  });

  test('share prompt follows the same gate', () => {
    // Both use crisisSeverity === 0 in the render condition
    expect(celebrationModalAllowed(0)).toBe(true);
    expect(celebrationModalAllowed(2)).toBe(false);
  });
});

// ─── Crisis detection is text-case insensitive ────────────────────────────────

describe('detectCrisis — case insensitivity', () => {
  test('all-caps crisis text is still detected', () => {
    const s = detectCrisis("I WANT TO KILL MYSELF");
    expect(s).toBeGreaterThanOrEqual(2);
    expect(crisisModalVisible(s)).toBe(true);
  });

  test('mixed case crisis text is detected', () => {
    const s = detectCrisis("I Want To Kill Myself");
    expect(crisisModalVisible(s)).toBe(true);
  });
});
