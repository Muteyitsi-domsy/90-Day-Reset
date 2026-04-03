# Renew90 — Architecture

> Last updated: manually maintained. Update this file whenever a significant structural decision is made.

---

## Mission Context

Renew90 is not a productivity tool. It is a **gentle transformation** platform. Every architectural decision should serve that — fast enough to feel responsive, simple enough that the user never feels the technology, private enough that users trust it with their inner life.

---

## Platform Overview

| Platform | Distribution | Notes |
|---|---|---|
| Android | Google Play Store | Primary release target; `versionCode` + `versionName` in `build.gradle` |
| iOS | Apple App Store | `CFBundleShortVersionString` + `CFBundleVersion` in `ios/App/App/Info.plist` |
| Web | Hosted web app | Same codebase via Vite; `package.json` version covers this |

All three platforms share one codebase. Platform-specific logic is isolated to native config files and Capacitor build targets — the React + TypeScript core is shared across all three.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | React + TypeScript | Cross-platform UI |
| Native bridge | Capacitor | Packages the web app as a native Android/iOS binary |
| Build (web) | Vite | Web bundler |
| Backend | Firebase (Auth + Firestore) | Auth and all data storage — no separate server |
| AI proxy | Vercel serverless + Firebase Cloud Functions | Secure Vertex AI access with auth, rate limiting, App Check |
| Subscriptions | RevenueCat | Subscription management across Android and iOS |
| Validation | Zod | Runtime schema validation |
| Testing | Vitest | Unit and feature tests |
| Encryption | `src/utils/encryption.ts` | Journal content encrypted before storage |
| PDF generation | jsPDF | Keepsake PDF generated client-side and downloaded locally |

**There is no separate backend server.** Firebase is the entire backend. All business logic either lives in the client, Firebase Security Rules, or Cloud Functions.

---

## Folder Structure

```
/
├── App.tsx                          # Root component; backfillCompletions lives here
├── types.ts                         # Shared types — project root (intentional; Vite resolves this)
├── package.json
│
├── api/
│   ├── vertex-ai.ts                 # Vercel serverless: Vertex AI proxy (Redis rate limiting)
│   └── security-config.ts           # CORS, security headers, rate limit constants
│
├── components/
│   ├── AdminDashboard.tsx           # Admin-only view
│   ├── AuthModal.tsx                # Firebase Auth UI
│   ├── ErrorBoundary.tsx            # Class component; known TS false positives
│   ├── FlipJournalView.tsx          # Flip Journal UI
│   ├── Menu.tsx                     # In-app nav; contains version display string
│   ├── MoodJournalView.tsx          # Mood Journal UI; .map(Number) is intentional
│   └── [other components]
│
├── services/
│   ├── geminiService.ts             # All AI prompt generation and report pipelines
│   ├── subscriptionService.ts       # RevenueCat integration + beta code redemption
│   └── [other services]
│
├── src/
│   ├── config/
│   │   └── firebase.ts              # Firebase + App Check initialisation
│   ├── services/
│   │   ├── firestoreService.ts      # All Firestore read/write operations
│   │   ├── localStorageService.ts   # Local persistence layer (offline/cache)
│   │   └── storageService.ts        # Abstraction over firestore + local
│   └── utils/
│       ├── appCheck.ts              # Shared App Check token helper (web + native)
│       ├── auditLog.ts              # Security event logging
│       ├── encryption.ts            # Encrypt/decrypt journal content
│       └── validation.ts            # Zod schemas; known ZodError type false positive
│
├── functions/
│   └── src/index.ts                 # Firebase Cloud Functions (vertexAiProxy, validateBetaCodeHttp)
│
├── tests/                           # ALL tests live here — never in __tests__/
│   └── *.spec.ts / *.test.ts
│
├── tasks/
│   ├── todo.md                      # Active task plan (Claude writes here)
│   └── lessons.md                   # Claude's self-correction log
│
├── docs/                            # Project documentation
│
├── android/
│   └── app/build.gradle             # versionCode + versionName
│
└── ios/
    └── App/App/Info.plist           # CFBundleShortVersionString + CFBundleVersion
```

---

## Firebase Architecture

### Authentication
- Firebase Auth handles all user sessions across Android, iOS, and Web
- Auth state is the source of truth for user identity — subscription entitlements are managed by RevenueCat, not Firebase
- `AuthModal.tsx` is the entry point for all sign-in/sign-up flows
- Firebase App Check enforces that requests come from the genuine app binary (Play Integrity on Android, App Attest on iOS, reCAPTCHA v3 on web)

### Firestore Database Schema

```
users/{userId}                              # UserProfile document (name, arc, startDate, streak, etc.)
  │
  ├── journalEntries/{entryId}             # 90 Day Journal entries
  │     type: 'daily'                       # Standard daily entry
  │     type: 'hunch'                       # Bonus entries: hunchType 'hunch' | 'dream' | 'insight'
  │     type: 'weekly_summary_report'       # AI-generated weekly summary
  │     type: 'monthly_summary_report'      # AI-generated monthly summary
  │     content: string (encrypted)
  │     week: number, day: number
  │
  ├── moodEntries/{entryId}                # Mood Journal entries
  │     emotion: string                     # Default or custom emotion name
  │     intensity: 'low' | 'medium' | 'high'
  │     context: MoodContext                # Life area (career, family, finances, etc.)
  │     prompt: string                      # AI-generated prompt shown to user
  │     journalText: string (encrypted)     # User's written response
  │     timestamp: string
  │
  ├── flipJournalEntries/{entryId}         # Flip Journal entries
  │     challenge: string                   # The stuck thought/situation
  │     reframingQuestion: string           # AI-generated perspective-shift question
  │     reframedPerspective: string         # User's wiser-self written response
  │     linkedMoodEntryId?: string          # Optional FK to moodEntries (if triggered from Mood)
  │     timestamp: string
  │
  ├── journeyArchives/{archiveId}          # Immutable record of a completed 90-day journey
  │     arc, startDate, completedDate       # Journey metadata
  │     intentions, idealSelfManifesto      # User's stated intentions + manifesto
  │     entries: JournalEntry[]             # All daily/hunch/report entries (wiped on restart)
  │     (mood and flip entries are NOT archived — they persist independently)
  │
  └── patternMemory/{patternId}            # Mood Journal pattern recognition state
        pattern_type: 'repetition' | 'escalation' | 'cross_area'
        occurrences: number
        month_bucket: string               # YYYY-MM
        last_shown?: string                # ISO — used for 48h suppression

betaCodes/{code}                           # Beta access codes (validated by Cloud Function)
  active: boolean, expiresAt, usageLimit, usageCount, durationDays

rateLimits/{userId}                        # Per-user daily AI request count (Cloud Functions)
rateLimits/_spend_                         # Monthly Vertex AI spend tracking (Cloud Functions)
```

### Cloud Functions (Firebase Functions v2, us-central1)

| Function | Purpose |
|---|---|
| `vertexAiProxy` | Proxies Vertex AI requests. Enforces App Check, verifies Firebase ID token via Admin SDK, rate limits per user via Firestore, calls Vertex AI with ambient GCP credentials |
| `validateBetaCodeHttp` | Validates beta access codes against `betaCodes/` collection using an atomic transaction. Enforces App Check |

### Security Rules Principles
- Users can only read/write their own documents — never cross-user access
- Subscription gating enforced in Firebase Security Rules (server) AND client-side UI — never client-only
- Journal content is sensitive — treat Firestore documents like health records

### PDF Keepsakes
- Generated client-side using **jsPDF** on day 90 completion
- Downloaded directly to the user's device — no Firebase Storage upload, no cloud URL
- The summary text is AI-generated by `generateFinalSummary` in `services/geminiService.ts`

---

## Component Architecture

### Relationship Map

```
┌─────────────────────────────────────────────────────────┐
│                        Firebase Auth                     │
│              (source of truth: user identity)            │
│              RevenueCat: subscription entitlements       │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   Mood Journal     Flip Journal    90 Day Journal
   (FREE)           (PAID)          (PAID)
         │               ▲
         └── optional ───┘
         (mood entry text passed as initial challenge
          only when user triggers Flip from a Mood entry)

   90 Day is fully autonomous — no data flows in or out
   to/from Mood or Flip under any circumstances
```

### Mood Journal — Internal Flow

```
User selects emotion (default list or custom)
        │
User selects intensity (low / medium / high)
        │
User selects life area (MoodContext: career, family, finances, etc.)
        │
        ▼
AI generates customised prompt based on all three inputs
        │
User writes journal response
        │
Entry saved to Firestore (moodEntries/)
        │
        ├──► Pattern engine runs across historical entries
        │         Detects: repetition | escalation | cross_area patterns
        │         Insight surfaced to user (suppressed 48h after showing)
        │
        └──► Crisis detection: distress threshold?
                  └──► YES: serve pre-approved care message (never auto-generated)
                  └──► NO: continue normally
```

**MoodContext enum** — the central type driving prompt generation. Every value must have a corresponding entry in all `Record<MoodContext, ...>` maps. Current values: `career`, `family`, `romantic`, `friendships`, `physical_health`, `mental_health`, `spirituality`, `finances`, `studies`, `decisions`, `motherhood`, `fatherhood`. Missing keys cause silent `undefined` at runtime — this is the most common real bug pattern in this codebase.

### Flip Journal — Internal Flow

```
User opens Flip session (two entry points):
  A) Standalone — user names a stuck thought directly
  B) From Mood — mood entry's journal text passed as initial challenge
              (linkedMoodEntryId set on the resulting Flip entry)
        │
        ▼
Step 1: User writes / confirms their challenge (the stuck thought or situation)
        │
Step 2: AI generates a reframing question grounded in that specific challenge
        │
Step 3: User writes their wiser-self response (reframedPerspective)
        │
Entry saved to Firestore (flipJournalEntries/)
```

**Key constraint:** Flip prompt generation is a distinct pipeline from Mood prompt generation. They must never share a generation function even if the API call looks similar — their purpose, tone, and framing are fundamentally different.

### 90 Day Journal — Internal Flow

```
User completes onboarding questionnaire
        │
AI assigns Arc: 'release' | 'reaffirm' | 'reignition'
(shapes AI prompt tone and direction for the entire journey)
        │
Daily entry flow (days 1–90):
  Optional morning ritual (tracked separately)
        +
  Morning journal entry → AI analysis → insights, tags, micro-action
        +
  Optional evening check-in (micro-action reflection + alignment)
        │
  Bonus entries available at any time:
    Intuitive Hunch / Dream Record / Sudden Insight
        │
  Weekly AI summary report generated → saved to journalEntries/
  Monthly AI summary report generated → saved to journalEntries/
        │
backfillCompletions (App.tsx) handles missed-day tracking
        │
On day 90 completion:
  ├──► PDF keepsake generated with jsPDF → downloaded to device
  └──► Completed journey archived to journeyArchives/
       (mood and flip data NOT wiped — they persist across restarts)
        │
User can start a new 90-day cycle (subscription tier dependent)
```

---

## AI Analysis Layer

### Prompt Pipelines (keep separate)

| Pipeline | Input | Output | Tone |
|---|---|---|---|
| Mood prompt | emotion + intensity + MoodContext (life area) | Customised reflective prompt | Warm, curious, validating |
| Flip reframe | User's stated challenge | Perspective-shifting question | Spacious, non-directive, opens possibility |
| 90 Day daily analysis | Daily journal entry text | Insights, tags, micro-action | Grounded, encouraging |
| 90 Day weekly/monthly report | Aggregated journal entries for the period | Summary narrative | Warm, reflective, pattern-aware |
| Mood monthly summary / annual recap | Aggregated mood entries | Pattern narrative + encouragement | Gentle, non-alarming |
| Pattern insight | Pattern memory data | Insight text surfaced in Mood Journal | Curious, non-diagnostic |
| Escalation | Distress pattern detected in Mood entry | Pre-approved care message | Gentle, human, signposts support |

### Rules
- Raw AI output never reaches the UI — always pass through a formatting/sanitising step
- Escalation copy is pre-approved — Claude must not auto-generate it
- All output is treated as potentially touching a user's emotional state — no cold, clinical, or rushed language
- Journal content passed to AI must be handled as sensitive data — log nothing, store only what's necessary

---

## Monetisation & Gating

| Feature | Tier | Notes |
|---|---|---|
| Mood Journal (full access) | Free | Always free — this is the acquisition funnel |
| Mood Journal pattern insights | Free | Included in free tier |
| Mood Journal monthly summary + annual recap | Free | Included in free tier |
| Flip Journal | Paid | Requires active subscription |
| 90 Day Journal | Paid | Requires active subscription |
| Multiple 90 Day cycles | Paid (tier-dependent) | Managed by RevenueCat; subscription products: `monthly`, `journey90` |
| PDF keepsake | Paid | Generated on 90 Day completion; 7-day grace window after journey ends |

Subscription entitlements are managed by **RevenueCat** — not by a Firestore document. Never write subscription tier logic that reads from Firestore directly.

**Gating is enforced at two levels:**
1. Firebase Security Rules — server-side, authoritative
2. Client-side UI — for UX (shows upgrade prompts etc.)

Never rely on client-side gating alone.

---

## Encryption

- Journal entry content is encrypted before being written to Firestore
- Encryption lives in `src/utils/encryption.ts`
- Caught errors are typed as `unknown` (TS 4.0+ strictness) — the `Property 'message'/'timestamp' does not exist` errors are known false positives; do not change the error handling pattern

---

## Reports

- **90 Day Journal**: generates weekly and monthly AI summary reports stored as `JournalEntry` records (`type: 'weekly_summary_report'` / `type: 'monthly_summary_report'`) in `journalEntries/`
- **Mood Journal**: generates monthly mood summaries and an annual recap tracked via `MoodSummaryState` on the user profile
- All reports use AI analysis — tone must match the gentle transformation mission
- Report generation is async and must never block the UI thread

---

## Key Design Decisions & Why

| Decision | Reason |
|---|---|
| Firebase as sole backend | Simplicity, real-time sync, cross-platform auth without a server to maintain |
| React + Capacitor (not React Native) | Share one React codebase across web, Android, and iOS without maintaining platform-specific components |
| `types.ts` at project root | Vite path resolution works correctly; tsc path quirk is a known false positive — do not move this file |
| Mood → Flip coupling is optional (one direction only) | Flip needs emotional context to generate a grounded reframe, but can also work standalone; Mood should never depend on Flip |
| 90 Day fully autonomous | The 90-day arc is a self-contained transformation journey; contaminating it with mood data would muddy its integrity |
| Encryption on journal content | Users are writing deeply personal content; it must be treated like health data |
| Pre-approved escalation copy | Auto-generated crisis language is a liability — the tone and content must be deliberately crafted |
| PDF generated client-side (jsPDF) | Avoids Firebase Storage costs and complexity; keepsake is personal to the user and does not need cloud persistence |
| RevenueCat for subscriptions | Cross-platform subscription management with receipt validation handled server-side by RevenueCat — avoids building this infrastructure |
| Vertex AI via Cloud Function + Vercel serverless | Two-layer approach: Vercel for fast web requests with Redis rate limiting; Cloud Function adds App Check + Admin SDK token verification for the hardened path |
