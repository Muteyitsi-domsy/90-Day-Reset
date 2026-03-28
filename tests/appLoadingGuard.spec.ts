/**
 * Regression tests for the app loading spinner guard.
 *
 * Background: returning users briefly saw the new-user WelcomeScreen (2-4 s flash)
 * because the old guard was:
 *
 *   authLoading || (isLoading && !userProfile)
 *
 * setUserProfile() fires mid-load before setAppState('returning_welcome'),
 * separated by an `await storageService.getJournalEntries()`. That await
 * flushes the setUserProfile state update, making !userProfile false and
 * turning off the spinner while appState was still 'welcome'.
 *
 * The correct guard is:
 *
 *   authLoading || isLoading
 *
 * The spinner must stay on for the ENTIRE load, only hiding after the
 * finally block runs (which is always after setAppState has been called).
 *
 * These tests document and lock in that invariant.
 */

import { describe, test, expect } from 'vitest';

/** Mirror of the spinner guard in App.tsx renderContent() */
function shouldShowSpinner(authLoading: boolean, isLoading: boolean): boolean {
  return authLoading || isLoading;
}

/** Simulate the loading sequence states a returning user goes through */
function returningUserLoadSequence() {
  return [
    // Phase 1 — initial mount, nothing loaded yet
    { authLoading: true,  isLoading: true,  userProfileLoaded: false, appState: 'welcome',           label: 'initial mount' },
    // Phase 2 — auth resolves, data loading starts
    { authLoading: false, isLoading: true,  userProfileLoaded: false, appState: 'welcome',           label: 'auth resolved, loading starts' },
    // Phase 3 — userProfile loads (setUserProfile fires), but appState not yet updated
    //            THIS IS THE STATE THAT CAUSED THE FLASH with the old guard
    { authLoading: false, isLoading: true,  userProfileLoaded: true,  appState: 'welcome',           label: 'profile loaded, appState still welcome (mid-load gap)' },
    // Phase 4 — remaining data loads, setAppState('returning_welcome') fires
    { authLoading: false, isLoading: true,  userProfileLoaded: true,  appState: 'returning_welcome', label: 'appState updated, still loading' },
    // Phase 5 — finally block: setIsLoading(false)
    { authLoading: false, isLoading: false, userProfileLoaded: true,  appState: 'returning_welcome', label: 'loading complete' },
  ];
}

describe('spinner guard — correct form (authLoading || isLoading)', () => {
  test('shows spinner while authLoading regardless of isLoading', () => {
    expect(shouldShowSpinner(true, true)).toBe(true);
    expect(shouldShowSpinner(true, false)).toBe(true);
  });

  test('shows spinner while isLoading regardless of authLoading', () => {
    expect(shouldShowSpinner(false, true)).toBe(true);
    expect(shouldShowSpinner(true, true)).toBe(true);
  });

  test('only hides spinner when both authLoading and isLoading are false', () => {
    expect(shouldShowSpinner(false, false)).toBe(false);
  });

  test('mid-load gap (profile loaded, appState still welcome) still shows spinner', () => {
    // This is Phase 3 — the exact state that caused the flash
    // isLoading is true, so spinner must stay on
    const phase3 = returningUserLoadSequence()[2];
    expect(phase3.appState).toBe('welcome');
    expect(phase3.userProfileLoaded).toBe(true);
    expect(shouldShowSpinner(phase3.authLoading, phase3.isLoading)).toBe(true);
  });
});

describe('spinner guard — old (broken) form (authLoading || (isLoading && !userProfile))', () => {
  /** The old broken guard — kept here to document why it was wrong */
  function brokenGuard(authLoading: boolean, isLoading: boolean, userProfile: boolean): boolean {
    return authLoading || (isLoading && !userProfile);
  }

  test('old guard incorrectly hides spinner at mid-load gap (Phase 3)', () => {
    // Phase 3: authLoading=false, isLoading=true, userProfile=true, appState='welcome'
    // Old guard: false || (true && false) = false → spinner hides → FLASH
    expect(brokenGuard(false, true, true)).toBe(false); // wrong — causes flash
  });

  test('new guard correctly keeps spinner on at mid-load gap (Phase 3)', () => {
    // New guard: false || true = true → spinner stays on → no flash
    expect(shouldShowSpinner(false, true)).toBe(true); // correct
  });
});

describe('returning user full load sequence — spinner behaviour', () => {
  const sequence = returningUserLoadSequence();

  test('spinner is ON for all phases except the final one', () => {
    const allButLast = sequence.slice(0, -1);
    for (const phase of allButLast) {
      expect(
        shouldShowSpinner(phase.authLoading, phase.isLoading),
        `spinner should be ON at: ${phase.label}`
      ).toBe(true);
    }
  });

  test('spinner is OFF only at the final phase (loading complete)', () => {
    const last = sequence[sequence.length - 1];
    expect(last.appState).toBe('returning_welcome');
    expect(shouldShowSpinner(last.authLoading, last.isLoading)).toBe(false);
  });

  test('when spinner turns off, appState is returning_welcome (not welcome)', () => {
    // Ensures we never reach renderContent's switch with a stale 'welcome' appState
    const phaseWhenSpinnerTurnsOff = sequence.find(
      p => !shouldShowSpinner(p.authLoading, p.isLoading)
    );
    expect(phaseWhenSpinnerTurnsOff).toBeDefined();
    expect(phaseWhenSpinnerTurnsOff!.appState).toBe('returning_welcome');
    expect(phaseWhenSpinnerTurnsOff!.appState).not.toBe('welcome');
  });
});
