# Renew90 — Task Plan

> Claude writes here before touching any code.
> One active task at a time. Mark items complete as you go.
> Add a Review section when the task is done.

---

## How to Use

**Starting a task:**
1. Write the plan here with checkable items before writing any code
2. Get confirmation from the user if it's a non-trivial change
3. Work through items top to bottom, marking off as you go

**Finishing a task:**
- Add a `### Review` section summarising what was done and any decisions made
- If a mistake was corrected, add a lesson to `tasks/lessons.md`
- Clear or archive the completed plan before starting a new task

---

## Active Task

## Task: Personality-Aware Pattern Recognition Enhancement

**Component:** Mood Journal (Pattern Engine — Pro feature)
**Type:** Feature
**Started:** 2026-04-03

### Plan
- [x] Read and merge research docs (renew90_personality_research.docx, renew90_blueprint.docx, pattern_engine_spec.docx)
- [x] Read existing patternEngine.ts, types.ts, geminiService.ts, App.tsx, Menu.tsx
- [x] Update `types.ts` — add PatternType 'withdrawal', IntensityTrajectory, RecoverySpeed, PatternStickiness, PersonalityContext, UserProfile personality fields
- [x] Create `src/services/personalityPatterns.ts` — static knowledge base (16 MBTI + 9 Enneagram types, language cues, reframe hints)
- [x] Update `src/services/patternEngine.ts` — cascade A→B→C, withdrawal, intensity trajectory, recovery time, stickiness, language cue matching, personality enrichment
- [x] Update `services/geminiService.ts` — enhanced PatternInsightInput, personality-aware AI prompt (no closing question — Flip handles that)
- [x] Update `App.tsx` — pass personality profile to engine + insight generation
- [x] Update `components/Menu.tsx` — add Personality Insights section (Pro-gated, locked once set, on/off toggle)
- [x] Update `tests/patternEngine.spec.ts` — cascade, withdrawal, trajectory, language cues, personality enrichment, no-personality fallback
- [x] Run `npm test` — 698 tests pass (26 test files)
- [x] Run `npx tsc --noEmit` — no new errors beyond known false positives

### Review
All changes implemented and verified. 698 tests pass, no new TypeScript errors.

Key decisions made:
- Pattern type 'withdrawal' added (silence >= 3 days after high intensity, detected on return)
- Cascade (A→B→C) kept as cross_area with cascade_chain field — no new PatternType
- Personality layer is purely interpretive — never influences which pattern is detected
- Pattern insight prompt: observation only, NO closing question (Flip Journal owns the question)
- Menu personality section: shown for Pro users, locked once saved (mirrors Arc behaviour)
- personalityInsightsEnabled toggle: lets user turn off personality context without losing their type

### Notes

**Architecture decisions:**
- Cascade (A→B→C) stays within `cross_area` PatternType — adds `cascade_chain: MoodContext[]` field to PatternResult, not a new type
- Withdrawal is a new PatternType added to the union
- Personality ONLY adjusts interpretation/tone/context — never drives detection
- PatternResult extended in patternEngine.ts (not types.ts) since it's the internal result shape; types.ts only gets shared/stored types
- Menu personality section: locked once saved (like Arc), on/off toggle for the feature

**Priority order update:** cross_area > escalation > repetition > withdrawal

**Key insight prompt rules (from research doc):**
- Second person "you" language
- Tentative framing: "this might be", "it looks like", "there seems to be"
- End with a question that opens
- Never compare user to others of same type
- Never give advice, never clinical tone

---

## Backlog: Phase 2 — Year Bucket Database Structure + Export

**Component:** Cross-cutting (Mood, Flip, 90 Day Journal)
**Type:** Feature — backend data structure + export
**Priority:** Post-marketing, pre-scale

### Vision (from session 2026-04-04)

**Phase 1 (done):** UI-only grouping by year → month. No Firestore changes. `date: "YYYY-MM-DD"` on every entry drives client-side grouping.

**Phase 2:** True year bucket in Firestore + export link to external analysis site.

```
Database (Phase 2 target shape):
  users/{userId}/
    2026/
      Mood/
        Month 12 ... Month 1   ← entries + monthly summary
      Flip/
        Month 12 ... Month 1   ← entries (no summary)
      90DayJourneys/
        Journey 1, Journey 2, Journey 3   ← archived journeys
```

**Export (Phase 2):** A link/button that packages all three journals for a given year into a structured JSON payload and sends to an external analysis site (separate product, to be built). Both cloud and local-storage users need this path.

### Notes
- Phase 2 requires a Firestore migration for existing users — non-trivial, needs a migration script
- Do not restructure Firestore until user scale makes load time a real problem (thousands of entries across multiple years)
- `JourneyArchive.year` field already exists and maps cleanly to the year bucket
- Mood and Flip entries are currently flat collections — migration groups them by year subcollection
- Export format to agree with external analysis site before implementing

### Plan (when ready)
- [ ] Define export JSON schema with external site
- [ ] Write migration script: flat → year subcollections (dry-run first, then apply)
- [ ] Update firestoreService read/write paths for new structure
- [ ] Add export function that reads year bucket and POSTs to external endpoint
- [ ] Add export UI (button or link in Menu or settings)
- [ ] Run `npm test` — all tests pass
- [ ] Run `npx tsc --noEmit` — no new errors

---

## Template

```markdown
## Task: [Short descriptive title]

**Component:** Mood Journal / Flip Journal / 90 Day Journal / Cross-cutting
**Type:** Bug fix / Feature / Refactor / Release
**Started:** YYYY-MM-DD

### Plan
- [ ] Step one
- [ ] Step two
- [ ] Step three
- [ ] Run `npm test` — all tests pass
- [ ] Run `npx tsc --noEmit` — no new errors
- [ ] Run `/simplify` on changed files

### Notes
*(Decisions made, things to watch out for, relevant false positives)*

### Review
*(Added after completion — what was done, what was learned)*
```

---

## Completed Tasks Archive

*(Move completed task plans here with their Review sections)*
