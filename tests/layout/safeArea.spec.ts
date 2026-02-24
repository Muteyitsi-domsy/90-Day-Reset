/**
 * Structural regression tests — Safe Area Layout Contract
 * Ref: docs/layout/safe-area-spec.md
 *
 * File-read only. No DOM. No rendering.
 * Fails loudly if the iOS notch / Dynamic Island fix is reverted.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(__dirname, '../..');

const css        = readFileSync(resolve(root, 'src/index.css'), 'utf-8');
const html       = readFileSync(resolve(root, 'index.html'), 'utf-8');
const header     = readFileSync(resolve(root, 'components/Header.tsx'), 'utf-8');
const onboarding = readFileSync(resolve(root, 'components/Onboarding.tsx'), 'utf-8');

// ─── index.css ────────────────────────────────────────────────────────

describe('index.css — safe-area-top utility', () => {
  it('defines the @utility safe-area-top block', () => {
    expect(css).toContain('@utility safe-area-top');
  });

  it('uses env(safe-area-inset-top) inside the utility', () => {
    expect(css).toContain('env(safe-area-inset-top)');
  });

  it('wraps env() in max() to preserve baseline spacing on Android/desktop', () => {
    expect(css).toContain('max(1rem, env(safe-area-inset-top))');
  });

  it('has a responsive sm override at 640px matching Tailwind sm breakpoint', () => {
    expect(css).toContain('@media (min-width: 640px)');
    expect(css).toContain('max(1.5rem, env(safe-area-inset-top))');
  });

  it('does not hardcode a px padding-top value', () => {
    // Catches accidental regressions like padding-top: 44px or padding-top: 59px
    expect(css).not.toMatch(/padding-top:\s*\d+px/);
  });
});

describe('index.css — body insets', () => {
  it('applies env(safe-area-inset-bottom) to body', () => {
    expect(css).toContain('env(safe-area-inset-bottom)');
  });

  it('applies env(safe-area-inset-left) to body', () => {
    expect(css).toContain('env(safe-area-inset-left)');
  });

  it('applies env(safe-area-inset-right) to body', () => {
    expect(css).toContain('env(safe-area-inset-right)');
  });
});

// ─── index.html ───────────────────────────────────────────────────────

describe('index.html — viewport meta', () => {
  it('includes viewport-fit=cover (required for env() to resolve on iOS)', () => {
    expect(html).toContain('viewport-fit=cover');
  });
});

// ─── layout components ────────────────────────────────────────────────

describe('Header — sticky top-0 layout', () => {
  it('applies safe-area-top class', () => {
    expect(header).toContain('safe-area-top');
  });

  it('does not use bare p-4 (which overwrites top safe-area padding)', () => {
    // p-4 sets padding on all four sides equally, collapsing the safe-area-top utility
    expect(header).not.toMatch(/"[^"]*\bp-4\b[^"]*"/);
  });
});

describe('Onboarding — standalone full-screen wrapper', () => {
  it('applies safe-area-top on the outermost container', () => {
    expect(onboarding).toContain('safe-area-top');
  });

  it('does not use bare p-4 on the outermost wrapper (only inner elements may)', () => {
    // The outermost wrappers previously used p-4 sm:p-6 which caused notch overlap.
    // Inner elements (cards, inputs, option tiles) legitimately keep p-4 — this
    // assertion checks that the full-screen wrapper class string was corrected.
    expect(onboarding).not.toContain('min-h-screen p-4');
    expect(onboarding).not.toContain('min-h-screen p-6');
  });
});
