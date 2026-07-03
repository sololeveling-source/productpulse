# Walking Skeleton — ProductPulse

**Phase:** 1
**Generated:** 2026-07-03

## Capability Proven End-to-End

The user opens the deployed public app, adds a competitor with typed monitored URLs through a dialog, and sees it persist in hosted Postgres across page reloads and redeploys.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16.2.10 App Router (TypeScript, Turbopack, src-dir, `@/*` alias) | Locked by STACK.md; RSC reads DB directly — no client data-fetching layer for a read-mostly single-user app |
| Data layer | Neon Postgres (free tier) + Drizzle ORM 0.45.2 via `drizzle-orm/neon-http` | Serverless HTTP driver works identically from Vercel functions and (Phase 5) GitHub Actions; stays reachable unlike Supabase free tier |
| Schema strategy | Full roadmap schema in Phase 1 (competitors, sources, snapshots, changes, digests + 3 enums); `drizzle-kit push` from dev machine using DATABASE_URL_UNPOOLED; additive-only changes afterward | Prevents breaking migrations in Phases 2–6; enum values locked to requirement lists (COMP-01 kinds, AI-03 categories) |
| Mutations | Server Actions (`'use server'` in `src/app/competitors/actions.ts`) + zod validation + `revalidatePath` | Official Next.js 16 pattern for own-UI mutations; route handlers reserved for the Phase 2/5 externally-triggered pipeline endpoint |
| Validation / SSRF gate | zod 4 schemas in `src/lib/validation.ts` — http/https allowlist, internal-host denylist (localhost, 127.0.0.1, 169.254.169.254, 0.0.0.0, ::1) | URLs stored now are fetched server-side in Phase 2; validating at input time is the SSRF gate |
| Auth | None by design (single-user portfolio demo) | Project requirement; accepted risk documented in README; Phase 5 cron endpoint gets CRON_SECRET |
| UI system | Tailwind 4 (CSS-first) + shadcn (zinc base, CSS variables) + lucide-react + Geist fonts; dark-only (`<html class="dark">`), cyan-400 accent | 01-UI-SPEC.md is the locked visual contract; cyan avoids colliding with Phase 3/5 diff green/red |
| Deployment target | Vercel Hobby via GitHub Git integration (auto-deploy on push to main); env vars set before first deploy | Free, proves hosting path day one; `npx vercel` is the documented fallback |
| Test runner | Vitest 4.1.9, node environment, `tests/**/*.test.ts`, `@` → `./src` alias | Wave 0 requirement from 01-VALIDATION.md; `npx vitest run` per commit |
| Directory layout | `src/app/*` routes + colocated `actions.ts`; `src/lib/db/{schema,index,queries}.ts`; `src/lib/validation.ts`; `src/components/{ui,competitors}/*` | Matches project ARCHITECTURE.md; Phase 2 adds `src/lib/pipeline/` + `scripts/monitor.ts` without touching this layout |
| Package manager | pnpm via corepack (`corepack enable`, fallback `corepack pnpm <cmd>`) | pnpm not installed globally; corepack 0.35 present |

## Stack Touched in Phase 1

- [ ] Project scaffold (Next.js 16, Tailwind 4, ESLint, Vitest) — Plan 01
- [ ] Routing — `/` (feed placeholder) and `/competitors` real routes with sidebar nav — Plan 01
- [ ] Database — real write (createCompetitor insert) AND real read (listCompetitorsWithSources RSC render) against hosted Neon — Plan 03
- [ ] UI — add-competitor dialog wired to a Server Action; edit/delete complete the interaction set — Plans 03–04
- [ ] Deployment — live public Vercel URL, auto-deploy on push to main — Plan 05

## Out of Scope (Deferred to Later Slices)

- Any fetching of external URLs (scraping, backfill, health updates) — Phase 2
- Snapshots/changes/digests reads or writes (tables exist, unused) — Phases 2–6
- "Check now" trigger and pipeline route handler — Phase 2
- Diffing, change records — Phase 3; LLM analysis — Phase 4
- Feed UI (placeholder only), filters, cron scheduling — Phase 5; profiles/digest — Phase 6
- Auth, multi-user, theme toggle, mobile viewports (<1024px), loading skeletons

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: "Check now" → fetch/extract/normalize → snapshots + per-URL health (writes to sources health fields + snapshots table)
- Phase 3: hash gate + text diff → changes records with diff evidence
- Phase 4: LLM noise gate + summary/why-it-matters/category (fills nullable columns on changes)
- Phase 5: intelligence feed at `/` (replaces placeholder) + GitHub Actions daily cron hitting the same pipeline path
- Phase 6: competitor profiles + AI digest (fills digests table)
