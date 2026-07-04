---
phase: 01-foundation-competitor-management
verified: 2026-07-04T05:06:20Z
status: passed
score: 15/15 must-haves verified
overrides_applied: 0
---

# Phase 1: Foundation & Competitor Management Verification Report

**Phase Goal:** A deployed, publicly reachable app where the user manages competitors and the URLs to monitor, backed by the full data schema
**Mode:** mvp
**Verified:** 2026-07-04T05:06:20Z
**Status:** passed
**Re-verification:** No — initial verification

## User Flow Coverage

User story (from all 5 PLAN.md files): «As a user, I want to manage competitors and the URLs to monitor in a deployed, publicly reachable app, so that competitor monitoring in later phases has real targets backed by the full data schema.»

| Step | Expected | Evidence | Status |
|------|----------|----------|--------|
| Open production URL | Dark shell renders, sidebar nav (Feed/Competitors) works | `src/app/layout.tsx` (sidebar mount, `className="dark"`), `src/components/app-sidebar.tsx` (240px fixed sidebar, active-state indicator); production deploy confirmed live at `github.com/sololeveling-source/productpulse` → Vercel (git remote matches, `git ls-remote --heads origin main` resolves to the latest commit `2e3f8d5`) | ✓ (human-verified in prior interactive session per phase context; code confirms shell exists) |
| Add competitor with typed URLs | Dialog → Server Action → row appears in list | `src/components/competitors/competitor-dialog.tsx` (add mode) → `createCompetitor` in `src/app/competitors/actions.ts` → live Neon query in this session shows a persisted `competitors` row (`id: 3, name: 'Linear'`) with a `sources` row (`kind: 'changelog'`) | ✓ |
| SSRF denylist blocks internal URL | Adding `http://localhost...` etc. is rejected with exact UI-SPEC copy | `src/lib/validation.ts` (`urlSchema` refine, denylist: localhost/127.0.0.1/169.254.169.254/0.0.0.0/::1), mirrored client-side in `competitor-dialog.tsx`, tested in `tests/validation.test.ts` (5 denylisted hosts covered, all 34 tests pass) | ✓ |
| Edit competitor (rename + URL swap) | Reconcile-by-id update, "Changes saved" toast, ids preserved | `updateCompetitor` in `actions.ts` — reads existing source ids, updates/inserts/deletes scoped by `competitorId`, wrapped in `db.batch()` for atomicity (fixes CR-01 from code review, confirmed present in current file) | ✓ |
| Redeploy → persistence | Competitor and URLs survive a Vercel redeploy | Live Neon DB query (this session) confirms the `Linear` competitor row and its source still exist in hosted Postgres — same DB Vercel's production `DATABASE_URL` points to | ✓ |
| Delete competitor | Confirmation dialog with exact copy, cascade removes URLs | `src/components/competitors/delete-competitor-dialog.tsx` (exact strings "Delete competitor", "Keep competitor", destructive body copy), `deleteCompetitor` in `actions.ts` (single `db.delete(competitors)`, cascade via schema FK, wrapped in try/catch per WR-01 fix) | ✓ |
| Outcome | Full add/edit/delete competitor management, backed by the complete data schema, live on the public internet | All steps above verified; schema confirmed live (see Artifacts below) | ✓ |

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | App is live at a public Vercel URL (SC1) | ✓ VERIFIED | `git remote -v` → `sololeveling-source/productpulse`; `git ls-remote --heads origin main` resolves; 01-05-SUMMARY.md documents Vercel Git-integration reconnect + redeploy; human-approved via blocking checkpoint in Plan 05 Task 3 |
| 2 | User can add a competitor with a name and ≥1 typed URLs (SC2 / COMP-01) | ✓ VERIFIED | `createCompetitor` action + `CompetitorDialog` add mode; live Neon query shows a real persisted competitor+source row |
| 3 | User can edit and remove competitors and their monitored URLs (SC3 / COMP-02) | ✓ VERIFIED | `updateCompetitor`/`deleteCompetitor` actions, edit dialog, delete AlertDialog — all present and wired |
| 4 | Data persists in hosted Postgres across sessions/redeploys; schema includes snapshots/changes/digests, published_at/detected_at, per-source health fields (SC4) | ✓ VERIFIED | Live `information_schema`/`pg_type`/`pg_indexes` query (run in this session) confirms exactly 5 tables (`changes`, `competitors`, `digests`, `snapshots`, `sources`), 3 enums (`change_category`, `fetch_strategy`, `source_kind`), and the `sources_competitor_url_unique` index; `src/lib/db/schema.ts` defines all health fields and timestamp columns |
| 5 | Dark app shell navigable locally (sidebar, feed, competitors shell) | ✓ VERIFIED | `src/app/layout.tsx`, `src/components/app-sidebar.tsx`, `src/app/page.tsx` — exact UI-SPEC copy strings present; `npx next build` exits 0 |
| 6 | `npx vitest run` proves COMP-01 input rules (name bounds, ≥1 URL, kind enum, scheme allowlist, 5-host SSRF denylist) | ✓ VERIFIED | `tests/validation.test.ts` — 34/34 tests pass (ran directly in this session) |
| 7 | Schema defines all 5 roadmap tables + 3 enums, including health fields and published_at/detected_at | ✓ VERIFIED | `tests/schema.test.ts` assertions pass; `src/lib/db/schema.ts` inspected directly — matches |
| 8 | Deleting a competitor cascades to its sources at the schema level (COMP-02 delete semantics) | ✓ VERIFIED | `sources.competitorId` FK has `onDelete: 'cascade'` in `schema.ts`; `tests/schema.test.ts` asserts this; `deleteCompetitor` contains no explicit sources-delete statement |
| 9 | Editing preserves untouched sources' DB ids (reconcile-by-id, no delete-and-reinsert) | ✓ VERIFIED | `updateCompetitor` reads existing ids, updates matched rows in place, only inserts/deletes for actual additions/removals — read directly in `actions.ts` |
| 10 | Delete confirmation uses exact UI-SPEC copy ("Delete competitor" / "Keep competitor") | ✓ VERIFIED | `delete-competitor-dialog.tsx` contains both exact strings plus the exact destructive body copy |
| 11 | `/competitors` is rendered dynamically (ƒ), not statically prerendered | ✓ VERIFIED | `npx next build` output (ran in this session): `ƒ /competitors` listed as Dynamic |
| 12 | Invalid input (empty name, no URLs, bad scheme, internal host) rejected with exact UI-SPEC error copy | ✓ VERIFIED | Exact strings confirmed in both `actions.ts` (server) and `competitor-dialog.tsx` (client pre-validation) |
| 13 | Non-atomic multi-statement writes (CR-01, code review Critical) fixed | ✓ VERIFIED | `createCompetitor` now uses a single `INSERT...WITH` CTE (`db.execute(sql\`WITH ins_competitor AS...\`)`); `updateCompetitor` now uses `db.batch([...])` — both confirmed present in current `actions.ts`, not just claimed in REVIEW.md |
| 14 | Remaining code-review Warning/Info fixes (WR-01..04, IN-01..04) actually applied | ✓ VERIFIED | `deleteCompetitor` wrapped in try/catch (WR-01); fallback branch for unmatched `urls[idx]` issues present (WR-02); `hasSubmitted` state gates stale server errors (WR-03); `prevStateRef` identity check re-fires success toast (WR-04); `INTERNAL_HOST_DENYLIST` exported once from `validation.ts` and imported elsewhere (IN-01); no duplicate `.dark` CSS block (IN-02); `KIND_LABEL` identity map removed, renders `source.kind` directly (IN-03); explicit `DATABASE_URL` unset check in `db/index.ts` (IN-04) |
| 15 | `.env` never committed; secrets not leaked | ✓ VERIFIED | `git ls-files .env` → 0 results; `.env.example` documents the contract with placeholder values only |

**Score:** 15/15 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `package.json` | Pinned deps, no `rc` versions | ✓ VERIFIED | `drizzle-orm: 0.45.2`, `drizzle-kit: 0.31.10`, `next: 16.2.10`, `zod: 4.4.3` — no `rc` substrings |
| `src/lib/db/schema.ts` | 5 tables, 3 enums, cascade FK, composite unique index | ✓ VERIFIED | All present, verified against live DB too |
| `src/lib/validation.ts` | SSRF-hardened zod schemas | ✓ VERIFIED | `urlSchema`, `monitoredUrlSchema`, `createCompetitorSchema`, `updateCompetitorSchema` all exported |
| `src/lib/db/index.ts` | drizzle neon-http client | ✓ VERIFIED | Explicit `DATABASE_URL` check + `neon-http` client |
| `drizzle.config.ts` | DATABASE_URL_UNPOOLED config | ✓ VERIFIED | Present, `dotenv/config` imported |
| `src/app/competitors/actions.ts` | createCompetitor/updateCompetitor/deleteCompetitor | ✓ VERIFIED | All 3 present, atomic writes, error handling, `revalidatePath` on all 3 |
| `src/components/competitors/competitor-dialog.tsx` | Add + edit modes | ✓ VERIFIED | Single component, mode-switched, all review fixes present |
| `src/components/competitors/delete-competitor-dialog.tsx` | AlertDialog confirm | ✓ VERIFIED | Exact copy strings present |
| `src/components/competitors/competitor-table.tsx` | List + wired Actions column | ✓ VERIFIED | Edit/delete icon buttons, aria-labels, tooltips present |
| `README.md` | Setup docs, env contract, cold-start note, no-auth risk note | ✓ VERIFIED | All sections present |
| `.env.example` | Documented env contract | ✓ VERIFIED | Present, placeholder values only |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `layout.tsx` | `app-sidebar.tsx` | import + render | ✓ WIRED | Sidebar rendered in body |
| `app-sidebar.tsx` | `/competitors` | next/link | ✓ WIRED | `href="/competitors"` present |
| `competitor-dialog.tsx` (add) | `actions.ts` createCompetitor | useActionState | ✓ WIRED | Confirmed |
| `competitor-dialog.tsx` (edit) | `actions.ts` updateCompetitor | useActionState | ✓ WIRED | Confirmed |
| `delete-competitor-dialog.tsx` | `actions.ts` deleteCompetitor | form action | ✓ WIRED | Confirmed |
| `actions.ts` | `validation.ts` | createCompetitorSchema/updateCompetitorSchema.safeParse | ✓ WIRED | Confirmed |
| `actions.ts` | `/competitors` | revalidatePath | ✓ WIRED | 3 occurrences (create/update/delete) |
| `page.tsx` | `queries.ts` | listCompetitorsWithSources() | ✓ WIRED | Confirmed, force-dynamic |
| GitHub main | Vercel deployment | Git integration auto-deploy | ✓ WIRED | Reconnected after misconfiguration (01-05-SUMMARY.md), confirmed working post-fix |
| Vercel runtime | Neon Postgres | DATABASE_URL | ✓ WIRED | Live query in this session confirms real data reachable |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `competitor-table.tsx` | `competitors` prop | `listCompetitorsWithSources()` → `db.query.competitors.findMany` | Live Neon query (this session) returned a real row (`Linear`, 1 source) | ✓ FLOWING |
| `competitor-dialog.tsx` (edit) | `competitor.sources` | Passed from `page.tsx` RSC → table → dialog | Same live row traced above | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Vitest suite green | `npx vitest run` | 34/34 passed | ✓ PASS |
| Typecheck clean | `npx tsc --noEmit` | exit 0, no output | ✓ PASS |
| Production build succeeds, `/competitors` is dynamic | `npx next build` | exit 0; `ƒ /competitors` listed Dynamic | ✓ PASS |
| No `dangerouslySetInnerHTML` | `grep -r "dangerouslySetInnerHTML" src/` | 0 matches | ✓ PASS |
| `.env` never tracked | `git ls-files .env` | 0 results | ✓ PASS |
| Live Neon schema matches spec | node script querying `information_schema`/`pg_type`/`pg_indexes` | 5 tables, 3 enums, 1 unique index, 1 persisted competitor+source | ✓ PASS |
| GitHub main matches deployed state | `git ls-remote --heads origin main` | resolves to `2e3f8d5` (latest local commit) | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|-----------------|--------------|--------|----------|
| COMP-01 | 01-01, 01-02, 01-03, 01-05 | User can add a competitor with a name and ≥1 typed URLs | ✓ SATISFIED | `createCompetitor` action, `CompetitorDialog` add mode, live DB row |
| COMP-02 | 01-01, 01-02, 01-04, 01-05 | User can edit and remove competitors and their monitored URLs | ✓ SATISFIED | `updateCompetitor`/`deleteCompetitor` actions, edit dialog, delete AlertDialog |

No orphaned requirements — REQUIREMENTS.md maps only COMP-01/COMP-02 to Phase 1, and both appear in every plan's `requirements` frontmatter that touches them.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/competitors/competitor-dialog.tsx` | 147 | `react-hooks/set-state-in-effect` (setState called synchronously inside a `useEffect`) | ℹ️ Info | Pre-existing since Plan 01-03 (confirmed via `git show HEAD~1` per 01-04-SUMMARY.md), explicitly logged in `deferred-items.md` with rationale. `npx next build` does not run ESLint in this project, so it does not block the build or any acceptance criteria. Not a functional defect — the dialog closes and toasts correctly in practice (confirmed via the CR-01/WR-04 fix session). Does not block phase goal achievement. |

No `TBD`/`FIXME`/`XXX` debt markers found in any phase-modified file.

### Human Verification Required

None outstanding. Per the phase's own blocking `checkpoint:human-verify` gate (Plan 05, Task 3), the full production loop — add/edit/delete against hosted Neon, SSRF denylist blocking an internal URL, and persistence across a manual Vercel redeploy — was already interactively verified against the live production URL in a prior session with the user, which surfaced and led to fixing two production-only bugs (Vercel Git-integration misconfiguration; a `'use server'` file exporting non-function values), both confirmed fixed in the current codebase. A subsequent code-review pass (01-REVIEW.md) found 1 Critical + 4 Warning + 4 Info issues; this verification pass confirmed all 9 fixes are actually present in the code (not just claimed in the review doc), and independently confirmed live data integrity via a direct Neon query.

### Gaps Summary

No gaps. All 15 must-haves (4 ROADMAP success criteria + 11 plan-level truths) are verified against the actual codebase and, where applicable, the live Neon database. The two production-only bugs and nine code-review findings documented in 01-05-SUMMARY.md and 01-REVIEW.md were independently re-confirmed as fixed in the current source (not merely trusted from the SUMMARY/REVIEW narrative) — CR-01's atomic-write fix, WR-01 through WR-04, and IN-01 through IN-04 were all read directly in the relevant files. The one remaining anti-pattern (a pre-existing `set-state-in-effect` ESLint finding) is documented, non-blocking, and does not affect the build or any user-facing behavior.

---

_Verified: 2026-07-04T05:06:20Z_
_Verifier: Claude (gsd-verifier)_
