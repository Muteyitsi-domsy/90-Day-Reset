/**
 * Tests for journal toggle colour-coding and view-switching behaviour.
 *
 * Covers:
 *  1. JOURNAL_COLORS / JOURNAL_LABELS maps are complete and correct
 *  2. handleToggleView logic: view updates, menu always closes, paywall branch
 *  3. Toggle cycling through all three views
 */

import { describe, test, expect } from 'vitest';
import { JOURNAL_COLORS, JOURNAL_LABELS } from '../components/Header';

type View = 'journey' | 'mood' | 'flip';

// ─── Mirror of App.tsx handleToggleView ───────────────────────────────────────

function makeToggleHandler(isSubscribed: boolean) {
  let activeView: View = 'journey';
  let isMenuOpen = true;
  let showPaywall = false;

  function handleToggleView(view: View) {
    isMenuOpen = false;                        // always closes menu first
    if (!isSubscribed && view !== 'mood') {
      showPaywall = true;
      return;
    }
    activeView = view;
  }

  return {
    toggle: handleToggleView,
    state: () => ({ activeView, isMenuOpen, showPaywall }),
  };
}

// ─── 1. Colour / label maps ───────────────────────────────────────────────────

describe('JOURNAL_COLORS', () => {
  test('all three views have a colour assigned', () => {
    const views: View[] = ['journey', 'mood', 'flip'];
    for (const v of views) {
      expect(JOURNAL_COLORS[v]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('each view has a distinct colour', () => {
    const colors = Object.values(JOURNAL_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });

  test('journey is teal #1E7A8A', () => {
    expect(JOURNAL_COLORS.journey).toBe('#1E7A8A');
  });

  test('mood (Daily Journal) is green #4E9B58', () => {
    expect(JOURNAL_COLORS.mood).toBe('#4E9B58');
  });

  test('flip (Flip Journal) is orange #E87520', () => {
    expect(JOURNAL_COLORS.flip).toBe('#E87520');
  });
});

describe('JOURNAL_LABELS', () => {
  test('journey label is 90-Day Identity Reset', () => {
    expect(JOURNAL_LABELS.journey).toBe('90-Day Identity Reset');
  });

  test('mood label is Daily Journal', () => {
    expect(JOURNAL_LABELS.mood).toBe('Daily Journal');
  });

  test('flip label is Flip Journal', () => {
    expect(JOURNAL_LABELS.flip).toBe('Flip Journal');
  });
});

// ─── 2. Toggle handler — subscribed user ─────────────────────────────────────

describe('handleToggleView (subscribed)', () => {
  test('switches to mood view', () => {
    const { toggle, state } = makeToggleHandler(true);
    toggle('mood');
    expect(state().activeView).toBe('mood');
  });

  test('switches to flip view', () => {
    const { toggle, state } = makeToggleHandler(true);
    toggle('flip');
    expect(state().activeView).toBe('flip');
  });

  test('switches to journey view', () => {
    const { toggle, state } = makeToggleHandler(true);
    toggle('mood');
    toggle('journey');
    expect(state().activeView).toBe('journey');
  });

  test('menu is closed after every toggle', () => {
    const { toggle, state } = makeToggleHandler(true);
    for (const v of ['mood', 'flip', 'journey'] as View[]) {
      toggle(v);
      expect(state().isMenuOpen).toBe(false);
    }
  });

  test('does not show paywall', () => {
    const { toggle, state } = makeToggleHandler(true);
    toggle('journey');
    toggle('flip');
    expect(state().showPaywall).toBe(false);
  });
});

// ─── 3. Toggle handler — free (unsubscribed) user ────────────────────────────

describe('handleToggleView (unsubscribed)', () => {
  test('can switch to mood (free view)', () => {
    const { toggle, state } = makeToggleHandler(false);
    toggle('mood');
    expect(state().activeView).toBe('mood');
    expect(state().showPaywall).toBe(false);
  });

  test('menu closes even when paywall is triggered', () => {
    const { toggle, state } = makeToggleHandler(false);
    toggle('journey');
    expect(state().isMenuOpen).toBe(false);
  });

  test('attempting journey triggers paywall and does not change view', () => {
    const { toggle, state } = makeToggleHandler(false);
    toggle('journey');
    expect(state().showPaywall).toBe(true);
    expect(state().activeView).toBe('journey'); // unchanged from initial
  });

  test('attempting flip triggers paywall and does not change view', () => {
    const { toggle, state } = makeToggleHandler(false);
    toggle('mood');                              // move to mood first
    toggle('flip');
    expect(state().showPaywall).toBe(true);
    expect(state().activeView).toBe('mood');    // stays on mood
  });
});

// ─── 4. Full cycle ────────────────────────────────────────────────────────────

describe('toggle cycle', () => {
  test('can cycle through all three views and back', () => {
    const { toggle, state } = makeToggleHandler(true);
    const cycle: View[] = ['mood', 'flip', 'journey', 'mood'];
    for (const v of cycle) {
      toggle(v);
      expect(state().activeView).toBe(v);
      expect(state().isMenuOpen).toBe(false);
    }
  });
});

// ─── 5. Free → Pro upgrade transition ────────────────────────────────────────

/** Mirror of App.tsx onSubscribed callback */
function simulateSubscription(initialView: View = 'mood') {
  let activeView: View = initialView;
  let isSubscribed = false;
  let showPaywall = true;

  function onSubscribed() {
    isSubscribed = true;
    showPaywall = false;
    activeView = 'journey';   // must redirect to 90-day on upgrade
  }

  return { onSubscribed, state: () => ({ activeView, isSubscribed, showPaywall }) };
}

describe('free → pro upgrade', () => {
  test('view switches to journey after subscribing', () => {
    const { onSubscribed, state } = simulateSubscription('mood');
    onSubscribed();
    expect(state().activeView).toBe('journey');
  });

  test('isSubscribed is true after subscribing', () => {
    const { onSubscribed, state } = simulateSubscription('mood');
    onSubscribed();
    expect(state().isSubscribed).toBe(true);
  });

  test('paywall is closed after subscribing', () => {
    const { onSubscribed, state } = simulateSubscription('mood');
    onSubscribed();
    expect(state().showPaywall).toBe(false);
  });

  test('upgrade from any view always lands on journey', () => {
    for (const startView of ['mood', 'flip'] as View[]) {
      const { onSubscribed, state } = simulateSubscription(startView);
      onSubscribed();
      expect(state().activeView).toBe('journey');
    }
  });
});
