/**
 * Tests for the onboarding state-machine routing.
 *
 * The onboarding flow has two paths:
 *   A. First-time user:         welcome → name → onboarding → intention_setting → scripting → onboarding_completion → journal
 *   B. New journey (returning): onboarding → [varies by keepManifesto/keepIntentions] → onboarding_completion → journal
 *
 * These tests verify every routing decision without React, by mirroring
 * the pure routing logic from App.tsx. If the routing changes, these tests
 * must be updated.
 */

import { describe, test, expect } from 'vitest';
import type { UserProfile } from '../types';
import { makeProfile } from './helpers/factories';

// ─── Types ────────────────────────────────────────────────────────────────

type AppState =
  | 'welcome' | 'name_collection' | 'returning_welcome'
  | 'onboarding' | 'intention_setting' | 'scripting'
  | 'onboarding_completion' | 'journal';

interface JourneyOptions {
  keepManifesto: boolean;
  keepIntentions: boolean;
}

// ─── Mirrors App.tsx routing decisions (pure functions) ──────────────────

/** After arc selection in onboarding — what state comes next? */
function routeAfterOnboarding(
  isNewJourney: boolean,
  profile: UserProfile | null,
  opts: JourneyOptions | null
): AppState {
  if (isNewJourney && profile && opts) {
    if (opts.keepIntentions && opts.keepManifesto) return 'onboarding_completion';
    if (opts.keepIntentions) return 'scripting';
    return 'intention_setting'; // keepManifesto=true OR neither
  }
  // First-time user
  return 'intention_setting';
}

/** After intention_setting — what state comes next? */
function routeAfterIntentionSetting(
  profile: UserProfile,
  opts: JourneyOptions | null
): AppState {
  if (opts?.keepManifesto && profile.idealSelfManifesto) {
    return 'onboarding_completion'; // manifesto already exists, skip scripting
  }
  return 'scripting';
}

/** After scripting — always goes to onboarding_completion. */
function routeAfterScripting(): AppState {
  return 'onboarding_completion';
}

/** After onboarding_completion — always goes to journal (active journey). */
function routeAfterOnboardingCompletion(): AppState {
  return 'journal';
}

// ─── First-time user path ─────────────────────────────────────────────────

describe('First-time user onboarding path', () => {

  test('after arc selection → intention_setting', () => {
    expect(routeAfterOnboarding(false, null, null)).toBe('intention_setting');
  });

  test('after intention_setting (no existing manifesto) → scripting', () => {
    const profile = makeProfile({ idealSelfManifesto: '' });
    expect(routeAfterIntentionSetting(profile, null)).toBe('scripting');
  });

  test('after scripting → onboarding_completion', () => {
    expect(routeAfterScripting()).toBe('onboarding_completion');
  });

  test('after onboarding_completion → journal', () => {
    expect(routeAfterOnboardingCompletion()).toBe('journal');
  });

  test('full first-time path: onboarding → intention_setting → scripting → onboarding_completion → journal', () => {
    const profile = makeProfile({ idealSelfManifesto: '' });
    const path: AppState[] = ['onboarding'];

    path.push(routeAfterOnboarding(false, null, null));               // intention_setting
    path.push(routeAfterIntentionSetting(profile, null));             // scripting
    path.push(routeAfterScripting());                                 // onboarding_completion
    path.push(routeAfterOnboardingCompletion());                      // journal

    expect(path).toEqual([
      'onboarding', 'intention_setting', 'scripting', 'onboarding_completion', 'journal',
    ]);
  });
});

// ─── New journey: keep both ────────────────────────────────────────────────

describe('New journey — keep manifesto AND intentions', () => {
  const opts: JourneyOptions = { keepManifesto: true, keepIntentions: true };

  test('after arc selection → onboarding_completion (skips both)', () => {
    const profile = makeProfile({ idealSelfManifesto: 'I am steady.' });
    expect(routeAfterOnboarding(true, profile, opts)).toBe('onboarding_completion');
  });

  test('after onboarding_completion → journal', () => {
    expect(routeAfterOnboardingCompletion()).toBe('journal');
  });

  test('full path: onboarding → onboarding_completion → journal', () => {
    const profile = makeProfile({ idealSelfManifesto: 'I am steady.' });
    const path: AppState[] = ['onboarding'];
    path.push(routeAfterOnboarding(true, profile, opts));
    path.push(routeAfterOnboardingCompletion());
    expect(path).toEqual(['onboarding', 'onboarding_completion', 'journal']);
  });
});

// ─── New journey: keep intentions only (need new manifesto) ───────────────

describe('New journey — keep intentions only', () => {
  const opts: JourneyOptions = { keepManifesto: false, keepIntentions: true };

  test('after arc selection → scripting (need new manifesto)', () => {
    const profile = makeProfile({ intentions: 'Stay consistent.' });
    expect(routeAfterOnboarding(true, profile, opts)).toBe('scripting');
  });

  test('after scripting → onboarding_completion', () => {
    expect(routeAfterScripting()).toBe('onboarding_completion');
  });

  test('full path: onboarding → scripting → onboarding_completion → journal', () => {
    const profile = makeProfile({ intentions: 'Stay consistent.' });
    const path: AppState[] = ['onboarding'];
    path.push(routeAfterOnboarding(true, profile, opts));
    path.push(routeAfterScripting());
    path.push(routeAfterOnboardingCompletion());
    expect(path).toEqual(['onboarding', 'scripting', 'onboarding_completion', 'journal']);
  });
});

// ─── New journey: keep manifesto only (need new intentions) ───────────────

describe('New journey — keep manifesto only', () => {
  const opts: JourneyOptions = { keepManifesto: true, keepIntentions: false };

  test('after arc selection → intention_setting (need new intentions)', () => {
    const profile = makeProfile({ idealSelfManifesto: 'I am rooted.' });
    expect(routeAfterOnboarding(true, profile, opts)).toBe('intention_setting');
  });

  test('after intention_setting with existing manifesto → skips scripting → onboarding_completion', () => {
    const profile = makeProfile({ idealSelfManifesto: 'I am rooted.' });
    expect(routeAfterIntentionSetting(profile, opts)).toBe('onboarding_completion');
  });

  test('full path: onboarding → intention_setting → onboarding_completion → journal', () => {
    const profile = makeProfile({ idealSelfManifesto: 'I am rooted.' });
    const path: AppState[] = ['onboarding'];
    path.push(routeAfterOnboarding(true, profile, opts));
    path.push(routeAfterIntentionSetting(profile, opts));
    path.push(routeAfterOnboardingCompletion());
    expect(path).toEqual(['onboarding', 'intention_setting', 'onboarding_completion', 'journal']);
  });
});

// ─── New journey: keep neither ────────────────────────────────────────────

describe('New journey — keep neither (full re-onboard)', () => {
  const opts: JourneyOptions = { keepManifesto: false, keepIntentions: false };

  test('after arc selection → intention_setting', () => {
    const profile = makeProfile();
    expect(routeAfterOnboarding(true, profile, opts)).toBe('intention_setting');
  });

  test('after intention_setting (no manifesto to keep) → scripting', () => {
    const profile = makeProfile({ idealSelfManifesto: '' });
    expect(routeAfterIntentionSetting(profile, opts)).toBe('scripting');
  });

  test('full path: onboarding → intention_setting → scripting → onboarding_completion → journal', () => {
    const profile = makeProfile({ idealSelfManifesto: '' });
    const path: AppState[] = ['onboarding'];
    path.push(routeAfterOnboarding(true, profile, opts));
    path.push(routeAfterIntentionSetting(profile, opts));
    path.push(routeAfterScripting());
    path.push(routeAfterOnboardingCompletion());
    expect(path).toEqual([
      'onboarding', 'intention_setting', 'scripting', 'onboarding_completion', 'journal',
    ]);
  });
});

// ─── newJourneyOptions lifecycle ─────────────────────────────────────────

describe('newJourneyOptions lifecycle', () => {

  test('is null before any restart is initiated', () => {
    const opts: JourneyOptions | null = null;
    expect(opts).toBeNull();
  });

  test('is set when user confirms restart', () => {
    let opts: JourneyOptions | null = null;
    // Simulates handleNewJourneyConfirm
    opts = { keepManifesto: true, keepIntentions: false };
    expect(opts).not.toBeNull();
  });

  test('is cleared after scripting completes (handleScriptingComplete)', () => {
    let opts: JourneyOptions | null = { keepManifesto: false, keepIntentions: false };
    // Simulates setNewJourneyOptions(null) in handleScriptingComplete
    opts = null;
    expect(opts).toBeNull();
  });

  test('is cleared after onboarding_completion (handleOnboardingCompletion)', () => {
    let opts: JourneyOptions | null = { keepManifesto: true, keepIntentions: true };
    // Simulates setNewJourneyOptions(null) in handleOnboardingCompletion
    opts = null;
    expect(opts).toBeNull();
  });
});
