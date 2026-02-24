# Safe Area Layout Contract & Testing Specification

**App:** Renew90 — React + Vite + Tailwind CSS v4 + Capacitor iOS
**Date:** 2026-02-24
**Status:** Active — enforced in production

---

## 1. Background

In February 2026, UI elements including the menu button, streak circle, and onboarding
headers were found to render under the iOS notch / Dynamic Island on Capacitor iOS builds,
making them partially unresponsive. The root causes were:

1. `viewport-fit=cover` was absent from the `<meta name="viewport">` tag, causing
   `env(safe-area-inset-*)` to always resolve to `0`.
2. No layout element applied top-inset padding to push content below the hardware notch.

This document defines the contract that prevents recurrence.

---

## 2. Foundational Rules

### Rule 1 — `viewport-fit=cover` is mandatory

```html
<!-- index.html — MUST remain exactly as below -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

Removing `viewport-fit=cover` silently disables all safe-area CSS on iOS. The change has
zero effect on Android or desktop.

### Rule 2 — Never hardcode pixel values for safe-area clearance

| Allowed | Forbidden |
|---|---|
| `env(safe-area-inset-top)` | `padding-top: 47px` |
| `max(1rem, env(safe-area-inset-top))` | `padding-top: 44px` |
| CSS custom property referencing `env()` | Any device-specific constant |

### Rule 3 — `env()` resolves to `0` on Android and desktop

All `env(safe-area-inset-*)` values are `0` on Android WebView and desktop browsers.
Using them introduces zero risk of layout change on those platforms.

### Rule 4 — `max()` preserves the baseline layout value

When replacing an existing padding with a safe-area-aware value, wrap in `max()` so
the original spacing is preserved on non-iOS platforms:

```css
/* Correct — 1rem on Android/desktop, ≥1rem on iOS */
padding-top: max(1rem, env(safe-area-inset-top));

/* Wrong — collapses to 0 on Android/desktop */
padding-top: env(safe-area-inset-top);
```

---

## 3. Safe Area Application Contract

### 3.1 Root Level (applied once, globally)

**File:** `src/index.css`

```css
@import "tailwindcss";

@utility safe-area-top {
  padding-top: max(1rem, env(safe-area-inset-top));
}

body {
  padding-bottom: env(safe-area-inset-bottom);
  padding-left:   env(safe-area-inset-left);
  padding-right:  env(safe-area-inset-right);
}
```

The `body` handles left, right, and bottom insets globally.
The `safe-area-top` utility is applied at screen level (see §3.2).

### 3.2 Sticky/Fixed Header — Screen Level

**File:** `components/Header.tsx`

The `Header` uses `sticky top-0`. Its internal `padding-top` absorbs the top inset so
the background visually covers the hardware notch zone and interactive elements
(menu button, streak circle) remain fully below it.

```jsx
// Current — correct
<header className="... px-4 pb-4 safe-area-top sticky top-0 z-10">
```

**Do not revert to `p-4`** without restoring equivalent safe-area top padding.

### 3.3 Screens That Render Without a Header

Screens that render directly without `<Header>` (e.g., `Onboarding`, `IntentionSetting`,
`IdealSelfScripting`, loading states) must apply safe-area top clearance on their own
outermost container:

```jsx
// Required pattern for header-less screens
<div className="flex flex-col min-h-screen safe-area-top px-4">
  ...
</div>
```

Current status of header-less screens:

| Screen | Has `safe-area-top`? | Action required |
|---|---|---|
| `Onboarding` | No | Add `safe-area-top` to outermost container |
| `IntentionSetting` | No | Add `safe-area-top` to outermost container |
| `IdealSelfScripting` | No | Add `safe-area-top` to outermost container |
| `OnboardingCompletion` | No | Add `safe-area-top` to outermost container |
| Loading spinner (`authLoading`) | N/A — centered content | Low risk; monitor |

> **Note:** These screens are marked for a follow-up pass. Until that pass is complete,
> test them explicitly on notch/Dynamic Island simulators (see §5).

### 3.4 Fixed Full-Screen Modals (`fixed inset-0`, full background)

These modals occupy the entire screen including the hardware safe area. They must apply
safe-area top padding internally so content does not start under the notch.

Pattern:

```jsx
<div className="fixed inset-0 bg-[...] z-40">
  {/* Inner scroll container must clear the top inset */}
  <div className="flex flex-col h-full safe-area-top px-4 pb-4">
    ...
  </div>
</div>
```

Affected components (currently use `pt-12` as a hardcoded workaround):

| Component | Current top clearance | Required change |
|---|---|---|
| `JournalInputModal` | `pt-12` (hardcoded) | Replace with `safe-area-top` |
| `MoodInputModal` | `pt-12` (hardcoded) | Replace with `safe-area-top` |
| `FlipInputModal` | `pt-12` (hardcoded) | Replace with `safe-area-top` |

> `pt-12` = 48px, which happens to clear most notches today. It is fragile: it can break
> on future hardware and breaks the no-hardcode rule. These are flagged for the next
> maintenance pass.

### 3.5 Centered Overlay Modals (`fixed inset-0 flex items-center justify-center`)

These modals center their card content. Because content is vertically centered and
surrounded by `p-4` on the outer container, they are naturally clear of the notch in
almost all cases.

**No additional safe-area padding required** unless a modal has a sticky/fixed header
bar of its own.

Components in this category: `MilestoneCelebration`, `BadgeCollection`, `CrisisModal`,
`CalendarView`, `MonthlySummaryModal`, `AnnualRecapModal`, `SettingsModal`,
`EveningCheckinModal`, `MFASetupModal`, `MFAVerificationModal`, `NewJourneyChoiceModal`,
`PaywallModal`, `FlipPromptModal`, `ReportViewer`, `PrivacyPolicy`, `TermsOfService`,
`ContactUs`, `AdminDashboard`, `SharePrompt`.

### 3.6 Slide-In Panels (`fixed inset-0 flex justify-start`)

The `Menu` component uses a left-side slide-in panel. The panel's inner content must
clear the top inset:

```jsx
{/* Inside the sliding panel div */}
<div className="safe-area-top px-4 ...">
  ...
</div>
```

Current status: **not applied** — flagged for next pass.

---

## 4. Z-Index and Layering Reference

| Layer | z-index | Usage |
|---|---|---|
| Base content | — | Normal flow |
| Sticky header | `z-10` | `Header` |
| Full-screen modals | `z-40` | Journal/Mood/Flip input |
| Standard overlays | `z-50` | Most modals, `Menu`, `MilestoneCelebration` |
| Top-tier overlays | `z-[60]` | `PrivacyPolicy`, `TermsOfService`, `ContactUs` |

All layers that touch `z-50` and above render over the header. They are responsible for
their own safe-area top clearance (see §3.4 and §3.5).

---

## 5. Manual Validation Checklist

Run this checklist after any change to:
- `index.html` (viewport meta)
- `src/index.css`
- `components/Header.tsx`
- Any component listed in §3.3, §3.4, or §3.6
- Capacitor or iOS project config

### 5.1 Simulator Models to Test

| Simulator | Notch type | Priority |
|---|---|---|
| iPhone 15 Pro | Dynamic Island | P0 |
| iPhone 16 Pro | Dynamic Island | P0 |
| iPhone 17 Pro (when available) | Dynamic Island | P0 |
| iPhone 14 | Classic notch | P1 |
| iPhone SE (3rd gen) | No notch | P1 — confirm no extra gap |
| iPad Pro 12.9" | No notch | P2 |

### 5.2 Checklist

#### Startup & Main App
- [ ] Menu icon (top-left) fully visible, not obscured by notch or Dynamic Island
- [ ] Streak circle / completion circle (top-right) fully visible and tappable
- [ ] Header background fills the hardware safe-area zone (no raw screen color showing above header)
- [ ] Title text is not clipped under the notch
- [ ] Scroll down — header sticks correctly, still clears the notch
- [ ] Scroll back to top — header returns to natural position

#### Onboarding Flow
- [ ] First question label is visible and not obscured on notch devices
- [ ] Back/Next buttons are not cut off at top
- [ ] Step indicator (dots) visible
- [ ] Completion screen title visible

#### Full-Screen Modals (Journal, Mood, Flip inputs)
- [ ] Close button (top-right ×) fully tappable on notch devices
- [ ] First input field / question label not hidden under notch
- [ ] Bottom submit button not cut off by home indicator

#### Centered Overlay Modals
- [ ] Card is fully visible with padding on all sides
- [ ] Close button inside card is tappable
- [ ] No card content clipped by notch (card should never sit flush with top)

#### Menu (slide-in panel)
- [ ] First menu item not hidden under notch
- [ ] Menu header / user info visible

#### iPhone SE (no-notch check)
- [ ] No extra dead space at top of screen compared to before
- [ ] All layouts identical to pre-change appearance

#### Landscape Orientation
- [ ] Left/right safe-area insets (`env(safe-area-inset-left/right)`) keep content
      clear of rounded screen corners and camera cutouts

---

## 6. Structural Regression Test

Place this file at `tests/safeAreaContract.test.ts`.

It verifies the two structural guarantees that must never be silently removed:
`viewport-fit=cover` in HTML and the `safe-area-top` utility in CSS.

```typescript
/**
 * Structural regression test — Safe Area Layout Contract
 * Run: npx tsx tests/safeAreaContract.test.ts
 *
 * Verifies that the two foundational safe-area guarantees are present.
 * If either assertion fails, the iOS notch/Dynamic Island fix has been
 * accidentally removed and must be restored before shipping.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.error(`  FAIL  ${label}`);
    if (detail) console.error(`        ${detail}`);
  }
}

const root = resolve(__dirname, '..');

const html = readFileSync(resolve(root, 'index.html'), 'utf-8');
const css  = readFileSync(resolve(root, 'src/index.css'), 'utf-8');
const header = readFileSync(resolve(root, 'components/Header.tsx'), 'utf-8');

console.log('\n--- Safe Area: viewport meta ---');

assert(
  html.includes('viewport-fit=cover'),
  'index.html viewport meta includes viewport-fit=cover',
  'Add viewport-fit=cover to <meta name="viewport"> — without it env() is always 0 on iOS.'
);

console.log('\n--- Safe Area: CSS utility definition ---');

assert(
  css.includes('@utility safe-area-top'),
  'index.css defines @utility safe-area-top',
  'The @utility safe-area-top block is missing from src/index.css.'
);

assert(
  css.includes('env(safe-area-inset-top)'),
  'safe-area-top utility references env(safe-area-inset-top)',
  'The utility must use env(safe-area-inset-top), not a hardcoded pixel value.'
);

assert(
  css.includes('env(safe-area-inset-bottom)'),
  'body includes env(safe-area-inset-bottom) for bottom inset',
  'body padding-bottom must reference env(safe-area-inset-bottom).'
);

assert(
  !css.match(/padding-top:\s*\d+px/),
  'index.css does not hardcode a px value for padding-top',
  'A hardcoded pixel top-padding was found. Use env(safe-area-inset-top) instead.'
);

console.log('\n--- Safe Area: Header applies safe-area-top ---');

assert(
  header.includes('safe-area-top'),
  'Header.tsx uses safe-area-top class',
  'Header sticky top-0 must have safe-area-top applied. Do not revert to plain p-4.'
);

assert(
  !header.includes("'p-4'") && !header.includes('"p-4"'),
  'Header.tsx does not use bare p-4 (which drops the top safe-area clearance)',
  'p-4 sets equal padding on all sides including top. Replace with px-4 pb-4 safe-area-top.'
);

console.log(`\n========================================`);
console.log(`  ${passed + failed} tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  console.error('Safe area regression detected. See FAILING tests above.');
  console.error('Ref: docs/layout/safe-area-spec.md\n');
}

process.exit(failed > 0 ? 1 : 0);
```

### Running the test

```bash
npx tsx tests/safeAreaContract.test.ts
```

Add to your pre-release checklist alongside the other test suites:

```bash
npx tsx tests/streakService.test.ts
npx tsx tests/milestoneService.test.ts
npx tsx tests/safeAreaContract.test.ts
```

---

## 7. Rebuild & Sync Procedure

After any layout change:

```bash
# 1. Run structural contract test
npx tsx tests/safeAreaContract.test.ts

# 2. Build web assets
npm run build

# 3. Sync to iOS Capacitor project
npx cap sync ios

# 4. Open Xcode
npx cap open ios
# Product → Clean Build Folder (Shift+Cmd+K)
# Product → Run (Cmd+R) on target simulator
```

---

## 8. Quick Reference Card

| Situation | Solution |
|---|---|
| Screen has `<Header>` | Header handles top inset via `safe-area-top` |
| Screen has no `<Header>` | Add `safe-area-top` to outermost container |
| Full-screen modal (`fixed inset-0`, fills background) | Add `safe-area-top` to inner scroll container |
| Centered overlay modal (`fixed inset-0 flex items-center justify-center`) | No change needed — centered content clears notch naturally |
| Slide-in panel | Add `safe-area-top` to panel's inner content wrapper |
| Element must stick below notch while scrolling | Use `sticky top-0` + `safe-area-top` internal padding (do not change `top` value) |
| New `fixed top-0` element | Use `top-[env(safe-area-inset-top)]` or apply `safe-area-top` internally |

---

## 9. Related Files

| File | Role |
|---|---|
| `index.html` | Contains `viewport-fit=cover` |
| `src/index.css` | Defines `@utility safe-area-top`, body left/right/bottom insets |
| `components/Header.tsx` | Applies `safe-area-top`, sticky header |
| `tests/safeAreaContract.test.ts` | Structural regression test |
| `docs/layout/safe-area-spec.md` | This document |
