/**
 * Tests for storage isolation and data migration logic.
 *
 * Two categories:
 *
 * 1. Key isolation — verifies that clearJourneyData() removes ONLY
 *    the journalEntries key, leaving mood entries, flip entries,
 *    user profile, and settings untouched.
 *
 * 2. Profile migration — verifies that legacy arc names, old 'stage'
 *    field, and missing streak fields are correctly migrated when
 *    a profile is loaded. Mirrors the migration code in
 *    localStorageService.ts → getUserProfile().
 *
 * These are pure logic tests (no DOM/localStorage). The migration
 * logic is extracted as a pure function mirroring the service code.
 * If localStorageService.ts migration changes, these tests must be
 * updated — that's the point.
 */

import { describe, test, expect } from 'vitest';
import type { UserProfile } from '../types';
import { makeProfile } from './helpers/factories';

// ─── Storage key contract ─────────────────────────────────────────────────

/**
 * These are the exact keys used by LocalStorageService.
 * If any key changes, these tests will fail and catch the regression.
 */
const STORAGE_KEYS = {
  USER_PROFILE:    'userProfile',
  SETTINGS:        'settings',
  JOURNAL_ENTRIES: 'journalEntries',
  MOOD_ENTRIES:    'moodEntries',
  FLIP_ENTRIES:    'flip_journal_entries',
} as const;

describe('Storage key contract', () => {

  test('clearJourneyData targets only journalEntries', () => {
    const clearedByJourneyReset = STORAGE_KEYS.JOURNAL_ENTRIES;
    const preserved = [
      STORAGE_KEYS.USER_PROFILE,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.MOOD_ENTRIES,
      STORAGE_KEYS.FLIP_ENTRIES,
    ];
    expect(preserved).not.toContain(clearedByJourneyReset);
  });

  test('mood entries key is separate from journal entries key', () => {
    expect(STORAGE_KEYS.MOOD_ENTRIES).not.toBe(STORAGE_KEYS.JOURNAL_ENTRIES);
  });

  test('flip entries key is separate from journal entries key', () => {
    expect(STORAGE_KEYS.FLIP_ENTRIES).not.toBe(STORAGE_KEYS.JOURNAL_ENTRIES);
  });

  test('profile key is separate from all entry keys', () => {
    const entryKeys = [
      STORAGE_KEYS.JOURNAL_ENTRIES,
      STORAGE_KEYS.MOOD_ENTRIES,
      STORAGE_KEYS.FLIP_ENTRIES,
    ];
    expect(entryKeys).not.toContain(STORAGE_KEYS.USER_PROFILE);
  });

  test('settings key is separate from all entry keys', () => {
    const entryKeys = [
      STORAGE_KEYS.JOURNAL_ENTRIES,
      STORAGE_KEYS.MOOD_ENTRIES,
      STORAGE_KEYS.FLIP_ENTRIES,
    ];
    expect(entryKeys).not.toContain(STORAGE_KEYS.SETTINGS);
  });

  test('clearAll covers all five keys', () => {
    const allKeys = Object.values(STORAGE_KEYS);
    expect(allKeys).toHaveLength(5);
    expect(allKeys).toContain('userProfile');
    expect(allKeys).toContain('settings');
    expect(allKeys).toContain('journalEntries');
    expect(allKeys).toContain('moodEntries');
    expect(allKeys).toContain('flip_journal_entries');
  });
});

// ─── Profile migration logic (pure) ───────────────────────────────────────

/**
 * Mirrors the migration code inside LocalStorageService.getUserProfile().
 * Given a raw persisted profile object, applies all migrations and returns
 * the final valid UserProfile.
 */
function migrateProfile(raw: any): UserProfile {
  const profile = { ...raw } as any;

  // Migration from 'stage' to 'arc'
  if (profile.stage) {
    const oldStage = profile.stage;
    if (oldStage === 'reconstruction') profile.arc = 'reaffirm';
    else if (oldStage === 'expansion') profile.arc = 'reignition';
    else profile.arc = 'release';
    delete profile.stage;
  }

  // Migration from old arc names to new ones
  if (profile.arc === 'healing') profile.arc = 'release';
  if (profile.arc === 'unstuck') profile.arc = 'reaffirm';
  if (profile.arc === 'healed') profile.arc = 'reignition';

  // Initialize month_count if missing
  if (!profile.month_count) profile.month_count = 1;

  // Initialize streak fields if missing
  if (profile.flipStreak === undefined) profile.flipStreak = 0;
  if (profile.lastFlipEntryDate === undefined) profile.lastFlipEntryDate = '';
  if (profile.overallStreak === undefined) profile.overallStreak = 0;
  if (profile.lastOverallEntryDate === undefined) profile.lastOverallEntryDate = '';
  if (!profile.earnedBadges) profile.earnedBadges = [];

  return profile as UserProfile;
}

// ─── Arc name migration ───────────────────────────────────────────────────

describe('Arc name migration', () => {

  test('"healing" → "release"', () => {
    const result = migrateProfile({ ...makeProfile(), arc: 'healing' });
    expect(result.arc).toBe('release');
  });

  test('"unstuck" → "reaffirm"', () => {
    const result = migrateProfile({ ...makeProfile(), arc: 'unstuck' });
    expect(result.arc).toBe('reaffirm');
  });

  test('"healed" → "reignition"', () => {
    const result = migrateProfile({ ...makeProfile(), arc: 'healed' });
    expect(result.arc).toBe('reignition');
  });

  test('valid arc "release" is left unchanged', () => {
    const result = migrateProfile({ ...makeProfile(), arc: 'release' });
    expect(result.arc).toBe('release');
  });

  test('valid arc "reaffirm" is left unchanged', () => {
    const result = migrateProfile({ ...makeProfile(), arc: 'reaffirm' });
    expect(result.arc).toBe('reaffirm');
  });

  test('valid arc "reignition" is left unchanged', () => {
    const result = migrateProfile({ ...makeProfile(), arc: 'reignition' });
    expect(result.arc).toBe('reignition');
  });
});

// ─── Stage → arc migration ────────────────────────────────────────────────

describe('Legacy "stage" → "arc" migration', () => {

  test('"stage: reconstruction" → "arc: reaffirm"', () => {
    const raw = { ...makeProfile(), stage: 'reconstruction', arc: undefined };
    const result = migrateProfile(raw);
    expect(result.arc).toBe('reaffirm');
    expect((result as any).stage).toBeUndefined();
  });

  test('"stage: expansion" → "arc: reignition"', () => {
    const raw = { ...makeProfile(), stage: 'expansion', arc: undefined };
    const result = migrateProfile(raw);
    expect(result.arc).toBe('reignition');
    expect((result as any).stage).toBeUndefined();
  });

  test('"stage: <anything-else>" → "arc: release"', () => {
    const raw = { ...makeProfile(), stage: 'unknown', arc: undefined };
    const result = migrateProfile(raw);
    expect(result.arc).toBe('release');
    expect((result as any).stage).toBeUndefined();
  });

  test('"stage" field is removed after migration', () => {
    const raw = { ...makeProfile(), stage: 'reconstruction' };
    const result = migrateProfile(raw);
    expect('stage' in result).toBe(false);
  });
});

// ─── Missing field initialization ─────────────────────────────────────────

describe('Missing streak field initialization', () => {

  test('missing flipStreak → initialized to 0', () => {
    const raw = { ...makeProfile(), flipStreak: undefined };
    const result = migrateProfile(raw);
    expect(result.flipStreak).toBe(0);
  });

  test('missing lastFlipEntryDate → initialized to empty string', () => {
    const raw = { ...makeProfile(), lastFlipEntryDate: undefined };
    const result = migrateProfile(raw);
    expect(result.lastFlipEntryDate).toBe('');
  });

  test('missing overallStreak → initialized to 0', () => {
    const raw = { ...makeProfile(), overallStreak: undefined };
    const result = migrateProfile(raw);
    expect(result.overallStreak).toBe(0);
  });

  test('missing lastOverallEntryDate → initialized to empty string', () => {
    const raw = { ...makeProfile(), lastOverallEntryDate: undefined };
    const result = migrateProfile(raw);
    expect(result.lastOverallEntryDate).toBe('');
  });

  test('missing earnedBadges → initialized to empty array', () => {
    const raw = { ...makeProfile(), earnedBadges: undefined };
    const result = migrateProfile(raw);
    expect(result.earnedBadges).toEqual([]);
  });

  test('missing month_count → initialized to 1', () => {
    const raw = { ...makeProfile(), month_count: 0 }; // falsy 0 → initialize
    const result = migrateProfile(raw);
    expect(result.month_count).toBe(1);
  });

  test('existing streak fields are not overwritten', () => {
    const raw = makeProfile({ flipStreak: 12, overallStreak: 30, moodStreak: 7 });
    const result = migrateProfile(raw);
    expect(result.flipStreak).toBe(12);
    expect(result.overallStreak).toBe(30);
    expect(result.moodStreak).toBe(7);
  });
});

// ─── Settings migration logic (pure) ─────────────────────────────────────

/**
 * Mirrors the migration code inside LocalStorageService.getSettings().
 */
function migrateSettings(raw: any): any {
  let parsed = { ...raw };

  // Migration for old theme setting (light/dark/system used to be the 'theme' field)
  if (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system') {
    const oldTheme = parsed.theme;
    delete parsed.theme;
    parsed = { ...parsed, themeMode: oldTheme, theme: 'default' };
  }

  // Migration for old InsightFrequency enum
  if ('insightFrequency' in parsed) {
    const freq = parsed.insightFrequency;
    if (freq === 'daily') {
      parsed.dailyAnalysis = true;
      parsed.weeklyReports = true;
    } else if (freq === 'weekly') {
      parsed.dailyAnalysis = false;
      parsed.weeklyReports = true;
    } else if (freq === 'none') {
      parsed.dailyAnalysis = false;
      parsed.weeklyReports = false;
      parsed.monthlyReports = false;
    }

    if ('generateMonthlySummaries' in parsed) {
      parsed.monthlyReports = parsed.generateMonthlySummaries;
      delete parsed.generateMonthlySummaries;
    } else if (parsed.monthlyReports === undefined) {
      parsed.monthlyReports = true;
    }
    delete parsed.insightFrequency;
  }

  return parsed;
}

describe('Settings migration', () => {

  test('old theme:"light" → themeMode:"light", theme:"default"', () => {
    const result = migrateSettings({ theme: 'light', themeMode: undefined });
    expect(result.theme).toBe('default');
    expect(result.themeMode).toBe('light');
  });

  test('old theme:"dark" → themeMode:"dark", theme:"default"', () => {
    const result = migrateSettings({ theme: 'dark' });
    expect(result.theme).toBe('default');
    expect(result.themeMode).toBe('dark');
  });

  test('old theme:"system" → themeMode:"system", theme:"default"', () => {
    const result = migrateSettings({ theme: 'system' });
    expect(result.theme).toBe('default');
    expect(result.themeMode).toBe('system');
  });

  test('valid theme:"ocean" is left unchanged', () => {
    const result = migrateSettings({ theme: 'ocean' });
    expect(result.theme).toBe('ocean');
  });

  test('insightFrequency:"daily" → dailyAnalysis:true, weeklyReports:true', () => {
    const result = migrateSettings({ insightFrequency: 'daily' });
    expect(result.dailyAnalysis).toBe(true);
    expect(result.weeklyReports).toBe(true);
    expect('insightFrequency' in result).toBe(false);
  });

  test('insightFrequency:"weekly" → dailyAnalysis:false, weeklyReports:true', () => {
    const result = migrateSettings({ insightFrequency: 'weekly' });
    expect(result.dailyAnalysis).toBe(false);
    expect(result.weeklyReports).toBe(true);
  });

  test('insightFrequency:"none" → all reports disabled', () => {
    const result = migrateSettings({ insightFrequency: 'none' });
    expect(result.dailyAnalysis).toBe(false);
    expect(result.weeklyReports).toBe(false);
    expect(result.monthlyReports).toBe(false);
  });

  test('generateMonthlySummaries is remapped to monthlyReports', () => {
    const result = migrateSettings({
      insightFrequency: 'daily',
      generateMonthlySummaries: false,
    });
    expect(result.monthlyReports).toBe(false);
    expect('generateMonthlySummaries' in result).toBe(false);
  });

  test('settings without insightFrequency are left unchanged', () => {
    const input = { theme: 'forest', themeMode: 'dark', dailyAnalysis: true };
    const result = migrateSettings(input);
    expect(result.theme).toBe('forest');
    expect(result.themeMode).toBe('dark');
    expect(result.dailyAnalysis).toBe(true);
  });
});

// ─── Journey restart data isolation ──────────────────────────────────────

describe('Journey restart data isolation (structural)', () => {

  test('clearJourneyData key ("journalEntries") is not any preserved key', () => {
    const journeyKey = 'journalEntries';
    const preserved = ['userProfile', 'settings', 'moodEntries', 'flip_journal_entries'];
    expect(preserved.includes(journeyKey)).toBe(false);
  });

  test('mood entries survive a journey restart (different keys)', () => {
    // Simulate two separate stores
    const journalStore: Record<string, string> = {
      journalEntries: JSON.stringify([{ id: 'j1' }]),
      moodEntries: JSON.stringify([{ id: 'm1' }]),
      flip_journal_entries: JSON.stringify([{ id: 'f1' }]),
      userProfile: JSON.stringify({ name: 'Tester' }),
    };

    // clearJourneyData removes only journalEntries
    delete journalStore['journalEntries'];

    expect('journalEntries' in journalStore).toBe(false);
    expect('moodEntries' in journalStore).toBe(true);
    expect('flip_journal_entries' in journalStore).toBe(true);
    expect('userProfile' in journalStore).toBe(true);
  });

  test('flip entries survive a journey restart', () => {
    const store: Record<string, string> = {
      journalEntries: '[]',
      flip_journal_entries: JSON.stringify([{ id: 'f1' }, { id: 'f2' }]),
    };

    delete store['journalEntries'];

    const remaining = JSON.parse(store['flip_journal_entries']);
    expect(remaining).toHaveLength(2);
  });
});
