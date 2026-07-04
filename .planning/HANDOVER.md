# Handover Document: ProductPulse

**Date:** 2026-07-04  
**Current Branch:** main  
**Last Completed:** Phase 3 — Change Detection  
**Next Up:** Phase 4 — AI Analysis  

## What Was Done

### Phase 1 (Complete)
- Next.js 16 scaffold with dark theme + shadcn/ui (radix)
- Full Drizzle ORM schema: competitors, sources, snapshots, changes, digests
- Neon Postgres provisioned and schema pushed
- Competitor CRUD: add, edit (reconcile-by-id), delete with confirmation
- Deployed to Vercel with production E2E verification

### Phase 2 (Complete)
- Pipeline dependencies installed: cheerio, turndown, diff
- `src/lib/pipeline/fetch.ts` — HTTP fetch with 15s timeout, User-Agent, challenge-page detection
- `src/lib/pipeline/extract.ts` — HTML → Markdown normalization + SHA-256 hash
- `src/lib/pipeline/run.ts` — per-source orchestrator with error isolation and health updates
- `src/app/api/monitor/route.ts` — POST route for manual trigger (`?sourceId=N` optional)
- `src/components/competitors/check-now-button.tsx` — loading state + toast + `router.refresh()`
- Competitors UI: "Check all" button, Health / Last checked columns, per-source check buttons
- `src/lib/db/queries.ts` — added `getLatestSnapshot(sourceId)` for Phase 3
- Tests: 46 passed; TypeScript clean
- E2E verified against `https://linear.app/changelog`
- Commits pushed to GitHub; Vercel deployment updated

### Phase 3 (Complete)
- `src/lib/pipeline/diff.ts` — unified line-based text diff using `diff` library
- `src/lib/pipeline/run.ts` — hash gate: skips snapshot/change insert when hash matches previous snapshot; inserts snapshot + `changes` row when hash differs
- `tests/pipeline/diff.test.ts` + expanded `tests/pipeline/run.test.ts` — cover identical-content gate, diff generation, first-check behavior
- Tests: 53 passed; TypeScript clean
- E2E soak: corrected a mistyped source URL (`www.linear.com` → `linear.app/changelog`) and verified zero new inserts on consecutive identical checks
- Planning docs updated: MON-03 marked complete

### Throwaway Mockup
- `src/app/mockups/page.tsx` — visual preview of Phases 5/6 (feed, profile, digest)
- Uses sample data and `"use client"` tab switcher
- UI was flagged as needing design improvement; this is not production code

## Current Project State

- **Phase:** 4 of 6 ready to start
- **Progress:** 50% (3/6 phases complete)
- **Requirements validated:** COMP-01, COMP-02, MON-02, MON-03, MON-05, MON-06
- **Requirements pending:** MON-01, MON-04, AI-01, AI-02, AI-03, FEED-01, FEED-02, FEED-03, PROF-01, PROF-02, PROF-03, DGST-01, DEPL-01

## Key Files

| Purpose | Path |
|---------|------|
| Pipeline fetch | `src/lib/pipeline/fetch.ts` |
| Pipeline extract | `src/lib/pipeline/extract.ts` |
| Pipeline diff | `src/lib/pipeline/diff.ts` |
| Pipeline orchestrator | `src/lib/pipeline/run.ts` |
| Manual trigger route | `src/app/api/monitor/route.ts` |
| Check button | `src/components/competitors/check-now-button.tsx` |
| Competitors page | `src/app/competitors/page.tsx` |
| Competitor table | `src/components/competitors/competitor-table.tsx` |
| Schema | `src/lib/db/schema.ts` |
| Queries | `src/lib/db/queries.ts` |
| Tests | `tests/pipeline/*.test.ts` |
| Phase 2 plan | `.planning/plans/Phase 02/PHASE-02-RESUME-PLAN.md` |
| Phase 2 summary | `.planning/plans/Phase 02/PHASE-02-SUMMARY.md` |
| Phase 3 plan | `.planning/plans/Phase 03/PHASE-03-PLAN.md` |
| State / roadmap | `.planning/STATE.md`, `.planning/ROADMAP.md` |

## Important Decisions

- **No auth in v1** — mutation endpoints are publicly reachable by design
- **Pipeline runs as a library module** — callable from API route, cron, scripts, tests
- **Hash gate before LLM** — Phase 3 will compare SHA-256 hashes to avoid unnecessary diff/LLM work
- **Extract-then-diff** — never diff raw HTML; Markdown normalization strips volatile markup
- **GitHub Actions cron for scheduling** — decision deferred to Phase 5 (Vercel Hobby cron is too limited)
- **LLM: Gemini 2.5 Flash** — chosen for free tier; Vercel AI SDK with structured output

## Next Phase: AI Analysis (Phase 4)

**Goal:** Every meaningful change gets trustworthy AI insight — summary, "why it matters", and type — with noise filtered out and LLM spend capped.

**Requirements:** MON-04, AI-01, AI-02, AI-03

**Likely work:**
1. Add `src/lib/pipeline/analyze.ts` using Vercel AI SDK + Gemini 2.5 Flash with structured output (Zod schema)
2. Update `run.ts` to call the analyzer only when a change is detected and store `isMeaningful`, `category`, `summary`, `whyItMatters` on the `changes` row
3. Add cost controls: hash gate already prevents LLM calls on unchanged pages; consider token/length guards on the diff text
4. Add tests for the analyzer with mocked LLM responses
5. Soak-test against real diffs to confirm noise is filtered and classification is reasonable

## How to Resume

1. Run `corepack pnpm dev` to start local server
2. Run `corepack pnpm test` for tests
3. Run `npx tsc --noEmit` for typecheck
4. Check `.planning/STATE.md` and `.planning/ROADMAP.md` for latest status
5. Read `.planning/research/ARCHITECTURE.md` and `.planning/research/STACK.md` for design context
6. Start Phase 3 planning with `/gsd-plan-phase` or equivalent skill

## Notes

- The production Vercel deployment has Phase 2 code.
- `pnpm` is not on PATH in this environment; use `corepack pnpm ...` instead.
- `.env` contains Neon connection strings.
- The `/mockups` page exists for concept preview only and needs design refinement if kept.
