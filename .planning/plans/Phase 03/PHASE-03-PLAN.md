# Phase 3 Plan: Change Detection

**Goal:** When a monitored page genuinely changes, create a change record with diff evidence. When it doesn't, the pipeline skips snapshot/change creation and only updates `lastCheckedAt`.

**Requirement:** MON-03

**Reference:** `.planning/research/ARCHITECTURE.md` Pattern 2 (Hash Gate Before LLM) and Pattern 1 (Extract-Then-Diff).

---

## Current State

- `src/lib/pipeline/fetch.ts` — HTTP fetch with timeout, challenge detection.
- `src/lib/pipeline/extract.ts` — HTML → Markdown + SHA-256 hash.
- `src/lib/pipeline/run.ts` — per-source orchestrator, inserts a snapshot every run, updates health.
- `src/lib/db/queries.ts` — exposes `getLatestSnapshot(sourceId)`.
- `src/lib/db/schema.ts` — `snapshots`, `changes` tables ready; `changes.fromSnapshotId` nullable for first detection.
- Tests: `tests/pipeline/extract.test.ts`, `tests/pipeline/run.test.ts` (currently only no-sources case).
- `diff` 9.0.0 installed with bundled TypeScript types.

---

## Work Items

### 1. Add `src/lib/pipeline/diff.ts` — unified text diff stage

- Export `unifiedDiff(prev: string, next: string): string` using `createPatch` from the `diff` library.
- Use filename/headers like `page.md` / `previous` / `current` so the patch is self-describing.
- Keep the diff line-based with a small context window (default).

### 2. Update `src/lib/pipeline/run.ts` — hash gate + change record

- Import `getLatestSnapshot` from `@/lib/db/queries` and `changes` from `@/lib/db/schema`.
- After successful extraction:
  1. Fetch previous snapshot via `getLatestSnapshot(source.id)`.
  2. If `prev?.contentHash === currentHash`:
     - Do **not** insert a snapshot or change.
     - Update source health (`lastCheckedAt`, `lastSuccessAt`, `lastStatus='ok'`, `lastError=null`, `failureStreak=0`).
     - Push report `{ status: 'ok', changed: false }`.
     - Continue to next source.
  3. If hashes differ (or there is no previous snapshot):
     - Insert new snapshot with `.returning({ id: snapshots.id })` to capture the inserted row id.
     - Compute `unifiedDiff(prev?.extractedText ?? '', currentText)`.
     - Insert `changes` row:
       - `sourceId: source.id`
       - `fromSnapshotId: prev?.id ?? null`
       - `toSnapshotId: newSnapshot.id`
       - `diffText: diffText`
       - LLM fields (`isMeaningful`, `category`, `summary`, `whyItMatters`) left `null` for Phase 4.
     - Update source health as a successful check.
     - Push report `{ status: 'ok', changed: true }`.
- Extend `RunReport` type with optional `changed?: boolean`.
- Keep per-source error isolation and existing failure-streak logic unchanged.

### 3. Add tests

- `tests/pipeline/diff.test.ts`:
  - Identical inputs produce no meaningful diff (no `+`/`-` change lines).
  - Added content appears as `+` lines.
  - Removed content appears as `-` lines.
  - Empty previous string produces a full-file addition patch.
- `tests/pipeline/run.test.ts`:
  - No active sources → empty array (keep existing test).
  - Hash gate: when new hash matches previous snapshot, no snapshot insert and no change insert; health still updates to `ok` with `lastCheckedAt` set.
  - Change detected: when new hash differs, insert snapshot + change with correct `fromSnapshotId`/`toSnapshotId` and non-empty `diffText`.
  - First check (no previous snapshot): still inserts snapshot + change (diff against empty string).
  - Use `vi.mock` for `@/lib/db`, `@/lib/db/queries`, and pipeline stages so tests stay fast and DB-agnostic.

### 4. Minor UI feedback (optional but useful)

- `src/components/competitors/check-now-button.tsx`: surface `changed` count in the success toast when at least one source changed, e.g. "Checked 3 sources — 2 unchanged, 1 changed". Keep error handling identical.

### 5. Typecheck + test run

- `corepack pnpm test`
- `npx tsc --noEmit`
- `corepack pnpm lint` (if time permits)

### 6. E2E / soak verification

- Start dev server: `corepack pnpm dev`.
- Trigger manual check against a real source (e.g. Linear changelog) via the dashboard "Check all" or per-source button.
- Verify DB:
  - First run creates exactly one snapshot and one change for the source.
  - Second run (same page content) creates **no** new snapshot and **no** new change, but updates `sources.lastCheckedAt`.
- Use a one-off `tsx` script or direct query to inspect `snapshots`/`changes` counts.
- Document result in a Phase 3 summary note.

---

## Out of Scope

- LLM analysis (Phase 4).
- Noise classification / `isMeaningful` flag (Phase 4).
- Intelligence feed / scheduled cron (Phase 5).
- DB schema migrations — `changes` table already supports the needed columns.

---

## Definition of Done

- [ ] `diff.ts` exists and is unit-tested.
- [ ] `run.ts` skips insert when the content hash is unchanged.
- [ ] `run.ts` inserts snapshot + `changes` row when the hash differs.
- [ ] All pipeline tests pass; TypeScript is clean.
- [ ] E2E manual soak shows zero false-positive inserts on consecutive identical checks.
- [ ] Requirement MON-03 can be marked complete in `REQUIREMENTS.md` and `STATE.md` updated.
