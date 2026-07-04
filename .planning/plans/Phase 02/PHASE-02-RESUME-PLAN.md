# Phase 2 Resume Plan: Scraping Pipeline & Snapshots

**Project:** ProductPulse  
**Phase:** 2 of 6  
**Status:** Tasks 1–2 complete; resuming from Task 3  
**Requirements:** MON-02, MON-05, MON-06  

## Current Progress

- **Task 1 (deps):** Complete — `cheerio@1.2.0`, `turndown@7.2.4`, `diff@9.0.0`, and `@types/turndown` installed.
- **Task 2 (fetch):** Complete — `src/lib/pipeline/fetch.ts` + `tests/pipeline/fetch.test.ts` committed (`0c25aef`).

Remaining work follows the approved design in `docs/superpowers/specs/2026-07-03-phase2-scraping-pipeline-design.md`.

## Plan: Remaining Tasks

### Task 3: `extract.ts` — HTML → normalized Markdown + hash
- **Files:** create `src/lib/pipeline/extract.ts`, create `tests/pipeline/extract.test.ts`
- **Approach:** Use `cheerio` to extract `<body>` HTML, `turndown` to convert to Markdown, then normalize (strip ISO timestamps, tracking params, collapse whitespace) and SHA-256 hash. Return `{ extractedText, contentHash }`; return empty strings if content < 50 chars.
- **Tests:** HTML→Markdown conversion, timestamp stripping, empty/short input, deterministic hash, tracking-param stripping.

### Task 4: `run.ts` — pipeline orchestrator
- **Files:** create `src/lib/pipeline/run.ts`
- **Approach:** `runPipeline({ sourceId? })` loads active sources, loops per source with try/catch isolation, calls `fetchPage` then `extractContent`, inserts a `snapshots` row on success, updates `sources` health fields (`lastCheckedAt`, `lastSuccessAt`, `lastStatus`, `lastError`, `failureStreak`). Returns `RunReport[]`.
- **Health mapping:**
  - `challenge_page` → status + streak++
  - `timeout` / `fetch_error` → `fetch_error` + streak++
  - `extract_empty` → status + streak++
  - success → `ok`, `lastError: null`, `failureStreak: 0`

### Task 5: `POST /api/monitor` route
- **Files:** create `src/app/api/monitor/route.ts`
- **Approach:** Thin Next.js route handler. Read optional `?sourceId=N` query, validate positive integer, call `runPipeline`, return `{ results: RunReport[] }`. No auth in v1 (consistent with Phase 1).

### Task 6: `getLatestSnapshot` query
- **Files:** modify `src/lib/db/queries.ts`
- **Approach:** Add `getLatestSnapshot(sourceId)` using `eq(snapshots.sourceId, sourceId)` ordered by `fetchedAt DESC LIMIT 1`. Required for Phase 3 hash gate; harmless to add now.

### Task 7: `CheckNowButton` client component
- **Files:** create `src/components/competitors/check-now-button.tsx`
- **Approach:** `"use client"`; POST to `/api/monitor` with optional `sourceId`; show spinner while loading; use `sonner` toast for result summary. Props: `sourceId?`, `label?`, `variant?: 'default' | 'ghost'`.

### Task 8: Competitors UI updates
- **Files:** modify `src/app/competitors/page.tsx`, modify `src/components/competitors/competitor-table.tsx`
- **Approach:**
  - Header: add "Check all" `CheckNowButton` next to "Add competitor".
  - Table: add Health and Last checked columns, status dot, failure-streak badge, per-source "Check now" ghost button in the Monitored URLs cell.

### Task 9: Integration test scaffold for `runPipeline`
- **Files:** create `tests/pipeline/run.test.ts`
- **Approach:** Vitest test verifying `runPipeline()` returns `[]` when no active sources exist. Further coverage can be added once diff/LLM stages land.

### Task 10: E2E verification
- Run `pnpm dev`, add a real competitor URL (e.g., `https://linear.app/changelog`), click "Check all", confirm toast, green health dot, and a row in `snapshots`.
- Run `pnpm test` and `npx tsc --noEmit`.
- Commit any final fixes.

## Success Criteria

1. `fetch → extract → snapshot → health update` runs end-to-end for a real URL.
2. The competitors page shows health status and "Check now" buttons.
3. All existing tests still pass; new tests cover `extract` and the `runPipeline` scaffold.
4. TypeScript compiles without errors.

## Out of Scope (deferred to later phases)

- Content diffing / hash gate → Phase 3
- LLM analysis → Phase 4
- Cron scheduling → Phase 5
- Jina Reader fallback / per-site selectors → deferred until needed
