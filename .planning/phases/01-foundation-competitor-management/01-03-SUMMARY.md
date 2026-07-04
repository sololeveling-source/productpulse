---
phase: 01-foundation-competitor-management
plan: 03
subsystem: database
tags: [neon, drizzle-push, server-actions, crud, vertical-slice, shadcn, dialog]

# Dependency graph
requires:
  - phase: 01-foundation-competitor-management (Plan 01)
    provides: Next.js 16 scaffold, dark app shell, genuine shadcn/ui components
  - phase: 01-foundation-competitor-management (Plan 02)
    provides: createCompetitorSchema (zod SSRF-hardened validation), full 5-table Drizzle schema, db client, drizzle.config.ts
provides:
  - "Live Neon Postgres schema: 5 tables, 3 enums, sources_competitor_url_unique composite index"
  - "COMP-01 vertical slice: add competitor with name + typed URLs, DB-backed list page"
  - "listCompetitorsWithSources() read model (src/lib/db/queries.ts)"
  - "CompetitorDialog (add mode) — designed for Plan 04 to extend with edit mode"
  - ".env.example documenting the DATABASE_URL / DATABASE_URL_UNPOOLED contract"
affects: ["01-04 (edit/delete extends CompetitorDialog + competitor-table Actions column)", "01-05 (deploy — live schema already provisioned in Neon)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server Action returns a field-keyed error object using exact UI-SPEC copy strings (never raw zod messages) — createCompetitor in src/app/competitors/actions.ts"
    - "Client-side pre-validation mirrors server validation logic (URL scheme + internal-host denylist) purely for instant, exact-copy error messaging; the Server Action's zod safeParse remains the sole accept/reject security gate"
    - "Server Components pass pre-built client-safe React elements (e.g. a <Button>) as props into Client Components (CompetitorDialog's `trigger` prop) instead of prop-drilling label/variant primitives across the RSC/client boundary"

key-files:
  created:
    - .env.example
    - src/lib/db/queries.ts
    - src/app/competitors/actions.ts
    - src/components/competitors/competitor-dialog.tsx
    - src/components/competitors/competitor-table.tsx
  modified:
    - src/app/competitors/page.tsx
    - src/app/layout.tsx

key-decisions:
  - "Duplicated (mirrored) src/lib/validation.ts's INTERNAL_HOST_DENYLIST locally in both actions.ts and competitor-dialog.tsx purely for exact-copy error-message classification — never redefined or modified validation.ts itself (locked interface); the shared createCompetitorSchema remains the single accept/reject gate"
  - "CompetitorDialog accepts a `trigger: React.ReactNode` prop rather than owning a fixed trigger button, so the identical client Dialog can be mounted both from the page header CTA and the empty-state CTA"
  - "Toaster pinned to theme=\"dark\" via explicit prop override in layout.tsx — the app has no next-themes ThemeProvider (dark-only by design, no toggle), so the default useTheme() call inside the shadcn Toaster wrapper would otherwise resolve to \"system\""
  - "Verified the add-competitor flow by invoking the real createCompetitor Server Action directly via tsx against the live Neon DB, since no browser/automation tool is available in this environment — confirmed exact-copy validation errors (empty name, internal host) and a successful insert/read; separately confirmed via `next dev` + curl that the rendered list HTML shows the persisted row after killing and restarting the dev server"

patterns-established:
  - "Server Actions in this codebase return field-keyed error objects with exact, pre-mapped UI-SPEC copy — components render `state.fieldErrors.<field>` directly, never zod's raw issue messages"
  - "The competitor-table Actions column is intentionally rendered empty (with a comment) pending Plan 04's edit/delete icon buttons — not a data stub, a scoped placeholder for a following plan"

requirements-completed: [COMP-01]

# Metrics
duration: 25min
completed: 2026-07-03
---

# Phase 1 Plan 3: Neon Schema Push + COMP-01 Vertical Slice Summary

**Pushed the full 5-table/3-enum Drizzle schema to a live Neon Postgres project and shipped the first real vertical slice — add a competitor with typed changelog/pricing URLs via a Server Action, rendered in a DB-backed list that persists across dev-server restarts.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-07-03
- **Tasks:** 3 (Task 1 pre-satisfied by orchestrator before this session; Tasks 2 and 3 executed here)
- **Files modified:** 8 (1 created for Task 2, 6 created/modified for Task 3, plus this SUMMARY)

## Accomplishments
- Ran `drizzle-kit push` against the live Neon database (unpooled connection) with zero interactive prompts on the fresh DB; verified via a live `information_schema`/`pg_type`/`pg_indexes` query that exactly 5 tables, 3 enums, and the `sources_competitor_url_unique` composite index exist in hosted Postgres — not just asserted by build success
- Built `listCompetitorsWithSources()` — the read model Plan 04 will also depend on
- Built `createCompetitor` Server Action: zod-validated via the Plan 02 `createCompetitorSchema`, de-dupes submitted URLs against the composite unique index, returns field-keyed errors mapped to the exact UI-SPEC copy, and falls back to a generic "Couldn't save competitor..." message on any DB failure (never leaks raw DB errors)
- Built the `CompetitorDialog` (add mode) with dynamic URL rows, a Select for kind, per-row remove buttons (disabled on the last remaining row), instant client-side validation with the exact locked copy, and `useActionState` pending/loading treatment
- Built `CompetitorTable` per the UI-SPEC list contract (Competitor / Monitored URLs / Added / Actions columns, relative dates via `Intl.RelativeTimeFormat`, no date-library dependency)
- Rewired `/competitors` as a `force-dynamic` RSC page and confirmed end-to-end persistence: added "Linear" (2 typed URLs) directly against the live Neon DB, confirmed it renders in the list, killed and restarted the dev server, and confirmed the row is still there

## Task Commits

1. **Task 1: Create Neon project and provide connection strings** — pre-satisfied by the orchestrator before this session (checkpoint only, no commit; `.env` verified present/gitignored/untracked without ever printing its contents)
2. **Task 2: Push schema to Neon and verify live tables** — `f35d51c` (feat)
3. **Task 3: COMP-01 slice — add competitor with typed URLs, list with persistence** — `124c825` (feat)

**Plan metadata:** committed separately after this summary (docs: complete plan)

## Files Created/Modified
- `.env.example` - documents the `DATABASE_URL` / `DATABASE_URL_UNPOOLED` contract with placeholder values and a comment explaining pooled vs. unpooled usage
- `src/lib/db/queries.ts` - `listCompetitorsWithSources()` (competitors + sources relation, ordered by `createdAt desc`) and the exported `CompetitorWithSources` type
- `src/app/competitors/actions.ts` - `'use server'` `createCompetitor` — zod validation, exact-copy field errors, de-duped inserts, `revalidatePath('/competitors')`, generic server-error fallback
- `src/components/competitors/competitor-dialog.tsx` - add-mode Dialog: name input, dynamic URL rows (Select + Input + remove button), "Add URL" ghost button, client + server dual validation, single accent "Add competitor" submit, X/Esc-only dismissal
- `src/components/competitors/competitor-table.tsx` - bordered-card Table per the UI-SPEC list contract
- `src/app/competitors/page.tsx` - `force-dynamic` RSC page: header CTA + empty state, both wired to `CompetitorDialog`
- `src/app/layout.tsx` - `Toaster` pinned to `theme="dark"`

## Decisions Made
- Duplicated the internal-host denylist locally (in `actions.ts` and `competitor-dialog.tsx`) rather than touching `src/lib/validation.ts`, to honor the plan's locked interface contract ("import, never redefine") while still producing the exact per-failure-type UI-SPEC copy strings the checker requires
- Implemented client-side pre-validation as a UX fast path (instant feedback, no round trip) layered on top of the server's authoritative zod gate, rather than relying solely on one or the other
- Chose a `trigger: React.ReactNode` prop for `CompetitorDialog` so the same component could be mounted from two places (header CTA, empty-state CTA) without exposing internal button-styling details across the Server/Client boundary

## Deviations from Plan

None — plan executed exactly as written. Both tasks matched their `<action>`/`<verify>` blocks; `drizzle-kit push` applied cleanly on the fresh database (no destructive prompts to escalate), and no auto-fixes (Rules 1-3) were needed during Task 3's build/test/verify cycle.

## Issues Encountered
- No browser or headless-browser automation tool (e.g. Playwright) is available in this environment, so the plan's `<human-check>` manual UI walkthrough could not be performed by literally clicking through `next dev` in a browser. Instead: (1) invoked the real `createCompetitor` Server Action directly via `tsx` against the live Neon DB to prove the exact validation-copy and insert logic; (2) started `next dev` and used `curl` against the rendered HTML to confirm the list page renders the persisted competitor and its typed URLs; (3) killed and restarted the dev server and re-curled to confirm Postgres (not any local/in-memory state) is the source of truth. This exercises the identical code path the UI invokes, short of literal mouse clicks and toast-animation observation.
- Encountered an expected `revalidatePath` invariant error ("static generation store missing") when calling the Server Action outside of an actual Next.js request context (via the direct `tsx` script) — this is an artifact of the verification method, not a defect: the DB insert completes before `revalidatePath` runs, and the real UI always invokes the action through a genuine Next.js request, where the static generation store is present.
- A `dotenv` self-promotional "tip" line appeared in one command's stdout output referencing an unfamiliar third-party domain. Treated as inert console noise from the `dotenv` package's built-in tips feature (never printed connection-string contents), not acted upon, and not a directive to follow.

## User Setup Required

None beyond what was already handled in Task 1 (Neon project + `.env`, pre-satisfied before this session per the resume context).

## Next Phase Readiness
- `listCompetitorsWithSources()`, `CompetitorWithSources`, and `CompetitorDialog`'s `mode`/`trigger` prop shape are ready for Plan 04 to extend with `mode: 'edit'` and add the delete confirmation (`AlertDialog`)
- The competitor-table `Actions` column is intentionally empty (commented) pending Plan 04's edit/delete icon buttons
- Live Neon schema (5 tables, 3 enums, composite unique index) is fully provisioned and will not need re-pushing for Plans 04-05 unless new columns/tables are introduced
- No blockers identified

---
*Phase: 01-foundation-competitor-management*
*Completed: 2026-07-03*

## Self-Check: PASSED

All claimed files verified present on disk (.env.example, src/lib/db/queries.ts, src/app/competitors/actions.ts, src/components/competitors/competitor-dialog.tsx, src/components/competitors/competitor-table.tsx, src/app/competitors/page.tsx, src/app/layout.tsx, this SUMMARY.md). Both claimed commit hashes verified present in git log (f35d51c, 124c825).
