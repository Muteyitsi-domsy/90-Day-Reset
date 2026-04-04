# Renew90 — Lessons Learned

> This file is Claude's persistent memory across sessions.
> After ANY correction from the user, add an entry here so the same mistake is never repeated.
> Review this file at the START of every session before touching any code.

---

## How to Use This File

Each lesson follows this format:

```
### [Short title of the mistake]
- **What happened:** Brief description of the error made
- **Why it was wrong:** The impact or the rule it violated
- **The rule:** What to always do instead
- **Affected area:** Which component / file / system
```

New lessons go at the TOP of the relevant section so the most recent ones are seen first.

---

## Sentry & Observability

### Upload source maps with every build
- **What happened:** Sentry caught real crashes but stack traces showed minified function names (`Vle`, `gte`) instead of readable code. The exact file and line were invisible without source maps.
- **Why it was wrong:** Debugging without source maps requires guesswork — reading minified context lines instead of actual function names. With source maps, Sentry shows the exact file:line of every crash.
- **The rule:** Upload source maps to Sentry at build time, every build. Add this to the post-build checklist. Reminder fires at end of every significant session.
- **Affected area:** Build process, Sentry dashboard

---

## Release & Version Management

### Tag a stable fallback after every significant session
- **What happened:** Multiple large features (security hardening, personality engine, paywall gating) were shipped with no annotated git tags — the last tag was from a much earlier version, leaving no safe rollback points.
- **Why it was wrong:** If a regression is found after several sessions of work, there's no clean point to roll back to without manual archaeology through commits.
- **The rule:** At the end of any session involving significant changes, create an annotated tag: `git tag -a vX.X.X-stable -m "description. N tests passing."` — before starting the next feature. Remind the user to do this if it hasn't been done.
- **Affected area:** Git, release process

### Build cadence vs commit cadence are separate concerns
- **What happened:** *(Template)*
- **Why it was wrong:** Conflating the two leads to either over-building (submitting half-baked features) or under-committing (holding back safe changes until build day).
- **The rule:** Commit and push freely to `main`. Build and submit on a cadence (target: every 1–2 weeks post-launch, trending toward monthly once stable). Tag a release candidate (`vX.X.X-rc`) before building so the version bump is deliberate.
- **Affected area:** Git, Android/iOS release process

---

## Mood-Only User Edge Cases

### setupJournal fires for mood-only users (no arc) — crashes promptGenerator
- **What happened:** When a new user chose "Continue with Mood Journal only", `handleContinueToMood` created a profile with no `arc` field. The `setupJournal` effect fired because `appState === 'journal' && userProfile && !userProfile.isPaused` — no arc check. It called `getDailyPrompt(userProfile, ...)` which did `PROMPTS[undefined][month]` → crash.
- **Why it was wrong:** Mood-only users don't have a 90-day arc and should never trigger the journal setup or daily prompt generation.
- **The rule:** Any effect or function that operates on the 90-day journey must guard against `!userProfile.arc`. Mood-only users are a valid, permanent state — not a bug to route around.
- **Affected area:** `App.tsx` (`setupJournal` effect), `services/promptGenerator.ts` (`getDailyPrompt`)

---

## Architecture & Component Boundaries

### 90 Day Journal is fully autonomous — no Mood/Flip data
- **What happened:** *(Template — fill in when a real instance occurs)*
- **Why it was wrong:** 90 Day has no data relationship with Mood or Flip. Introducing any cross-component dependency breaks the integrity of the 90-day arc as a self-contained journey.
- **The rule:** The only permitted cross-component data flow is Mood → Flip (optional link via `linkedMoodEntryId`). 90 Day is an island.
- **Affected area:** `App.tsx`, `src/services/`, any shared utilities

### Flip prompt pipeline ≠ Mood prompt pipeline
- **What happened:** *(Template — fill in when a real instance occurs)*
- **Why it was wrong:** They look similar at the API call level but serve fundamentally different purposes. Mood prompts validate and explore the user's current emotional state across a life area. Flip prompts create perspective distance from a specific stuck thought via a 3-step flow (challenge → AI reframing question → wiser-self response). Sharing the pipeline collapses that distinction.
- **The rule:** Never share a prompt generation function between Mood and Flip, even if the underlying API call is identical.
- **Affected area:** AI analysis layer, `services/geminiService.ts`

---

## MoodContext — The Most Common Real Bug

### Missing key in a Record<MoodContext, ...> map
- **What happened:** *(Template — fill in with specifics when it occurs)*
- **Why it was wrong:** Every value in the `MoodContext` enum must have a corresponding entry in every `Record<MoodContext, ...>` map. A missing key returns `undefined` silently at runtime — no TypeScript error, no crash, just wrong behaviour.
- **The rule:** Whenever adding a new `MoodContext` value OR creating a new `Record<MoodContext, ...>` map, immediately verify every enum value is accounted for. Current values: `career`, `family`, `romantic`, `friendships`, `physical_health`, `mental_health`, `spirituality`, `finances`, `studies`, `decisions`, `motherhood`, `fatherhood`.
- **Affected area:** `components/MoodJournalView.tsx`, any file using `MoodContext` as a Record key

---

## TypeScript False Positives — Do Not Touch

### Tried to fix a known false positive
- **What happened:** *(Template)*
- **Why it was wrong:** The known false positives in `ErrorBoundary.tsx`, `AdminDashboard.tsx`, `AuthModal.tsx`, `encryption.ts`, `validation.ts`, `MoodJournalView.tsx`, and `App.tsx` (backfillCompletions) have no runtime impact. Attempting to "fix" them risks introducing real bugs.
- **The rule:** Cross-reference CLAUDE.md's false positives table before touching any TypeScript error. If it's on the list, leave it alone.
- **Affected area:** See CLAUDE.md false positives table

---

## AI Output & Tone

### Pattern insight must NOT end with a question — Flip Journal handles that
- **What happened:** The pattern insight AI prompt was written to end with "a single question that opens". This was wrong.
- **Why it was wrong:** The pattern insight is a pure observation. It is immediately followed by the Flip Journal which asks its own reflective reframing question. Putting a question in the pattern insight creates awkward double-questioning and muddies the UX boundary between the two features.
- **The rule:** Pattern insights (`generatePatternInsight`) are observation-only — 1–2 sentences, no closing question. The Flip Journal prompt is entirely responsible for any reflective questioning that follows.
- **Affected area:** `services/geminiService.ts` → `generatePatternInsight`, pattern insight fallbacks

### Generated escalation copy without using pre-approved text
- **What happened:** *(Template)*
- **Why it was wrong:** Escalation messaging (triggered when Mood pattern recognition detects distress) must use pre-approved copy. Auto-generated crisis language is a liability — both legally and in terms of user trust and safety.
- **The rule:** Never auto-generate escalation or crisis-adjacent copy. If pre-approved copy doesn't exist for a scenario, flag it to the user rather than improvising. Do not reference a prompts file that doesn't exist yet.
- **Affected area:** Mood Journal escalation logic, `utils/crisisDetector.ts`, AI analysis layer

### Used clinical or generic language in AI output
- **What happened:** *(Template)*
- **Why it was wrong:** The product mission is gentle transformation. Clinical language (diagnostic terms, cold analysis) or generic affirmations both break the product's voice and can harm user trust.
- **The rule:** All AI output — prompts, reports, escalation, responses — must be warm, human, and grounded. Read it back and ask: *"Would this feel like a wise friend or a form letter?"*
- **Affected area:** All AI pipelines

---

## Firebase & Data

### Relied on client-side gating alone for paid features
- **What happened:** *(Template)*
- **Why it was wrong:** Client-side gating can be bypassed. Firebase Security Rules are the authoritative enforcement layer.
- **The rule:** Paid feature access is always enforced at two levels: Firebase Security Rules (server) AND client-side UI. Never implement gating only on the client.
- **Affected area:** `firestore.rules`, `src/services/firestoreService.ts`, Flip Journal, 90 Day Journal

### Wrote unencrypted journal content to Firestore
- **What happened:** *(Template)*
- **Why it was wrong:** Journal entry content must be encrypted before storage. Users write deeply personal content — it must be treated like health data.
- **The rule:** All journal entry content passes through `src/utils/encryption.ts` before any Firestore write. Never write raw entry text directly.
- **Affected area:** `src/services/firestoreService.ts`, `src/utils/encryption.ts`

---

## Testing

### Wrote a test file outside the `tests/` directory
- **What happened:** *(Template)*
- **Why it was wrong:** All test files must live in `tests/`. Files in `__tests__/` or at the project root are not picked up by the test runner.
- **The rule:** Tests go in `tests/`. Always. Use `.spec.ts` for feature/flow tests and `.test.ts` for service unit tests.
- **Affected area:** `tests/`

### Used jest imports instead of vitest
- **What happened:** *(Template)*
- **Why it was wrong:** The project uses Vitest. Jest imports cause test failures.
- **The rule:** Import `test`, `expect`, `describe`, `it` from `vitest` only. Never from `jest`.
- **Affected area:** All test files

---

## Versioning & Releases

### Bumped version in fewer than all required locations
- **What happened:** *(Template)*
- **Why it was wrong:** Android requires three locations (`build.gradle`, `package.json`, `Menu.tsx`). iOS requires `Info.plist`. Missing any causes a mismatch between store listings and in-app display.
- **The rule:** On every release, use the version bump checklist in CLAUDE.md. All locations, all platforms.
- **Affected area:** `android/app/build.gradle`, `package.json`, `components/Menu.tsx`, `ios/App/App/Info.plist`

---

## Session Start Checklist

Before beginning any work in a new session:

1. Read this file top to bottom — look for patterns relevant to the current task
2. Read `tasks/todo.md` — is there an in-progress task to resume?
3. Check `CLAUDE.md` false positives table if touching TypeScript files
4. Identify which journal component the task belongs to before touching any code
5. If the task involves AI output: confirm the prompt pipeline and tone requirements before writing any generation code
