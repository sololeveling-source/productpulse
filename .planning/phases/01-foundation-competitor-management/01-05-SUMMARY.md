---
phase: 01-foundation-competitor-management
plan: 05
subsystem: infra
tags: [vercel, github, deployment, neon, nextjs, server-actions]

requires:
  - phase: 01-foundation-competitor-management
    provides: Complete COMP-01/COMP-02 competitor CRUD working locally against hosted Neon (Plans 01-04)
provides:
  - Public live deployment on Vercel, connected to the correct GitHub repo
  - README documenting env contract, cold-start behavior, no-auth accepted risk
  - Fix for a 'use server' export violation that only manifested in Vercel's production build
affects: [phase-02, phase-03, phase-04, phase-05, phase-06]

tech-stack:
  added: []
  patterns:
    - "useActionState initial-state objects must live outside any 'use server' file — only async functions may be exported from one"

key-files:
  created:
    - README.md
    - src/lib/action-state.ts
  modified:
    - src/app/competitors/actions.ts
    - src/components/competitors/competitor-dialog.tsx

key-decisions:
  - "Reconnected the Vercel project's Git integration mid-plan after discovering it was bound to an auto-created sibling repo (productpulse1) instead of the intended sololeveling-source/productpulse — a Vercel onboarding artifact, not a planning error"
  - "Moved initialCreateCompetitorState/initialUpdateCompetitorState out of actions.ts into src/lib/action-state.ts since 'use server' files may only export async functions; this passed local dev/build but hard-failed at runtime in Vercel's production build"

patterns-established:
  - "Any file with a top-level 'use server' directive must export ONLY async functions — plain object/const exports (e.g. useActionState initial state) belong in a separate client-safe module"

requirements-completed: [COMP-01, COMP-02]

duration: ~2h (mostly interactive Vercel/GitHub setup and two production-only bugs)
completed: 2026-07-04
---

# Phase 1: Foundation & Competitor Management Summary

**ProductPulse is live in production on Vercel, with full add/edit/delete competitor management verified end-to-end against hosted Neon Postgres, including persistence across redeploys.**

## Performance

- **Duration:** ~2h (Task 1/3 were interactive human checkpoints; most time was diagnosing two production-only failures)
- **Completed:** 2026-07-04
- **Tasks:** 3/3 (Task 1 human-action, Task 2 auto, Task 3 human-verify)
- **Files modified:** 4 (README.md, src/lib/action-state.ts, src/app/competitors/actions.ts, src/components/competitors/competitor-dialog.tsx)

## Accomplishments

- Pushed the full Phase 1 codebase to `github.com/sololeveling-source/productpulse` and deployed it live on Vercel
- Verified all Phase 1 success criteria on the **production URL**, not just locally: public URL, `/competitors` renders dynamically (ƒ), add/edit/delete all work against hosted Neon, SSRF host-denylist blocks internal URLs with exact UI-SPEC copy, and data survives a full redeploy
- Found and fixed a Next.js production-only bug (`'use server'` file exporting a non-function value) that local dev and `next build` never caught

## Task Commits

1. **Task 2: Write README, wire remote, push main** - `6f98188` (docs)
2. **Fix: 'use server' export violation** - `2774027` (fix) — found during Task 3 verification, not part of the original plan text
3. **Trigger deploy after Git reconnect** - `3c61e6f` (chore, empty commit)

**Plan metadata:** (this commit)

## Files Created/Modified

- `README.md` - project docs, env var contract, cold-start note, no-auth accepted-risk note
- `src/lib/action-state.ts` - new home for `initialCreateCompetitorState`/`initialUpdateCompetitorState`
- `src/app/competitors/actions.ts` - removed the two object exports (now function-only, as `'use server'` requires)
- `src/components/competitors/competitor-dialog.tsx` - updated imports to pull initial state from the new module

## Decisions Made

- Kept `updateCompetitor`/`deleteCompetitor` as pure async-function exports and relocated all non-function state to a plain module — establishes the pattern for any future Server Action files in this project.
- Reconnected Vercel's Git integration to the correct repo rather than working around it (e.g. by pushing to the wrong repo) — the wrong repo was a Vercel-side onboarding artifact (project auto-named `productpulse1` from a `productpulse1` GitHub repo Vercel created during import), not something to route around.

## Deviations from Plan

### Auto-fixed Issues

**1. [Runtime-only bug] `'use server'` file exported non-function objects**
- **Found during:** Task 3 (production verification — the edit-competitor flow)
- **Issue:** `src/app/competitors/actions.ts` exported `initialCreateCompetitorState` and `initialUpdateCompetitorState` as plain objects. Next.js requires every export from a file with a top-level `'use server'` directive to be an async function. This passed local `next dev` and `next build` silently, but threw `Error: A "use server" file can only export async functions, found object` at runtime in Vercel's production build the first time the `updateCompetitor` action's bundle chunk was evaluated.
- **Fix:** Created `src/lib/action-state.ts` (no `'use server'` directive) holding both initial-state constants; updated `competitor-dialog.tsx` to import them from there instead of from `actions.ts`.
- **Files modified:** `src/app/competitors/actions.ts`, `src/components/competitors/competitor-dialog.tsx`, `src/lib/action-state.ts` (new)
- **Verification:** `npx vitest run` (34/34), `npx tsc --noEmit`, `npx next build` all green; confirmed live on Vercel — edit-and-save now succeeds without error.
- **Committed in:** `2774027`

**2. [Environment/config, not code] Vercel connected to the wrong GitHub repository**
- **Found during:** Task 3, after two pushes (`6f98188`, `2774027`) never triggered a new Vercel deployment
- **Issue:** The Vercel project (`productpulse1`) was connected to `sololeveling-source/productpulse1` — a separate repo Vercel itself created during import (commit message "Initial commit Created from https://vercel.com/new") — not the intended `sololeveling-source/productpulse` repo we had been pushing to. All "successful" deployments up to that point were manual Redeploys of that same disconnected initial commit, never reflecting our actual code changes.
- **Fix:** User disconnected the Git integration in Vercel Project Settings → Git and reconnected it to `sololeveling-source/productpulse`. Pushed an empty trigger commit (`3c61e6f`) to fire the now-correctly-wired deploy webhook.
- **Verification:** Subsequent deployment built from the correct commit history; edit flow (previously broken due to issue #1) worked immediately after this reconnect + the code fix landed together.

---

**Total deviations:** 2 (1 code fix, 1 external config fix)
**Impact on plan:** Both were necessary to actually achieve the plan's stated goal (working production deployment) and were outside what local verification could have caught. No scope creep — no functionality was added beyond what Plan 01-05 specified.

## Issues Encountered

- A separate one-time issue (not a deviation from the plan, self-corrected by the user): the initial `DATABASE_URL` value pasted into Vercel's Environment Variables UI had a stray line break embedded in the middle of the hostname, causing `Headers.append: ... is an invalid header value` at runtime. Fixed by re-pasting the value as a single line. No code or plan change required.

## User Setup Required

None further — Neon project, GitHub repo, and Vercel project are all live and correctly wired as of this plan's completion.

## Code Review

Post-phase code review (`.planning/phases/01-foundation-competitor-management/01-REVIEW.md`) found 1 Critical + 4 Warning + 4 Info issues across the Phase 1 diff, most notably non-atomic multi-statement writes in `createCompetitor`/`updateCompetitor` that could leave partial/inconsistent data on failure. All 9 findings were fixed: `createCompetitor` now uses a single atomic `INSERT...WITH` CTE, `updateCompetitor` uses `db.batch()`, plus fixes for silent validation drops, stale dialog error state, a repeat-success toast bug, and several code-quality items (deduplicated denylist, dead CSS, explicit `DATABASE_URL` check). Verified against the live Neon database directly, plus `tsc`/`vitest`/`next build`/`eslint`. See REVIEW.md for full detail.

## Next Phase Readiness

Phase 1 success criteria all verified on production:
1. App live at a public Vercel URL ✓
2. Competitor add works on production against hosted Neon ✓ (COMP-01)
3. Competitor edit/delete work on production ✓ (COMP-02)
4. Data persists across a Vercel redeploy ✓ (confirmed via manual redeploy + reload)

No blockers for Phase 2 (change detection pipeline). One pattern to carry forward: any new Server Action file must be audited for non-function exports before assuming local `next build` success proves production correctness.

---
*Phase: 01-foundation-competitor-management*
*Completed: 2026-07-04*
