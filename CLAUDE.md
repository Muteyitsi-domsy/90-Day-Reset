# Renew90 — CLAUDE.md

> **Every session — read in this order before touching any code:**
> 1. `CLAUDE.md` (this file) — rules and conduct
> 2. `ARCHITECTURE.md` — system map, data flows, schema
> 3. `tasks/lessons.md` — past mistakes and corrected patterns
> 4. `tasks/todo.md` — active task plan to resume or start fresh
>
> Do not skip steps. Do not begin work until all four are read.

> A premium structured journalling app for gentle personal transformation through AI-guided self-reflection.
> Three core components: **90 Day Journal** · **Mood Journal** · **Flip Journal**

---

## Project Overview

Renew90 is a cross-platform TypeScript app (Android, iOS, Web) with Firebase as the sole backend for both authentication and database. It guides users through intentional, structured self-reflection with AI analysis — not as a productivity tool, but as a vehicle for *gentle transformation*. The tone of everything — copy, prompts, AI output, UI — must reflect that mission.

**Tech stack:** React · TypeScript · Capacitor · Firebase (Auth + Firestore) · Vite · Zod · Vitest

**Platforms:** Android (Play Store) · iOS (App Store) · Web app

**Monetisation:** Mood Journal is free (acquisition funnel). Flip Journal and 90 Day Journal are paid/premium.

---

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep the main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One focused task per subagent

### 3. Self-Improvement Loop
- After ANY correction from a user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project context

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behaviour between main and your changes when relevant
- Ask yourself: *"Would a staff engineer approve this?"*
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask *"Is there a more elegant way?"*
- If a fix feels hacky: *"Knowing everything I know now, implement the elegant solution"*
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

---

## Task Management

1. **Plan First:** Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan:** Check in before starting implementation
3. **Track Progress:** Mark items complete as you go
4. **Explain Changes:** High-level summary at each step
5. **Document Results:** Add review section to `tasks/todo.md`
6. **Capture Lessons:** Update `tasks/lessons.md` after any corrections

---

## Core Principles

- **Simplicity First:** Make every change as simple as possible. Impact minimal code.
- **No Laziness:** Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact:** Only touch what's necessary. No side effects with new bugs.
- **Preserve Component Boundaries:** Mood → Flip is the only permitted cross-component data flow. 90 Day is autonomous. Do not introduce new cross-component dependencies without explicit instruction.
- **Gentle Transformation is the Product:** Every AI prompt, report, escalation message, and UI string is part of a user's emotional journey. Write accordingly — never cold, never generic, never rushed.
- **Free vs Paid Integrity:** Mood is always free. Flip and 90 Day are always gated. Never accidentally expose paid features to free users, and never degrade the free experience as a conversion tactic.

---

## App Architecture — Key Concepts

### Component Relationships
```
Mood Journal (free) ──optional link──► Flip Journal (paid)
                                               │
90 Day Journal (paid, autonomous) ◄────────────┘ (no direct link)
```
Mood and Flip have an optional coupling: a Mood entry can be sent to Flip, pre-populating the challenge. Flip also works standalone with no mood link. 90 Day is fully independent — it shares no data with Mood or Flip in either direction. Never introduce cross-component dependencies outside this model.

---

### Mood Journal (Free — Acquisition Funnel)
- Entry point for all users; free tier drives conversion to paid components
- User selects three inputs per entry: **emotion** (from a default list or a custom emotion they define), **intensity** (low / medium / high), and **life area** (MoodContext: career, family, romantic, friendships, physical health, mental health, spirituality, finances, studies, decisions, motherhood, fatherhood) — all three inputs together generate the AI-powered journal prompt
- Runs a **pattern engine** across entries that detects three pattern types: `repetition` (same mood/area recurring), `escalation` (worsening trend in an area), and `cross_area` (emotional spillover between life areas) — insights are surfaced once enough data exists and suppressed for 48 hours after showing
- Includes **crisis detection**: if journal text matches crisis-level patterns, the app responds with care-based messaging (never clinical, never alarming — gentle); severity scoring drives escalation thresholds
- Generates **monthly summaries** and an **annual recap** — both include AI analysis of mood patterns across life areas
- Has its own independent streak tracking (`moodStreak`, `lastMoodEntryDate`)
- An individual Mood entry can optionally be sent to Flip Journal: the entry's journal text becomes the opening challenge in a Flip session, with a reference stored via `linkedMoodEntryId`
- Uses `MoodContext` enum throughout; arithmetic on `.map(Number)` is intentional — do not change

### Flip Journal (Paid)
- A cognitive reframing tool structured as a deliberate 3-step flow:
  1. **Challenge** — the user names the stuck thought or situation they want to shift
  2. **Reframing question** — AI generates a perspective-opening question tailored to that challenge
  3. **Wiser-self response** — the user writes their own answer from a more grounded perspective (`reframedPerspective`)
- Can be opened in two ways: independently (user starts fresh with their own challenge), or triggered from a Mood entry (Mood's journal text is passed in as the initial challenge, `linkedMoodEntryId` is set)
- The reframing question is grounded in the user's actual challenge — not a generic affirmation
- Tone: curious, spacious, non-directive — it opens a door, it does not push
- Has its own independent streak tracking (`flipStreak`, `lastFlipEntryDate`)
- Prompt logic is distinct from Mood's prompt logic — do not share prompt generation pipelines

### 90 Day Journal (Paid)
- Fully autonomous from Mood and Flip — no data sharing in either direction
- At onboarding, the user completes a reflection questionnaire; AI analysis assigns them an **Arc** (`release` | `reaffirm` | `reignition`) that shapes the tone and direction of all AI-generated prompts throughout the journey:
  - `release` — processing and letting go of past experiences
  - `reaffirm` — grounding, stabilising, reconnecting with self
  - `reignition` — forward momentum, active identity creation
- Daily structure: optional **morning ritual** (tracked separately) + **morning journal entry** (the core daily entry) + optional **evening check-in** (reflection on the day's micro-action and alignment)
- In addition to daily entries, users can log three bonus entry types at any time:
  - **Intuitive Hunch** (`hunchType: 'hunch'`) — a gut feeling or instinct worth recording
  - **Dream Record** (`hunchType: 'dream'`) — a dream the user wants to capture
  - **Sudden Insight** (`hunchType: 'insight'`) — an unexpected realisation
- Generates **weekly AI summary reports** and **monthly AI summary reports** stored as journal entries (`type: 'weekly_summary_report'` / `type: 'monthly_summary_report'`)
- Tracks streak, milestones, and awards **badges** at days 7, 14, 30, 60, and 90
- On day 90 completion: generates a **PDF keepsake** — a formatted record of the full journey
- On restart: the completed journey is archived to `JourneyArchive` in Firestore (only 90 Day entries are archived; Mood and Flip data is never wiped)
- `backfillCompletions` in `App.tsx` handles map value inference — known false positive, do not touch

---

### AI Analysis — Global Rules
- All AI output must be **warm, insightful, and human** — never clinical, never generic, never alarming
- The mission is *gentle transformation* — prompts and analysis should feel like a wise, caring companion, not a productivity app
- Never expose raw model output directly to the UI without formatting and sanitising
- User journal data is sensitive — treat it with the same care as health data
- Escalation responses (Mood Journal) must use pre-approved copy — do not auto-generate crisis language

---

### Firebase Architecture
- Firebase handles **all auth and database** — there is no separate backend server
- Firestore is the database; Firebase Auth manages all user sessions across platforms
- `firestoreService.ts`, `localStorageService.ts`, and `storageService.ts` all resolve types from project root — this is a known tsc path quirk, not a runtime issue

---

### Reports
- **90 Day Journal**: generates weekly and monthly AI summary reports, stored as `JournalEntry` records with `type: 'weekly_summary_report'` / `type: 'monthly_summary_report'`
- **Mood Journal**: generates monthly mood summaries and an annual recap, tracked via `MoodSummaryState` on the user profile
- All reports use AI analysis and must reflect the gentle transformation tone
- Report generation should never block the UI thread

---

## Running Tests

All tests live in `tests/`. Run everything with:

```bash
npm test
```

This runs all `*.spec.ts` and `*.test.ts` files. **All 17 test files must pass before committing.**

### Test File Rules
1. All test files go in `tests/` — never in `__tests__/` or at the project root
2. Use `.spec.ts` for feature/flow tests, `.test.ts` for service unit tests
3. Use vitest's `test()` and `expect()` — never a custom assert/eq harness with `process.exit()`
4. No `describe`/`it` imports from jest — import from `vitest` only

---

## TypeScript Check Protocol

Before committing:

```bash
npx tsc --noEmit
```

### Known False Positives — Do NOT fix these

These are pre-existing structural issues with no runtime impact. Leave them alone.

| Error | File(s) | Why it's safe |
|---|---|---|
| `Property 'state'/'setState'/'props' does not exist` | `components/ErrorBoundary.tsx` | Class component with correct generics; TS compiler quirk with `useDefineForClassFields: false` |
| `Cannot find namespace 'React'` | `components/AdminDashboard.tsx`, `components/AuthModal.tsx` | `react-jsx` transform handles React at runtime |
| `Cannot find module '../types'` | `src/services/firestoreService.ts`, `src/services/localStorageService.ts`, `src/services/storageService.ts` | `types.ts` is at project root; Vite resolves correctly at runtime |
| Arithmetic on `unknown` | `components/MoodJournalView.tsx` | `.map(Number)` inference issue; works correctly at runtime |
| `Property 'message'/'timestamp' does not exist on type 'unknown'` | `src/utils/encryption.ts` | Caught errors typed as `unknown` (TS 4.0+ strictness); runtime unaffected |
| `Property 'errors' does not exist on type 'ZodError'` | `src/utils/validation.ts` | Zod version API mismatch in types; runtime works |
| `Property 'date' does not exist on type 'unknown'` | `App.tsx` (backfillCompletions) | Map value inference issue; runtime works correctly |

### Real Errors to Fix

Any error NOT in the list above is a real bug. Fix it before running tests or committing. Common patterns:
- Missing keys in `Record<MoodContext, ...>` maps — causes `undefined` at runtime
- Calling a function that no longer exists — causes `ReferenceError` at runtime
- Accessing a field removed from a type — causes silent `undefined`

---

## Code Quality Rule

**Always run `/simplify` after every code fix or new feature addition.**

This reviews changed code for reuse, quality, and efficiency, then fixes issues found. No exceptions — this keeps the codebase clean as it grows.

---

## Commit Checklist

Before every commit:
- [ ] `npm test` — all tests pass
- [ ] `npx tsc --noEmit` — no NEW errors beyond known false positives above
- [ ] New features have tests covering core logic
- [ ] `/simplify` has been run on all changed files
- [ ] Platform release: all version locations updated (Android × 3, iOS plist, package.json)
- [ ] Free/paid gating verified — no paid feature leaking to free users
- [ ] AI output reviewed for tone — warm, human, gentle transformation mission intact

---

## Version Bump Checklist

### Android
Every Android release requires bumping in **all three places**:

| File | Field | Example |
|---|---|---|
| `android/app/build.gradle` | `versionCode` (+1 each release) and `versionName` (semver) | `versionCode 28`, `versionName "2.2.1"` |
| `package.json` | `"version"` | `"version": "2.2.1"` |
| `components/Menu.tsx` | In-app version string (search `Renew90 v`) | `Renew90 v2.2.1` |

### iOS
- Bump `CFBundleShortVersionString` and `CFBundleVersion` in `ios/Renew90/Info.plist` to match

### Web
- `package.json` version covers the web build — no separate web version file

**Versioning pattern:** Patch bumps within a minor (2.2.0 → 2.2.1 → ... → 2.2.9), then bump minor (2.2.9 → 2.3.0). `versionCode` increments by 1 every release regardless.

---

## What NOT to Do

- Don't introduce data sharing between 90 Day and Mood/Flip — 90 Day is fully autonomous
- Don't share prompt generation pipelines between Mood and Flip — they serve fundamentally different purposes
- Don't expose raw AI output directly to the UI — always format and sanitise first
- Don't write clinical, alarming, or cold language anywhere — prompts, reports, escalation messages, or UI copy
- Don't add new TypeScript errors beyond the known false positives list
- Don't write tests in `__tests__/` or import from jest — vitest only
- Don't skip `/simplify` — even for "small" changes
- Don't bump only some version locations on a release — all platforms must be in sync
- Don't gate Mood Journal behind payment — it is always the free funnel
- Don't auto-generate crisis or escalation messaging without pre-approved copy
- Don't treat this as a productivity app — the mission is gentle transformation; every decision should serve that
