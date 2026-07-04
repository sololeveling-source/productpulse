# Phase 2 Summary: Scraping Pipeline & Snapshots

**Created**: 2026-07-03  
**Resumed**: 2026-07-04  
**Status**: Complete  
**Total Tasks**: 8 (Tasks 1–2 already committed; Tasks 3–10 completed in this session)

## Overview

Phase 2 makes the app actually fetch real competitor pages, normalize them into stable snapshots, and surface per-URL health in the dashboard. It is the first phase that touches the core automation loop: **fetch → extract → snapshot → health update**.

## Requirements Addressed

- **MON-02**: System stores a snapshot of extracted, normalized page content per check
- **MON-05**: User can trigger an immediate check ("Check now") from the dashboard
- **MON-06**: Each monitored URL shows health status (last checked, last success, failure streak)

## Success Criteria

1. Pipeline fetches real URLs and stores snapshots in Neon.
2. Dashboard shows a "Check all" button and per-source check buttons.
3. Health columns display status, last checked relative time, and failure streak.
4. All tests pass and TypeScript compiles cleanly.
5. E2E verified against a real competitor URL.

## Task Summary

### Task 1: Install pipeline dependencies
**Status**: Complete before resume (`f1c6171`)  
Added `cheerio@1.2.0`, `turndown@7.2.4`, `diff@9.0.0`, and `@types/turndown`.

### Task 2: `fetch.ts` — HTTP fetch with challenge detection
**Status**: Complete before resume (`0c25aef`)  
- 15-second timeout via `AbortController`
- Realistic User-Agent header
- Cloudflare/challenge-page fingerprint detection
- 5 unit tests (success, challenge, network error, timeout, UA header)

### Task 3: `extract.ts` — HTML extraction and normalization
**Files**: `src/lib/pipeline/extract.ts`, `tests/pipeline/extract.test.ts`  
**Status**: Complete  
- Parses HTML with `cheerio`, extracts `<body>`, converts to Markdown via `turndown`
- Normalizes by stripping ISO timestamps, UTM/ref tracking params, and collapsing whitespace
- Computes SHA-256 content hash
- Returns empty result if extracted content is below 50 characters

### Task 4: `run.ts` — Pipeline orchestrator
**File**: `src/lib/pipeline/run.ts`  
**Status**: Complete  
- Loads active sources (optionally filtered by `sourceId`)
- Runs fetch → extract → snapshot insert for each source in isolation
- Updates `sources` health fields (`lastCheckedAt`, `lastSuccessAt`, `lastStatus`, `lastError`, `failureStreak`)
- Returns typed `RunReport[]`

### Task 5: `POST /api/monitor` route
**File**: `src/app/api/monitor/route.ts`  
**Status**: Complete  
- Accepts optional `?sourceId=N` query parameter
- Validates `sourceId` as a positive integer
- Calls `runPipeline` and returns `{ results }`
- No auth in v1 (consistent with Phase 1 public-by-design approach)

### Task 6: `getLatestSnapshot` query
**File**: `src/lib/db/queries.ts`  
**Status**: Complete  
- Added `getLatestSnapshot(sourceId)` for Phase 3 hash-gate readiness

### Task 7: `CheckNowButton` client component
**File**: `src/components/competitors/check-now-button.tsx`  
**Status**: Complete  
- `"use client"` button with loading spinner
- POSTs to `/api/monitor` with optional `sourceId`
- Shows sonner toast summarizing OK/error counts

### Task 8: Competitors UI updates
**Files**: `src/app/competitors/page.tsx`, `src/components/competitors/competitor-table.tsx`  
**Status**: Complete  
- "Check all" button in page header
- New Health and Last checked table columns
- Per-source ghost check buttons in the Monitored URLs cell
- Status dot, failure-streak badge, and relative timestamps

### Task 9: Integration test scaffold
**File**: `tests/pipeline/run.test.ts`  
**Status**: Complete  
- Verifies `runPipeline()` returns `[]` when no active sources exist

### Task 10: E2E verification
**Status**: Complete  
- Started `pnpm dev`
- Created a test competitor pointing to `https://linear.app/changelog`
- Triggered `/api/monitor` via curl
- Confirmed snapshot stored with `contentHash` and `extractedText`
- Confirmed source health fields updated to `ok` with zero failure streak

## Verification

- `corepack pnpm test`: **46 passed**
- `npx tsc --noEmit`: **clean**
- E2E against `https://linear.app/changelog`: **passed**

## Commits

- `bea20da` feat(02): scraping pipeline, snapshots, health, and Check now
- `2ec934f` docs(02): update state, roadmap, requirements, project after Phase 2 completion

## Decisions & Notes

- Extraction uses the full `<body>` rather than per-site selectors. This keeps Phase 2 simple; if specific targets prove noisy, per-site selectors can be added later.
- The 50-character minimum-content threshold caused the brief's trivial test inputs to return empty, so test HTML was lengthened to pass the threshold while still asserting the same behaviors.
- Failure-streak increments use a drizzle-orm `sql` template literal to avoid a read-modify-write race.
- `getLatestSnapshot` was added now even though it is primarily a Phase 3 dependency because it is harmless and keeps the diff gate work self-contained.

## Out of Scope (deferred)

- Content diffing / hash gate → Phase 3
- LLM analysis → Phase 4
- Cron scheduling → Phase 5
- Jina Reader fallback / per-site CSS selectors → deferred until needed

---

*Phase 2 complete. Ready for Phase 3: Change Detection.*
