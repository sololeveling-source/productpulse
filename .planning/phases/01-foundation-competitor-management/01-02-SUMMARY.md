---
phase: 01-foundation-competitor-management
plan: 02
subsystem: database
tags: [drizzle, zod, vitest, postgres, tdd, ssrf, schema]

# Dependency graph
requires:
  - phase: 01-foundation-competitor-management (Plan 01)
    provides: Next.js 16 scaffold, pinned dependency set (drizzle-orm, zod, vitest already installed), dark app shell
provides:
  - "zod validation module (urlSchema, monitoredUrlSchema, createCompetitorSchema, updateCompetitorSchema) with SSRF host denylist"
  - "Full 5-table Drizzle schema (competitors, sources, snapshots, changes, digests) + 3 pg enums + relations"
  - "drizzle neon-http db client singleton (src/lib/db/index.ts)"
  - "drizzle-kit config targeting DATABASE_URL_UNPOOLED (drizzle.config.ts)"
  - "vitest test infra (vitest.config.ts, tests/validation.test.ts, tests/schema.test.ts) — 34 passing tests"
affects: [01-03, 01-04, "Phase 2 (fetcher reads sources health fields)", "Phase 4 (changes.category/summary/why_it_matters)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD RED/GREEN gate: failing tests committed first (test(01-02)), then implementation (feat(01-02))"
    - "SSRF mitigation at the zod layer: scheme allowlist (http/https) + hostname denylist enforced in a .refine() on urlSchema, reused by every downstream Server Action"
    - "Composite unique index via uniqueIndex() in a pgTable third-arg callback (drizzle-orm/pg-core), not a separate migration step"
    - "drizzle relations() defined alongside tables so db.query.competitors.findMany({ with: { sources: true } }) works in Plan 03 without extra wiring"

key-files:
  created:
    - vitest.config.ts
    - tests/validation.test.ts
    - tests/schema.test.ts
    - src/lib/validation.ts
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - drizzle.config.ts
  modified: []

key-decisions:
  - "zod 4.4.3's z.url() + refine() API matched RESEARCH.md's Code Example exactly — no adaptation needed (unlike the z.treeifyError uncertainty flagged as A3 in RESEARCH.md, which this plan never needed since Server Actions come in Plan 03)"
  - "getTableConfig(sources).indexes exposes unique composite indexes with config.unique=true and config.columns[].name — verified this shape directly against the installed drizzle-orm 0.45.2 before writing schema.test.ts assertions, since RESEARCH.md didn't specify the exact introspection API"

patterns-established:
  - "Every zod schema for competitor/URL input lives in src/lib/validation.ts and is imported by both tests and (in Plan 03) Server Actions — single source of truth for COMP-01 input rules"
  - "src/lib/db/schema.ts is the single schema module; new tables/enums in later phases are additive columns/tables only, never renames (per RESEARCH.md Pattern 3 / Pitfall 6)"

requirements-completed: [COMP-01, COMP-02]

# Metrics
duration: 20min
completed: 2026-07-03
---

# Phase 1 Plan 2: TDD Validation Schemas + Full Roadmap DB Schema Summary

**Zod SSRF-hardened competitor/URL validation (scheme allowlist + internal-host denylist) and the complete 5-table Drizzle roadmap schema (competitors, sources, snapshots, changes, digests + 3 enums + cascade FK + composite unique index), proven by a 34-test TDD RED→GREEN vitest suite — no live database touched.**

## Performance

- **Duration:** ~20 min
- **Completed:** 2026-07-03
- **Tasks:** 2 (TDD RED, TDD GREEN)
- **Files modified:** 7 created, 0 modified

## Accomplishments
- Wrote 34 failing-then-passing tests proving COMP-01 input rules (name 1-200 chars, ≥1 URL, kind limited to changelog|pricing, http/https-only scheme, 5 denylisted internal hosts: localhost, 127.0.0.1, 169.254.169.254, 0.0.0.0, ::1) before any implementation existed
- Implemented `src/lib/validation.ts` exporting `urlSchema`, `monitoredUrlSchema`, `createCompetitorSchema`, `updateCompetitorSchema` exactly per the interfaces contract
- Implemented the full roadmap schema (`src/lib/db/schema.ts`): 5 tables, 3 enums, per-source health fields (`last_checked_at`, `last_success_at`, `last_status`, `last_error`, `failure_streak`), `changes.published_at`/`detected_at` split, cascading FK from sources→competitors, composite unique index `sources_competitor_url_unique` on (competitor_id, url), and `competitorsRelations`/`sourcesRelations` for `db.query` usage in Plan 03
- Added `src/lib/db/index.ts` (drizzle neon-http client) and `drizzle.config.ts` (DATABASE_URL_UNPOOLED via dotenv) — no database provisioned, no env vars required, no `drizzle-kit push` run
- `npx vitest run` green (34/34), `npx tsc --noEmit` clean, `npx next build` clean (Plan 01's pages still build; nothing yet imports `src/lib/db`)

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: Write failing tests for validation rules and schema semantics (RED)** - `4355dda` (test)
2. **Task 2: Implement validation module, full roadmap schema, db client, drizzle config (GREEN)** - `54992b9` (feat)

**Plan metadata:** committed separately after this summary (docs: complete plan)

_No REFACTOR commit needed — GREEN implementation matched the RESEARCH.md code examples closely enough that no cleanup pass was required._

## TDD Gate Compliance

- RED gate: `4355dda` (`test(01-02): add failing tests...`) — verified `npx vitest run` exited non-zero (module resolution failure for `@/lib/validation` and `@/lib/db/schema`) before any implementation file existed.
- GREEN gate: `54992b9` (`feat(01-02): implement validation schemas...`) — verified `npx vitest run` exits 0 with all 34 tests passing after implementation.
- Sequence confirmed via `git log`: test commit precedes feat commit. Compliant.

## Files Created/Modified
- `vitest.config.ts` - node environment, `tests/**/*.test.ts` include, `@` → `./src` alias (vitest doesn't read tsconfig paths automatically)
- `tests/validation.test.ts` - COMP-01 input rule assertions: name bounds, urls array, kind enum, scheme allowlist, 5-host SSRF denylist, id coercion
- `tests/schema.test.ts` - enum value assertions (exact arrays), FK cascade assertion, unique index assertion, table name + health/timestamp column assertions, using `getTableConfig` from `drizzle-orm/pg-core`
- `src/lib/validation.ts` - `urlSchema` (zod `.url()` + `.refine()` for scheme + hostname denylist), `monitoredUrlSchema`, `createCompetitorSchema`, `updateCompetitorSchema` (id coercion via `z.coerce.number()`)
- `src/lib/db/schema.ts` - 5 `pgTable` calls, 3 `pgEnum` calls, `uniqueIndex('sources_competitor_url_unique')`, `competitorsRelations`/`sourcesRelations`
- `src/lib/db/index.ts` - `neon(process.env.DATABASE_URL!)` + `drizzle({ client, schema })` export
- `drizzle.config.ts` - `dotenv/config` import, `defineConfig` with `dbCredentials.url` from `DATABASE_URL_UNPOOLED`

## Decisions Made
- Confirmed zod 4.4.3's actual `z.url()` API before writing tests/implementation (probed via `node -e`) — matched RESEARCH.md's Code Example 3 exactly, no adaptation needed.
- Confirmed `getTableConfig()`'s exact runtime shape for `foreignKeys[].onDelete` and `indexes[].config.{unique,columns}` against the installed `drizzle-orm@0.45.2` before writing `tests/schema.test.ts` assertions (RESEARCH.md didn't specify the introspection API precisely) — used a throwaway `tsx` probe script in the repo root, deleted after use, no artifact committed.

## Deviations from Plan

None - plan executed exactly as written. Both tasks matched their `<action>` and `<verify>` blocks with no auto-fixes needed; zod and drizzle-orm APIs matched RESEARCH.md's code examples without adaptation.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required this plan. No database was provisioned, no `.env` file was created or read, and `drizzle-kit push` was never run (per plan constraint — that happens in Plan 03).

## Next Phase Readiness
- `src/lib/validation.ts` and `src/lib/db/schema.ts` are ready to be imported by Plan 03's Server Actions and `db` client wiring — the interfaces contract (exact export names) is locked and tested.
- Full roadmap schema is push-ready; Phases 2-6 should only need additive columns/tables per RESEARCH.md Pattern 3.
- `db` client (`src/lib/db/index.ts`) will throw at import time if `DATABASE_URL` is unset — this is expected and intentional until Plan 03 provisions Neon and sets up `.env`; no page currently imports it, so the current build is unaffected.
- No blockers identified.

---
*Phase: 01-foundation-competitor-management*
*Completed: 2026-07-03*

## Self-Check: PASSED

All claimed files verified present on disk (vitest.config.ts, tests/validation.test.ts, tests/schema.test.ts, src/lib/validation.ts, src/lib/db/schema.ts, src/lib/db/index.ts, drizzle.config.ts, this SUMMARY.md). Both claimed commit hashes verified present in git log (4355dda, 54992b9).
