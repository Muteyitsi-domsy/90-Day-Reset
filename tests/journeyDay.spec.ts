/**
 * Tests for getDayAndMonth() — the core function that converts a journey
 * startDate into the user's current day (1-91+) and month (1-3).
 *
 * Also verifies the Math.min(90, rawDay) cap that's applied in the render layer
 * so the counter never displays above 90.
 */

import { describe, test, expect } from 'vitest';
import { getDayAndMonth } from '../services/geminiService';
import { startDateForDay } from './helpers/factories';

describe('getDayAndMonth', () => {

  // ─── Basic day calculation ─────────────────────────────────────────────────

  describe('day calculation', () => {
    test('startDate = today → day 1', () => {
      expect(getDayAndMonth(startDateForDay(1)).day).toBe(1);
    });

    test('startDate = yesterday → day 2', () => {
      expect(getDayAndMonth(startDateForDay(2)).day).toBe(2);
    });

    test('startDate = 6 days ago → day 7 (first milestone)', () => {
      expect(getDayAndMonth(startDateForDay(7)).day).toBe(7);
    });

    test('startDate = 29 days ago → day 30 (last day of month 1)', () => {
      expect(getDayAndMonth(startDateForDay(30)).day).toBe(30);
    });

    test('startDate = 30 days ago → day 31 (first day of month 2)', () => {
      expect(getDayAndMonth(startDateForDay(31)).day).toBe(31);
    });

    test('startDate = 59 days ago → day 60 (last day of month 2)', () => {
      expect(getDayAndMonth(startDateForDay(60)).day).toBe(60);
    });

    test('startDate = 60 days ago → day 61 (first day of month 3)', () => {
      expect(getDayAndMonth(startDateForDay(61)).day).toBe(61);
    });

    test('startDate = 89 days ago → day 90 (final journey day)', () => {
      expect(getDayAndMonth(startDateForDay(90)).day).toBe(90);
    });

    test('startDate = 90 days ago → day 91 (past journey end — triggers completion)', () => {
      expect(getDayAndMonth(startDateForDay(91)).day).toBe(91);
    });

    test('future startDate → day 1 (diffTime clamped to 0 by Math.max)', () => {
      const future = new Date();
      future.setDate(future.getDate() + 10);
      expect(getDayAndMonth(future.toISOString()).day).toBe(1);
    });
  });

  // ─── Month assignment ──────────────────────────────────────────────────────

  describe('month assignment (1-3)', () => {
    test('day 1 → month 1', () => {
      expect(getDayAndMonth(startDateForDay(1)).month).toBe(1);
    });

    test('day 30 → month 1 (boundary)', () => {
      expect(getDayAndMonth(startDateForDay(30)).month).toBe(1);
    });

    test('day 31 → month 2 (boundary)', () => {
      expect(getDayAndMonth(startDateForDay(31)).month).toBe(2);
    });

    test('day 60 → month 2 (boundary)', () => {
      expect(getDayAndMonth(startDateForDay(60)).month).toBe(2);
    });

    test('day 61 → month 3 (boundary)', () => {
      expect(getDayAndMonth(startDateForDay(61)).month).toBe(3);
    });

    test('day 90 → month 3', () => {
      expect(getDayAndMonth(startDateForDay(90)).month).toBe(3);
    });
  });

  // ─── Display cap at 90 (mirrors App.tsx render logic) ─────────────────────
  // The raw getDayAndMonth() value can exceed 90; the render layer caps it.
  // These tests verify that cap logic is correct.

  describe('display cap: Math.min(90, rawDay)', () => {
    test('day 89 → cap has no effect', () => {
      expect(Math.min(90, getDayAndMonth(startDateForDay(89)).day)).toBe(89);
    });

    test('day 90 → cap has no effect', () => {
      expect(Math.min(90, getDayAndMonth(startDateForDay(90)).day)).toBe(90);
    });

    test('day 91 → capped to 90 for display', () => {
      expect(Math.min(90, getDayAndMonth(startDateForDay(91)).day)).toBe(90);
    });

    test('day 100 → capped to 90 for display', () => {
      expect(Math.min(90, getDayAndMonth(startDateForDay(100)).day)).toBe(90);
    });
  });

  // ─── Completion trigger threshold ─────────────────────────────────────────
  // App.tsx fires handleFinalSummary() when: day > 90 && !journeyCompleted

  describe('completion trigger: day > 90', () => {
    test('day 90 does NOT fire completion (day > 90 is false)', () => {
      const { day } = getDayAndMonth(startDateForDay(90));
      expect(day > 90).toBe(false);
    });

    test('day 91 fires completion (day > 90 is true)', () => {
      const { day } = getDayAndMonth(startDateForDay(91));
      expect(day > 90).toBe(true);
    });

    test('day 95 fires completion', () => {
      const { day } = getDayAndMonth(startDateForDay(95));
      expect(day > 90).toBe(true);
    });
  });
});
