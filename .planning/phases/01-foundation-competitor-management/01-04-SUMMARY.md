---
phase: 01-foundation-competitor-management
plan: 04
subsystem: crud
tags: [server-actions, drizzle, reconcile-by-id, alert-dialog, tooltip, shadcn]

# Dependency graph
requires:
  - phase: 01-foundation-competitor-management (Plan 03)
    provides: createCompetitor Server Action, listCompetitorsWithSources(), CompetitorDialog (add mode, mode-ready props), CompetitorTable with an empty Actions column placeholder
provides:
  - "updateCompetitor Server Action — reconcile-by-id edit (update/insert/delete sources scoped by competitorId, never delete-and-reinsert)"
  - "deleteCompetitor Server Action — competitor delete with FK-cascade source removal"
  - "CompetitorDialog mode:'edit' — prefilled name + URL rows carrying source ids, 'Save changes' submit, 'Changes saved' toast"
  - "DeleteCompetitorDialog — AlertDialog confirm with exact UI-SPEC destructive copy"
  - "Wired Actions column (edit pencil / delete trash-2 icon buttons, aria-labels, tooltips) — closes the full COMP-01/COMP-02 interactive surface"
affects: ["01-05 (deploy — full CRUD surface now demo-ready)"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reconcile-by-id edit strategy: never delete-and-reinsert child rows on update — select existing ids, update rows present in both existing+payload, insert payload rows without an id, delete existing ids absent from payload; every statement scoped by both child id AND parent id to block cross-parent IDOR"
    - "A single CompetitorDialog client component runs two useActionState hooks (one per Server Action) unconditionally and selects the active state/action/pending triple by `mode` at render time, instead of forking add/edit into separate components"
    - "Plain (non-useActionState) Server Actions used for pure-delete flows (deleteCompetitor(formData) — no prevState arg); client-side completion signal comes from react-dom's useFormStatus() pending->not-pending edge inside a child submit-button component, since the action itself returns void"
    - "Optional `tooltipLabel` prop on a Dialog-wrapping component composes Tooltip > DialogTrigger > Button (three chained asChild Slot layers) so icon-only triggers get both a tooltip and dialog-open behavior without forking the trigger rendering path"

key-files:
  created:
    - src/components/competitors/delete-competitor-dialog.tsx
  modified:
    - src/app/competitors/actions.ts
    - src/components/competitors/competitor-dialog.tsx
    - src/components/competitors/competitor-table.tsx

key-decisions:
  - "Invalid/forged competitor id on updateCompetitor returns a generic formError (no user-visible id field to attach a field error to) rather than a fieldErrors entry — id issues are the one zod-issue path handled outside the field-keyed error loop"
  - "CompetitorDialog keeps a single component for both add and edit modes (mode:'add'|'edit' prop, competitor prop only required for edit) rather than forking into two components, per the plan's 'extend, don't fork' instruction"
  - "deleteCompetitor stayed a plain single-arg Server Action (no useActionState) per the plan's literal wording ('plain form action'); success feedback derived client-side via useFormStatus's pending-edge in a small wrapper component instead of a return-value state machine"
  - "Delete dialog's exact destructive copy (including the apostrophe in \"can't be undone\") is rendered from a JS string constant via {DELETE_BODY} rather than as inline JSX text, avoiding both the eslint unescaped-entities/HTML-entity tradeoff and any drift from the UI-SPEC's literal string"

patterns-established:
  - "reconcile-by-id" (see tech-stack.patterns above) is now the canonical edit strategy for any future child-row editing UI in this app (avoids destroying FK-cascaded history)

requirements-completed: [COMP-02]

# Metrics
duration: 15min
completed: 2026-07-03
---

# Phase 1 Plan 4: Edit (Reconcile-by-id) + Delete Summary

**updateCompetitor Server Action reconciles a competitor's URL set by source id (update/insert/delete, never recreate) and deleteCompetitor removes a competitor with FK-cascaded sources, both wired into an edit-mode CompetitorDialog and a new AlertDialog-based DeleteCompetitorDialog with exact UI-SPEC copy — closing the full add/edit/delete interactive surface for COMP-02.**

## Performance

- **Duration:** ~15 min (commit-to-commit span; see git log 3b81680..c222163)
- **Completed:** 2026-07-03
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments
- `updateCompetitor` Server Action: updates `competitors.name`/`updatedAt`, then reconciles `sources` by id — updates rows whose id exists for that competitor, inserts payload rows without an id, deletes existing rows absent from the payload — every statement scoped by both source id and `competitorId` (blocks cross-competitor IDOR per threat T-01-08); de-dupes payload URLs against the composite unique index; returns the same field-keyed error contract as `createCompetitor`
- `deleteCompetitor` Server Action: validates id via zod, deletes the competitor row; sources cascade via the existing `onDelete: 'cascade'` FK (no explicit sources delete statement — verified by grep and by direct DB inspection)
- `CompetitorDialog` extended (not forked) with `mode: 'edit'`: prefills name + one URL row per existing source (each row carries its DB source id through the serialized JSON payload), submits to `updateCompetitor`, "Save changes" accent submit, "Changes saved" toast
- New `DeleteCompetitorDialog`: shadcn AlertDialog with the exact UI-SPEC copy (title "Delete {name}?", body "This removes its monitored URLs and everything ProductPulse has captured for them. This can't be undone.", destructive "Delete competitor" confirm, outline "Keep competitor" dismiss), wired to `deleteCompetitor` via a plain form action + hidden id input, "Competitor deleted" toast on submit completion
- `CompetitorTable`'s Actions column filled: always-visible ghost icon buttons (lucide `Pencil`/`Trash2`), exact `aria-label="Edit {name}"`/`aria-label="Delete {name}"`, and shadcn Tooltips ("Edit"/"Delete")
- Verified reconcile-by-id and cascade-delete directly against the live Neon DB (no browser automation available in this environment, consistent with Plan 03): renamed a competitor, re-kinded one existing source (confirmed its DB id was preserved, not recreated), removed one source row, added a new one, confirmed an invalid id is rejected with a generic error, and confirmed a full competitor delete cascades its sources to zero rows — then restored the demo DB back to its original "Linear" state
- Confirmed via `next dev` + curl that the rendered `/competitors` page emits `aria-label="Edit Linear"` and `aria-label="Delete Linear"` exactly as specified

## Task Commits

1. **Task 1: updateCompetitor (reconcile-by-id) and deleteCompetitor Server Actions** — `3b81680` (feat)
2. **Task 2: Edit dialog mode, delete confirmation dialog, table action buttons** — `c222163` (feat)

**Plan metadata:** committed separately after this summary (docs: complete plan)

## Files Created/Modified
- `src/app/competitors/actions.ts` — added `updateCompetitor` (reconcile-by-id, competitor-scoped) and `deleteCompetitor` (cascade-delete) Server Actions; both `revalidatePath('/competitors')` on success
- `src/components/competitors/competitor-dialog.tsx` — extended with `mode: 'edit'`, a second `useActionState(updateCompetitor, ...)` hook selected at render time, prefilled rows carrying source ids, mode-dependent title/submit copy/toast, and an optional `tooltipLabel` prop for icon-only triggers
- `src/components/competitors/delete-competitor-dialog.tsx` — new AlertDialog confirmation component with exact UI-SPEC copy and a `useFormStatus`-driven success toast
- `src/components/competitors/competitor-table.tsx` — filled the Actions column with the edit/delete icon buttons wired to the two dialogs above

## Decisions Made
- Kept a single `CompetitorDialog` component for add and edit (per the plan's "extend, don't fork" instruction) by running both `useActionState` hooks unconditionally and selecting the active triple by `mode`
- `deleteCompetitor` remains a plain single-argument Server Action (matches the plan's literal "plain form action" wording); client-side success toast derived from `useFormStatus`'s pending→not-pending edge in a small `DeleteConfirmButton` wrapper rather than converting it to a `useActionState`-style action
- Rendered the delete dialog's exact destructive copy string (with its literal apostrophe) via a `DELETE_BODY` JS constant passed as a JSX expression, rather than inline JSX text, to avoid the `react/no-unescaped-entities` / HTML-entity tradeoff while keeping the exact-match string intact for verification
- Composed the icon-only Edit trigger as `Tooltip > DialogTrigger > Button` (via a new optional `tooltipLabel` prop on `CompetitorDialog`) rather than adding a second dialog-trigger code path, mirroring the same three-layer Slot composition already used for the Delete button (`Tooltip > AlertDialogTrigger > Button`)

## Deviations from Plan

None from the plan's `<action>`/`<verify>` blocks — both tasks matched their specifications exactly, and all automated + acceptance-criteria checks passed on the first implementation pass.

One out-of-scope discovery was logged (not fixed, per the deviation rules' scope boundary):

**Logged to deferred-items.md (not a Rule 1-3 auto-fix):** `src/components/competitors/competitor-dialog.tsx`'s `useEffect` that calls `toast.success(...)` + `setOpen(false)` on `state.success` trips the `react-hooks/set-state-in-effect` ESLint rule. Confirmed via `git show HEAD~1` that this exact pattern pre-dates this plan (introduced in Plan 01-03's add-mode implementation) — this plan only changed the toast message text to be mode-dependent, not the underlying effect shape. Neither plan's automated verify commands run ESLint (`next build` in this project does not lint during build), so this was out of scope per the executor's scope-boundary rule. See `.planning/phases/01-foundation-competitor-management/deferred-items.md`.

## Issues Encountered
- No browser or headless-browser automation tool is available in this environment (same constraint noted in Plan 03's summary). Verified the full reconcile-by-id/cascade-delete behavior by invoking `updateCompetitor`/`deleteCompetitor`/`createCompetitor` directly via `tsx --env-file=.env` against the live Neon DB (catching the same expected `revalidatePath`-outside-request-context error Plan 03 documented — the DB mutation completes before that invariant throws), then querying the DB directly to confirm results; separately used `next dev` + `curl` to confirm the rendered HTML carries the exact aria-labels. Restored the demo DB to its original "Linear" (2 URLs) state after the verification writes.
- `tsx` run from a script located outside the project directory (in scratchpad) failed to resolve `dotenv/config` and the project's own `node_modules` (Node's CJS resolution walks up from the script's own path, not `cwd`); resolved by placing the verification script temporarily at the project root (deleted immediately after each run, never committed) and loading env vars via `tsx --env-file=.env` instead of importing `dotenv/config`.

## User Setup Required

None — no new external services or environment variables introduced this plan.

## Next Phase Readiness
- Full COMP-01 + COMP-02 interactive surface (add, edit, delete competitors and their monitored URLs) is complete and verified against the live Neon DB
- `updateCompetitor`/`deleteCompetitor` are ready to be exercised by Plan 05's end-to-end deploy verification
- The reconcile-by-id pattern established here is documented as the canonical approach for any future phase that edits child rows under a cascading FK (e.g., future source-management UI)
- No blockers identified

---
*Phase: 01-foundation-competitor-management*
*Completed: 2026-07-03*

## Self-Check: PASSED

All claimed files verified present on disk (src/app/competitors/actions.ts, src/components/competitors/competitor-dialog.tsx, src/components/competitors/competitor-table.tsx, src/components/competitors/delete-competitor-dialog.tsx, this SUMMARY.md, deferred-items.md). All claimed commit hashes verified present in git log (3b81680, c222163, 46b63f7).
