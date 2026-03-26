# Renew90 — Claude Code Instructions

## Running Tests

All tests live in `tests/`. Run everything with a single command:

```bash
npm test
```

This runs all `*.spec.ts` and `*.test.ts` files in `tests/`. All 15 files must pass before committing.

## TypeScript Check Protocol

Before committing, run:

```bash
npx tsc --noEmit
```

### Known False Positives — Do NOT attempt to fix these

The following errors are pre-existing structural issues that have no runtime impact.
They are not regressions. Leave them alone.

| Error | File(s) | Why it's safe |
|---|---|---|
| `Property 'state'/'setState'/'props' does not exist` | `components/ErrorBoundary.tsx` | Class component with correct generics; TS compiler quirk with `useDefineForClassFields: false` |
| `Cannot find namespace 'React'` | `components/AdminDashboard.tsx`, `components/AuthModal.tsx` | `react-jsx` transform handles React at runtime; these use `React.FC` notation |
| `Cannot find module '../types'` | `src/services/firestoreService.ts`, `src/services/localStorageService.ts`, `src/services/storageService.ts` | `types.ts` is at project root; Vite resolves it correctly at runtime. tsc path resolution differs. |
| Arithmetic on `unknown` | `components/MoodJournalView.tsx` | `.map(Number)` inference issue; works correctly at runtime |
| `Property 'message'/'timestamp' does not exist on type 'unknown'` | `src/utils/encryption.ts` | Caught errors typed as `unknown` (TS 4.0+ strictness); runtime unaffected |
| `Property 'errors' does not exist on type 'ZodError'` | `src/utils/validation.ts` | Zod version API mismatch in types; runtime works |
| `Property 'date' does not exist on type 'unknown'` | `App.tsx` (backfillCompletions) | Map value inference issue; runtime works correctly |

### Real errors to fix

Any error NOT in the list above is a real bug. Fix it before running tests or committing.
Common real-error patterns seen previously:
- Missing keys in `Record<MoodContext, ...>` maps — causes undefined at runtime
- Calling a function that no longer exists — causes `ReferenceError` at runtime
- Accessing a field that was removed from a type — causes `undefined` silently

## Test File Rules

1. All test files go in `tests/` — never in `__tests__/` or at the project root
2. Use `.spec.ts` for feature/flow tests, `.test.ts` for service unit tests
3. Use vitest's `test()` and `expect()` — never a custom assert/eq harness with `process.exit()`
4. No `describe`/`it` imports from jest — import from `vitest` only

## Commit Checklist

Before every commit:
- [ ] `npm test` — all tests pass (currently 445)
- [ ] `npx tsc --noEmit` — no NEW errors beyond the known false positives above
- [ ] New features have tests covering the core logic
