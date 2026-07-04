# Deferred Items — Phase 01 (Foundation & Competitor Management)

Out-of-scope discoveries logged during plan execution, per the executor's
scope-boundary rule (only auto-fix issues directly caused by the current
task's changes).

## From Plan 01-04

- **`react-hooks/set-state-in-effect` lint error in `competitor-dialog.tsx`**
  (the `useEffect(() => { if (state.success) { toast.success(...); setOpen(false) } }, [state.success])`
  block). Confirmed pre-existing via `git show HEAD~1` — introduced in Plan
  01-03's add-mode implementation, unchanged in shape by Plan 01-04 (only the
  toast message text became mode-dependent). Not required by either plan's
  automated verify commands (`next build` in this project does not run
  ESLint during the build). Deferred rather than fixed to stay within this
  task's scope boundary; a future cleanup pass could restructure this as a
  wrapped client-side submit handler (calling the action via
  `startTransition` directly) instead of deriving the close/toast behavior
  from a `useActionState` effect.
