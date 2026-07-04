---
phase: 01-foundation-competitor-management
plan: 01
subsystem: ui
tags: [nextjs, tailwind, shadcn, radix, scaffold, walking-skeleton]

# Dependency graph
requires: []
provides:
  - Next.js 16 App Router scaffold at repo root with pinned dependency set (no @rc versions)
  - Real shadcn/ui component library (radix-based) with 11 components under src/components/ui/
  - Dark-only app shell: 240px fixed sidebar (Feed/Competitors nav), main content area
  - Feed placeholder page (/) and Competitors empty-state shell (/competitors)
affects: [01-02, 01-03, 01-04, 01-05]

# Tech tracking
tech-stack:
  added:
    - "next@16.2.10 (App Router, Turbopack)"
    - "drizzle-orm@0.45.2, drizzle-kit@0.31.10 (dev), @neondatabase/serverless@1.1.0"
    - "zod@4.4.3, dotenv@17.4.2"
    - "vitest@4.1.9 (dev), tsx@4.22.5 (dev)"
    - "shadcn CLI 4.12.0 (radix component library, base color neutral, CSS variables) — button, input, label, card, table, dialog, alert-dialog, badge, select, sonner, tooltip"
    - "radix-ui (consolidated package), lucide-react, class-variance-authority, clsx, tailwind-merge, tw-animate-css, sonner, next-themes"
  patterns:
    - "Tailwind 4 CSS-first theming: @theme inline maps CSS custom properties to Tailwind color tokens in globals.css"
    - "Dark-only theme: literal className=\"dark\" on <html>, no toggle, no light-mode media query"
    - "Client component boundary: usePathname-based nav requires \"use client\" (app-sidebar.tsx)"

key-files:
  created:
    - src/app/layout.tsx
    - src/app/page.tsx
    - src/app/competitors/page.tsx
    - src/components/app-sidebar.tsx
    - components.json
    - src/components/ui/{button,input,label,card,table,dialog,alert-dialog,badge,select,sonner,tooltip}.tsx
  modified:
    - package.json
    - pnpm-lock.yaml
    - next.config.ts
    - .gitignore
    - src/app/globals.css

key-decisions:
  - "shadcn CLI 4.12.0 defaults to the @base-ui/react component library (breaking change from prior 'radix by default' behavior) — explicitly passed -b radix to match the UI-SPEC's locked 'radix (shadcn default primitives)' choice"
  - "shadcn CLI 4.12.0 replaced the old 'base color' concept with named style presets (nova/vega/maia/...) — picked the default preset since Task 3 fully overrides all CSS custom properties with the UI-SPEC Color table anyway, making the preset's own palette irrelevant"
  - "pnpm is not on PATH (system Node install) and corepack enable fails with EACCES on /usr/local/bin — worked around by pointing corepack's --install-directory at a scratch bin dir and prepending it to PATH for shadcn's internal 'pnpm add' spawn calls"
  - "Set turbopack.root in next.config.ts to pin the workspace root — a sibling pnpm-workspace.yaml/pnpm-lock.yaml exists one directory above the repo root (outside this git repo) and was causing Next.js to misdetect the monorepo root"

patterns-established:
  - "All shadcn components are genuine CLI output (not hand-rolled) — future component additions should use `pnpm dlx shadcn@4.12.0 add <component>` to stay consistent"
  - "TooltipProvider wraps the app in layout.tsx per shadcn's own post-install instructions, ready for Plan 03's icon-button tooltips"

requirements-completed: [COMP-01, COMP-02]

# Metrics
duration: 45min
completed: 2026-07-03
---

# Phase 1 Plan 1: Next.js Scaffold + Dark App Shell Summary

**Next.js 16 + Tailwind 4 + genuine shadcn/ui (radix) scaffold with a dark-only 240px sidebar shell, feed placeholder, and competitors empty-state — zero database code.**

## Performance

- **Duration:** ~45 min (continuation of a partially-executed prior session)
- **Completed:** 2026-07-03
- **Tasks:** 3 (Task 1 checkpoint pre-approved by user before this session)
- **Files modified:** 34 (29 in Task 2 commit, 5 in Task 3 commit)

## Accomplishments
- Reconciled a partially-scaffolded, never-committed working tree into two clean atomic commits
- Replaced a bogus hand-rolled `shadcn.config.json` and fake `src/components/ui/*` stand-ins with genuine shadcn CLI 4.12.0 output (radix component library, 11 components)
- Rebuilt `globals.css` to the UI-SPEC dark-only Color table with correctly wired Tailwind 4 `@theme inline` tokens (bg-card/border-border/etc. now resolve)
- Rebuilt the app shell: sidebar renders in layout, feed and competitors pages carry exact UI-SPEC copy and typography discipline (12/14/20/28px, weights 400/600 only)
- `npx next build` exits 0 with a clean Turbopack production build (no warnings)

## Task Commits

1. **Task 1: Approve package install list (legitimacy gate)** — pre-approved by user prior to this session (no commit; checkpoint only)
2. **Task 2: Scaffold Next.js into repo root and install pinned dependencies** - `134c02c` (feat)
3. **Task 3: Build the dark app shell per UI-SPEC** - `e2743be` (feat)

**Plan metadata:** committed separately after this summary (docs: complete plan)

## Files Created/Modified
- `package.json` / `pnpm-lock.yaml` - pinned dependency set, verified no `rc` version strings
- `components.json` - genuine shadcn config (style: radix-nova, baseColor: neutral, cssVariables: true)
- `src/components/ui/*.tsx` - 11 real shadcn components (button, input, label, card, table, dialog, alert-dialog, badge, select, sonner, tooltip)
- `next.config.ts` - added `turbopack.root` to fix workspace-root misdetection
- `.gitignore` - merged with `.env*`/`!.env.example`/`.DS_Store` entries
- `src/app/globals.css` - dark-only UI-SPEC color tokens, removed light-mode media query, fixed Geist font wiring
- `src/app/layout.tsx` - renders `AppSidebar`, main content area (zinc-950 bg, 24px padding, max-w-1120px, 240px sidebar offset), `TooltipProvider` wrap
- `src/components/app-sidebar.tsx` - `"use client"` directive added, 240px fixed sidebar, cyan active-indicator nav
- `src/app/page.tsx` - feed placeholder, exact UI-SPEC copy, link (not button) CTA
- `src/app/competitors/page.tsx` - 28px/600 page title + separate empty-state heading/body

## Decisions Made
- shadcn CLI 4.12.0 is a breaking change from what RESEARCH.md assumed (`-b` now selects component library — `radix` vs `base` — not base color; base color is gone in favor of named style presets). Explicitly used `-b radix` to honor the UI-SPEC's locked "radix (shadcn default primitives)" component library choice; the specific style preset (base-nova default) doesn't matter because Task 3 fully overrides every CSS custom property with the UI-SPEC Color table.
- Worked around missing `pnpm` on PATH by pointing `corepack enable --install-directory` at a scratch directory and prepending it to PATH for the duration of shadcn CLI invocations (shadcn's installer shells out to a bare `pnpm` binary internally, not through `corepack pnpm`).
- Added `turbopack.root` to `next.config.ts` — a sibling `pnpm-workspace.yaml`/`pnpm-lock.yaml` exists one directory above the repo root (outside this git repository, out of scope to modify) and was causing a Next.js build warning about ambiguous workspace root; pinning `turbopack.root` to `__dirname` silences it without touching the out-of-scope sibling files.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn CLI 4.12.0 API changed from RESEARCH.md assumptions**
- **Found during:** Task 2 (shadcn init)
- **Issue:** RESEARCH.md/plan assumed `shadcn init` takes a "base color: zinc" preset flag; the installed CLI (4.12.0) replaced that with `-b <radix|base>` (component library choice) and named style presets (nova/vega/maia/...), defaulting to the `@base-ui/react` library instead of Radix.
- **Fix:** Ran init with `-b radix` explicitly to match the UI-SPEC's locked component library; let the style preset default (irrelevant since Task 3 overrides all CSS variables anyway).
- **Files modified:** components.json, package.json, pnpm-lock.yaml
- **Verification:** `components.json` shows `"style": "radix-nova"`; `package.json` shows `radix-ui` (not `@base-ui/react`) as a dependency; build passes.
- **Committed in:** 134c02c (Task 2 commit)

**2. [Rule 3 - Blocking] pnpm not resolvable by shadcn CLI's internal spawn**
- **Found during:** Task 2 (shadcn init / add)
- **Issue:** `pnpm dlx shadcn@4.12.0 init` failed with `spawn pnpm ENOENT` — the CLI shells out to a literal `pnpm` binary, which isn't on PATH in this environment (only `corepack pnpm` works).
- **Fix:** Ran `corepack enable --install-directory <scratch-dir>` to materialize `pnpm` shims, prepended that directory to `PATH` for the shadcn init/add commands.
- **Files modified:** none (environment-only workaround)
- **Verification:** `pnpm dlx shadcn@4.12.0 init`/`add` completed successfully with PATH set.
- **Committed in:** n/a (no file changes)

**3. [Rule 1 - Bug] Sidebar nav crashed without "use client"**
- **Found during:** Task 3 (app shell build)
- **Issue:** `app-sidebar.tsx` used `usePathname()` (a client hook) without the `"use client"` directive.
- **Fix:** Added `"use client"` at the top of the file.
- **Files modified:** src/components/app-sidebar.tsx
- **Verification:** `npx next build` compiles without a "hooks can only be used in Client Components" error.
- **Committed in:** e2743be (Task 3 commit)

**4. [Rule 1 - Bug] Workspace-root misdetection warning**
- **Found during:** Task 2 verify step (`npx next build`)
- **Issue:** Next.js Turbopack warned about an ambiguous workspace root due to a sibling `pnpm-workspace.yaml`/`pnpm-lock.yaml` one directory above the repo root (outside this git repo, out of scope to modify).
- **Fix:** Set `turbopack: { root: __dirname }` in `next.config.ts`.
- **Files modified:** next.config.ts
- **Verification:** `npx next build` output no longer shows the workspace-root warning.
- **Committed in:** 134c02c (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking/Rule 3, 2 bug/Rule 1)
**Impact on plan:** All auto-fixes were necessary to get a working build under a shadcn CLI version whose flags changed since RESEARCH.md was written, and to work around a PATH limitation in this environment. No scope creep — UI-SPEC's design intent (radix components, dark-only theme, exact copy) was preserved in every case.

## Issues Encountered
- Discovered and cleaned up a leftover `/tmp/productpulse-scaffold` directory from an earlier scaffold attempt (removed; not part of any commit).
- Discovered a bogus hand-rolled `shadcn.config.json` and a `src/components/ui/alertdialog.tsx` empty stub from a prior session; both removed before running the real shadcn CLI.

## User Setup Required

None - no external service configuration required this plan (database/Neon/Vercel setup arrives in Plans 03/05).

## Next Phase Readiness
- App shell is navigable locally (`npx next dev`): `/` shows the feed placeholder with a working link to `/competitors`; `/competitors` shows the empty-state shell.
- All 11 shadcn components are genuine CLI output and ready for Plan 03 to wire the add/edit dialogs and delete confirmation.
- Zero database code exists yet — Plan 02 starts the schema + validation work on a clean, committed foundation.
- No blockers identified.

---
*Phase: 01-foundation-competitor-management*
*Completed: 2026-07-03*

## Self-Check: PASSED

All claimed files verified present on disk (src/app/layout.tsx, src/app/page.tsx, src/app/competitors/page.tsx, src/components/app-sidebar.tsx, components.json, src/components/ui/dialog.tsx, src/components/ui/sonner.tsx, next.config.ts, .gitignore, src/app/globals.css). All claimed commit hashes verified present in git log (134c02c, e2743be, e461f44).
