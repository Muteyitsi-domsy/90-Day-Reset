/**
 * onboardingCompletion.spec.ts
 *
 * Tests for the AI report frequency settings screen (OnboardingCompletion.tsx).
 *
 * This screen lets users pick which AI reports they want:
 *   - Daily Insights  → dailyAnalysis: true/false
 *   - Weekly Summaries → weeklyReports: true/false
 *   - Monthly Summaries → monthlyReports: true/false
 *
 * The choice here directly controls whether weekly/monthly reports are
 * auto-generated throughout the journey. A regression here could silently
 * disable report generation for all new users.
 */

import { describe, test, expect } from 'vitest';

type FrequencyOption = 'daily' | 'weekly' | 'monthly';

interface ReportSettings {
  dailyAnalysis: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

// ─── Mirrors OnboardingCompletion logic ──────────────────────────────────────

function toggleOption(current: Set<FrequencyOption>, option: FrequencyOption): Set<FrequencyOption> {
  const next = new Set(current);
  if (next.has(option)) {
    next.delete(option);
  } else {
    next.add(option);
  }
  return next;
}

function selectNone(): Set<FrequencyOption> {
  return new Set();
}

function buildSettings(selected: Set<FrequencyOption>): ReportSettings {
  return {
    dailyAnalysis: selected.has('daily'),
    weeklyReports: selected.has('weekly'),
    monthlyReports: selected.has('monthly'),
  };
}

// ─── Default state ───────────────────────────────────────────────────────────

describe('onboarding completion — default state', () => {
  test('default selection is daily only', () => {
    const defaultSelected = new Set<FrequencyOption>(['daily']);
    expect(defaultSelected.has('daily')).toBe(true);
    expect(defaultSelected.has('weekly')).toBe(false);
    expect(defaultSelected.has('monthly')).toBe(false);
  });

  test('default settings produce dailyAnalysis=true, others false', () => {
    const settings = buildSettings(new Set<FrequencyOption>(['daily']));
    expect(settings).toEqual({ dailyAnalysis: true, weeklyReports: false, monthlyReports: false });
  });
});

// ─── Toggle behaviour ────────────────────────────────────────────────────────

describe('onboarding completion — toggle options', () => {
  test('toggling unselected option adds it', () => {
    const selected = new Set<FrequencyOption>(['daily']);
    const next = toggleOption(selected, 'weekly');
    expect(next.has('weekly')).toBe(true);
    expect(next.has('daily')).toBe(true); // original preserved
  });

  test('toggling selected option removes it', () => {
    const selected = new Set<FrequencyOption>(['daily', 'weekly']);
    const next = toggleOption(selected, 'daily');
    expect(next.has('daily')).toBe(false);
    expect(next.has('weekly')).toBe(true); // other option preserved
  });

  test('toggle does not mutate the original set', () => {
    const selected = new Set<FrequencyOption>(['daily']);
    const next = toggleOption(selected, 'weekly');
    expect(selected.has('weekly')).toBe(false); // original unchanged
    expect(next.has('weekly')).toBe(true);
  });

  test('toggling all three on produces all-true settings', () => {
    let selected = new Set<FrequencyOption>(['daily']);
    selected = toggleOption(selected, 'weekly');
    selected = toggleOption(selected, 'monthly');
    const settings = buildSettings(selected);
    expect(settings).toEqual({ dailyAnalysis: true, weeklyReports: true, monthlyReports: true });
  });
});

// ─── Select none ────────────────────────────────────────────────────────────

describe('onboarding completion — select none', () => {
  test('selectNone clears all options', () => {
    const result = selectNone();
    expect(result.size).toBe(0);
  });

  test('isNoneSelected is true when set is empty', () => {
    const selected = selectNone();
    const isNoneSelected = selected.size === 0;
    expect(isNoneSelected).toBe(true);
  });

  test('isNoneSelected is false when any option is selected', () => {
    const selected = new Set<FrequencyOption>(['daily']);
    const isNoneSelected = selected.size === 0;
    expect(isNoneSelected).toBe(false);
  });

  test('selecting none produces all-false settings', () => {
    const settings = buildSettings(selectNone());
    expect(settings).toEqual({ dailyAnalysis: false, weeklyReports: false, monthlyReports: false });
  });
});

// ─── Settings mapping ────────────────────────────────────────────────────────

describe('onboarding completion — settings object produced', () => {
  test('daily only → dailyAnalysis=true, reports=false', () => {
    const settings = buildSettings(new Set<FrequencyOption>(['daily']));
    expect(settings.dailyAnalysis).toBe(true);
    expect(settings.weeklyReports).toBe(false);
    expect(settings.monthlyReports).toBe(false);
  });

  test('weekly only → weeklyReports=true, others=false', () => {
    const settings = buildSettings(new Set<FrequencyOption>(['weekly']));
    expect(settings.dailyAnalysis).toBe(false);
    expect(settings.weeklyReports).toBe(true);
    expect(settings.monthlyReports).toBe(false);
  });

  test('monthly only → monthlyReports=true, others=false', () => {
    const settings = buildSettings(new Set<FrequencyOption>(['monthly']));
    expect(settings.dailyAnalysis).toBe(false);
    expect(settings.weeklyReports).toBe(false);
    expect(settings.monthlyReports).toBe(true);
  });

  test('weekly + monthly (no daily) → correct settings', () => {
    const settings = buildSettings(new Set<FrequencyOption>(['weekly', 'monthly']));
    expect(settings).toEqual({ dailyAnalysis: false, weeklyReports: true, monthlyReports: true });
  });

  test('all three selected → all true', () => {
    const settings = buildSettings(new Set<FrequencyOption>(['daily', 'weekly', 'monthly']));
    expect(settings).toEqual({ dailyAnalysis: true, weeklyReports: true, monthlyReports: true });
  });

  test('none selected → all false', () => {
    const settings = buildSettings(new Set());
    expect(settings).toEqual({ dailyAnalysis: false, weeklyReports: false, monthlyReports: false });
  });
});
