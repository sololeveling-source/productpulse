# Phase 1: Foundation & Competitor Management - Research

**Researched:** 2026-07-03
**Domain:** Next.js 16 App Router scaffold + Drizzle/Neon data layer + Vercel deployment + competitor CRUD
**Confidence:** HIGH (all versions verified against npm registry 2026-07-03; all patterns verified against official docs fetched 2026-07-03)

## Summary

This phase is a Walking Skeleton: scaffold Next.js 16 (App Router, TypeScript, Tailwind 4), wire Drizzle ORM to Neon Postgres over the HTTP driver, define the **full roadmap schema** (competitors, sources, snapshots, changes, digests — including `published_at`/`detected_at` and per-source health fields), build competitor/URL CRUD with Server Actions, and deploy to Vercel on day one. Everything needed is on free tiers and all versions from project STACK.md remain current as of 2026-07-03 — no version drift.

Three research findings materially affect planning: (1) the official Drizzle get-started guide now instructs `npm i drizzle-orm@rc` — this must NOT be followed; the project decision to pin stable `drizzle-orm@0.45.2` / `drizzle-kit@0.31.10` stands. (2) `create-next-app` will refuse to scaffold into the existing repo root because `.planning/` and `CLAUDE.md` are "conflicting files" — scaffold into a temp directory and move files in. (3) Neon free-tier limits are now verified HIGH confidence from neon.com/pricing: 0.5 GB storage/project, 100 CU-hours/month/project, autosuspend after 5 minutes (not configurable), compute suspended (not billed) if monthly limits are exceeded — comfortably sufficient, but the 5-minute autosuspend means the first query after idle has cold-start latency, which affects demo UX and should be documented, not fought.

**Primary recommendation:** Server Actions (Server Functions) for all competitor CRUD — the official Next.js 16 pattern for mutations from your own UI (`'use server'` file + `<form action={...}>` + `revalidatePath`). Route handlers are reserved for the Phase 2 pipeline endpoint that external callers (GitHub Actions cron) will hit. Use `drizzle-orm/neon-http` for runtime queries and the **unpooled** connection string for `drizzle-kit push`.

## Phase Context (no CONTEXT.md)

No CONTEXT.md exists for this phase (discuss-phase not run). Constraints come from project-level artifacts:

**Locked by prior project research/decisions (STACK.md, STATE.md):**
- Stack: Next.js 16 App Router, TypeScript, Tailwind 4, shadcn/ui, Drizzle ORM 0.45.x stable (NOT 1.0.0-rc), Neon Postgres free tier, `@neondatabase/serverless` HTTP driver, pnpm
- Deploy in Phase 1 to surface platform limits early (Vercel Hobby)
- Schema must cover the whole roadmap so later phases don't need breaking migrations
- No auth / single user (out of scope per REQUIREMENTS.md)
- Re-verify Neon free-tier limits during setup (done — see State of the Art)

**Claude's discretion:** exact schema column design, UI layout for competitor management, form validation approach, test setup details.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMP-01 | User can add a competitor with a name and one or more monitored URLs, each typed as changelog or pricing | Server Actions pattern (Code Examples 3), `sources` table with `kind` enum (Code Examples 1), zod validation of name + URL array (Code Examples 3), shadcn form components |
| COMP-02 | User can edit and remove competitors and their monitored URLs | Same Server Actions pattern with update/delete + `revalidatePath`; FK `onDelete: 'cascade'` from sources→competitors so removing a competitor cleans up its URLs |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

CLAUDE.md is GSD boilerplate (project not yet initialized). One actionable directive:
- **GSD workflow enforcement:** file changes must go through GSD commands (`/gsd-execute-phase` for planned phase work). The planner's tasks execute under this umbrella — no impact on task content.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Competitor list/detail rendering | Frontend Server (RSC) | — | Server Components read Neon directly via Drizzle; no client data-fetching layer |
| Add/edit/remove competitor + URLs | API/Backend (Server Actions) | Browser (form UI) | Mutations run server-side via `'use server'` functions; forms invoke them with `action` prop |
| Input validation | API/Backend (zod in Server Actions) | Browser (HTML `required`/`type=url` hints) | Server Actions are reachable via direct POST — server-side validation is the real gate [CITED: nextjs.org/docs/app/getting-started/mutating-data] |
| Persistence | Database (Neon Postgres) | — | Drizzle schema-as-code; full roadmap schema defined this phase |
| Schema management (push) | Dev tooling (drizzle-kit, local machine) | — | Migrations need the direct/unpooled connection; never run in Vercel build [CITED: neon.com/docs/connect/choose-connection] |
| Hosting/deployment | CDN/Static + Frontend Server (Vercel) | — | Vercel Hobby; git-integration deploy |
| Runtime DB access | API/Backend | — | `drizzle-orm/neon-http` over `@neondatabase/serverless` — HTTP fetch per query, no pool management |

## Standard Stack

All versions re-verified against npm registry 2026-07-03. Every version matches project STACK.md (researched 2026-07-02) — zero drift.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.10 | App framework (App Router, Server Actions, RSC) | Locked by STACK.md; current latest; Node 20+ required (local Node is 24.18) |
| typescript | 5.x (scaffolded) | Language | Ships with create-next-app |
| tailwindcss | 4.3.2 | Styling (CSS-first v4) | Wired automatically by create-next-app via `@tailwindcss/postcss` |
| shadcn (CLI) | 4.12.0 | UI components (copy-in) | Fully supports Tailwind v4 + React 19: "All components are updated for Tailwind v4 and React 19" [CITED: ui.shadcn.com/docs/tailwind-v4] |
| drizzle-orm | 0.45.2 | Type-safe DB access | Stable line. **Do NOT install `@rc`** even though the official get-started guide currently shows it — project decision (STACK.md "What NOT to Use") |
| drizzle-kit | 0.31.10 (dev) | Schema push/migrations | Pairs with 0.45.x; `drizzle-kit push` for this phase |
| @neondatabase/serverless | 1.1.0 | Neon HTTP driver | Use with `drizzle-orm/neon-http`; works identically from Vercel functions and (later) GitHub Actions |
| zod | 4.4.3 | Form/action input validation | Also reused in Phase 4 for LLM structured output |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 4.1.9 (dev) | Test framework | Wave 0 — no test infra exists yet (greenfield) |
| tsx | 4.22.5 (dev) | Run TS scripts (seed script; Phase 2 worker) | Optional this phase; needed by Phase 2 |
| dotenv | latest | Load `.env` in drizzle.config.ts | drizzle-kit runs outside Next.js env loading [CITED: orm.drizzle.team/docs/get-started/neon-new] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server Actions for CRUD | API route handlers + client fetch | Route handlers are for external callers (Phase 2 cron endpoint). For own-UI mutations, Server Actions give single-roundtrip UI+data updates, progressive enhancement, and less code — the official Next.js 16 recommendation [CITED: nextjs.org/docs/app/getting-started/mutating-data] |
| Manual Neon setup + env vars | Vercel Marketplace native Neon integration | Native integration auto-injects `DATABASE_URL`/`DATABASE_URL_UNPOOLED` but adds preview-branch resource sprawl (branches persist up to 6 months) and Vercel-managed billing lock-in. Manual: create project at neon.com, paste two connection strings into Vercel — simpler, portable [CITED: neon.com/docs/guides/vercel-managed-integration] |
| drizzle-kit push | generate + migrate | Push is correct for pre-production iteration (project decision). Switch to generate/migrate when schema stabilizes post-v1 |

**Installation:**
```bash
# pnpm is NOT installed locally — enable via bundled corepack first:
corepack enable

# Scaffold (see Pitfall 1 for the temp-dir workaround — repo root is non-empty)
pnpm create next-app@latest productpulse --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --disable-git

# Data layer (pin exact versions — official docs currently push @rc)
pnpm add drizzle-orm@0.45.2 @neondatabase/serverless@1.1.0 zod@4.4.3 dotenv
pnpm add -D drizzle-kit@0.31.10

# UI
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input label card table dialog badge select

# Tests (Wave 0)
pnpm add -D vitest@4.1.9
```

**Version verification (performed 2026-07-03 via `npm view <pkg> version`):** next 16.2.10, create-next-app 16.2.10, drizzle-orm 0.45.2, drizzle-kit 0.31.10, @neondatabase/serverless 1.1.0, tailwindcss 4.3.2, zod 4.4.3, shadcn 4.12.0, tsx 4.22.5, vitest 4.1.9.

## Package Legitimacy Audit

slopcheck could not be installed (system pip lacks `--break-system-packages`; all install paths failed). Per graceful-degradation protocol, all packages below are tagged `[ASSUMED]` and the planner must gate installs behind a `checkpoint:human-verify` task. **Recommendation to planner:** one consolidated checkpoint covering the whole install list is proportionate — manual legitimacy signals are unambiguous for every package (all are multi-year-old, mass-adoption packages discovered via official documentation, with official source repos and no postinstall scripts).

| Package | Registry | Age / last modified | Downloads (wk) | Source Repo | slopcheck | Disposition |
|---------|----------|--------------------|----------------|-------------|-----------|-------------|
| next | npm | 2026-07-03 (10+ yrs old) | 39.6M | github.com/vercel/next.js | unavailable | Approved [ASSUMED] |
| drizzle-orm | npm | 2026-06-27 | 11.3M | github.com/drizzle-team/drizzle-orm | unavailable | Approved [ASSUMED] |
| drizzle-kit | npm | 2026-06-27 | — | github.com/drizzle-team/drizzle-orm | unavailable | Approved [ASSUMED] |
| @neondatabase/serverless | npm | 2026-04-17 | 2.2M | github.com/neondatabase/serverless | unavailable | Approved [ASSUMED] |
| tailwindcss | npm | 2026-07-02 | — | github.com/tailwindlabs/tailwindcss | unavailable | Approved [ASSUMED] |
| zod | npm | 2026-05-04 | — | github.com/colinhacks/zod | unavailable | Approved [ASSUMED] |
| shadcn | npm | 2026-06-26 | 4.8M | github.com/shadcn-ui/ui | unavailable | Approved [ASSUMED] |
| tsx | npm | 2026-07-02 | — | github.com/privatenumber/tsx | unavailable | Approved [ASSUMED] |
| vitest | npm | 2026-06-15 | — | github.com/vitest-dev/vitest | unavailable | Approved [ASSUMED] |
| dotenv | npm | long-established | — | github.com/motdotla/dotenv | unavailable | Approved [ASSUMED] |

**Postinstall check:** `npm view <pkg> scripts.postinstall` returned empty for all checked packages — no postinstall scripts. [VERIFIED: npm registry query 2026-07-03]

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram (this phase's slice)

```
Browser
  │
  ├── GET /competitors ──────────────► Vercel (Next.js 16)
  │                                      │
  │                                      ▼
  │                              RSC page (force-dynamic)
  │                              lib/db/queries.ts ──► Drizzle (neon-http)
  │                                      │                    │ HTTPS fetch
  │◄── rendered HTML ────────────────────┘                    ▼
  │                                                    Neon Postgres
  ├── <form action={createCompetitor}> ► Server Action (POST) (free tier,
  │                                      │  1. zod.parse(formData)  autosuspend 5min)
  │                                      │  2. insert competitor + sources (Drizzle)
  │                                      │  3. revalidatePath('/competitors')
  │◄── updated UI (single roundtrip) ────┘
  │
Dev machine (local only)
  └── drizzle-kit push ── DATABASE_URL_UNPOOLED (direct TCP) ──► Neon
```

The full schema (snapshots, changes, digests) is created this phase but only competitors + sources are read/written by the UI. Later phases fill the other tables.

### Recommended Project Structure

Matches project ARCHITECTURE.md; only the Phase-1 subset gets built now:

```
src/
├── app/
│   ├── page.tsx                  # Placeholder home (feed arrives Phase 5) — link to /competitors
│   ├── layout.tsx
│   ├── globals.css               # Tailwind 4: @import "tailwindcss" (scaffolded)
│   └── competitors/
│       ├── page.tsx              # List + add form (RSC, force-dynamic)
│       ├── actions.ts            # 'use server' — create/update/delete competitor + sources
│       └── [id]/page.tsx         # Edit view (or use dialogs on the list page — discretionary)
├── lib/
│   └── db/
│       ├── index.ts              # drizzle(neon-http) client
│       ├── schema.ts             # FULL roadmap schema (all 5 tables + enums)
│       └── queries.ts            # Read models (competitors with sources)
├── components/
│   └── competitors/              # Form, list row, delete confirm (client components)
│   └── ui/                       # shadcn copy-in components
drizzle.config.ts                 # root — uses DATABASE_URL_UNPOOLED
drizzle/                          # (empty until generate/migrate era)
```

### Pattern 1: Server Actions for CRUD (the locked mutation pattern)

**What:** All mutations are async functions in a `'use server'` file, invoked via `<form action={...}>` or `formAction`. After mutating, call `revalidatePath()` so RSC pages re-render with fresh data. Pending/error state via `useActionState` in client form components.
**When to use:** Every competitor/source mutation in this phase.
**Why not API routes:** Server Functions return updated UI and data in a single roundtrip, support progressive enhancement, and are the documented Next.js 16 pattern for own-UI mutations. Route handlers enter in Phase 2 for the externally-triggered pipeline endpoint. [CITED: nextjs.org/docs/app/getting-started/mutating-data, lastUpdated 2026-06-23]
**Security note (from official docs):** "Server Functions are reachable via direct POST requests, not just through your application's UI." No auth is in scope (project decision), so validate all inputs with zod server-side; see Security Domain.

### Pattern 2: neon-http for runtime, unpooled for drizzle-kit

**What:** Runtime queries use `drizzle-orm/neon-http` (each query is an HTTP fetch — no pool, no connection lifecycle, works in any serverless context, ~3 round trips vs ~8 for TCP). Schema operations (`drizzle-kit push`) use the **direct/unpooled** connection string because migration tooling "needs stable, long-lived connections or features PgBouncer does not support." [CITED: neon.com/docs/connect/choose-connection]
**How:** Two env vars — `DATABASE_URL` (pooled or plain; used by app at runtime) and `DATABASE_URL_UNPOOLED` (direct; used only by drizzle.config.ts from the dev machine). Neon console provides both strings.

### Pattern 3: Full-roadmap schema now, additive-only later

**What:** Define all five tables + enums this phase, even though only two are used. `drizzle-kit push` handles later *additive* changes (new nullable columns, new tables) safely; what breaks are renames/type-changes/enum-value-removals — so get names, enums, and timestamp semantics right now.
**Key semantics locked into the schema (from project research):**
- `sources.kind`: enum `changelog | pricing` — drives extraction hints and LLM prompt framing (Phase 2/4)
- `sources.fetch_strategy`: enum `direct | jina` — per-URL rendering fallback flag (Pitfall 2 of PITFALLS.md)
- Per-source health fields: `last_checked_at`, `last_success_at`, `last_status`, `last_error`, `failure_streak` — MON-06 requires them; success criterion 4 requires them in schema now
- `changes.published_at` (nullable, from source) vs `changes.detected_at` — backfill items must not all show "today" (PITFALLS.md UX pitfall)
- `changes.category`: enum `feature_launch | pricing_change | deprecation | fix | other` — matches AI-03 verbatim
- LLM output columns on `changes` are nullable (populated in Phase 4)

### Pattern 4: force-dynamic on DB-reading pages

**What:** Pages that read Postgres at render time must opt out of static prerendering (`export const dynamic = 'force-dynamic'`), otherwise Next.js prerenders them at build time — baking stale data into the deploy and/or failing the build if the DB is unreachable during build.
**When to use:** `/competitors` and every future DB-backed page.

### Anti-Patterns to Avoid

- **Following the official Drizzle quickstart verbatim:** it currently installs `drizzle-orm@rc` / `drizzle-kit@rc`. Pin `0.45.2` / `0.31.10` explicitly. [CITED: orm.drizzle.team/docs/get-started/neon-new, fetched 2026-07-03]
- **Running `drizzle-kit push` in the Vercel build step:** schema changes are a deliberate local dev action, not a deploy side effect; also the build env would need the unpooled URL and a reachable DB.
- **Client-side data fetching for lists (useEffect + fetch):** RSC reads the DB directly; a client data layer is pure overhead for a single-user read-mostly app.
- **Modeling URLs as a text[] column on competitors:** `sources` is the unit of monitoring for the whole roadmap (health, snapshots, changes all FK to it). A separate table is non-negotiable.
- **Storing raw scraped HTML rendering paths now:** out of scope; Phase 1 has zero fetching of external URLs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form input validation | Custom validators/regex | zod 4 (`z.string().min(1)`, `z.url()`) | Edge cases (URL parsing, unicode, coercion) are solved; schema reused in Phase 4 |
| UI primitives (dialog, select, table, badge) | Custom Tailwind components | shadcn/ui CLI copy-in | Accessible, Tailwind-4-ready, no runtime dep lock-in |
| SQL / query building | String-built SQL | Drizzle ORM | Parameterization (SQLi safety), type inference from schema |
| DB connection management in serverless | pg Pool wrangling | `@neondatabase/serverless` neon-http | HTTP driver: no pool lifecycle, no "close in same request handler" rules to get wrong |
| Pending/optimistic form state | Custom loading flags | React `useActionState` | Built into React 19; official pattern with Server Actions |

**Key insight:** this phase is deliberately boring — every component has a paved path. The only design work is the schema, and that's where the planning attention should go.

## Common Pitfalls

### Pitfall 1: create-next-app refuses the non-empty repo root
**What goes wrong:** The repo root already contains `.planning/`, `CLAUDE.md`, `.claude/`, `.git/`. `create-next-app` aborts on directories containing files outside its conflict allowlist (`.git`, README, LICENSE, a few dotfiles).
**Why it happens:** Scaffold safety check.
**How to avoid:** Scaffold into a temp directory, then move contents into the repo root:
```bash
cd /tmp && pnpm create next-app@latest productpulse-scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --disable-git
# move everything (incl. dotfiles) into the repo root, then remove temp dir
rsync -a /tmp/productpulse-scaffold/ "<repo-root>/" && rm -rf /tmp/productpulse-scaffold
```
Note `--disable-git` (repo already exists). Merge the scaffold's `.gitignore` if one already exists; ensure `.env*` is gitignored.
**Warning signs:** "The directory contains files that could conflict" error.

### Pitfall 2: DB-reading pages statically prerendered at build
**What goes wrong:** `/competitors` shows stale (build-time) data after deploy, or the build fails trying to reach Neon.
**How to avoid:** `export const dynamic = 'force-dynamic'` on every DB-backed page (Pattern 4).
**Warning signs:** Vercel build log shows the page under "Static" ○ instead of "Dynamic" ƒ; data doesn't update without redeploy.

### Pitfall 3: drizzle-kit against the pooled connection string
**What goes wrong:** `drizzle-kit push` fails or behaves erratically through PgBouncer.
**How to avoid:** `drizzle.config.ts` uses `DATABASE_URL_UNPOOLED` (Neon's "direct" string). Runtime keeps using `DATABASE_URL` via neon-http. [CITED: neon.com/docs/connect/choose-connection]
**Warning signs:** prepared-statement or session-feature errors during push.

### Pitfall 4: Env vars added to Vercel don't take effect
**What goes wrong:** `DATABASE_URL` added after the first deploy; app still crashes with "connection string missing."
**Why it happens:** Vercel bakes env vars at build/deploy time — changes require a redeploy.
**How to avoid:** Set env vars (Production + Preview + Development scopes) *before* the first deploy, or trigger a redeploy after setting them. Locally, keep `.env` (for drizzle-kit) and `.env.local` (for Next) or a single `.env` loaded by both — never committed.

### Pitfall 5: Following docs onto drizzle-orm 1.0.0-rc
**What goes wrong:** The official Neon get-started guide now says `npm i drizzle-orm@rc` — installing it brings breaking migration-handling changes.
**How to avoid:** Install with explicit versions (`drizzle-orm@0.45.2`, `drizzle-kit@0.31.10`). Verify `package.json` after install.

### Pitfall 6: Enum/rename churn breaking later phases
**What goes wrong:** A Phase-3/4 need forces renaming a column or removing a pg enum value — `drizzle-kit push` can't do that without destructive statements.
**How to avoid:** Lock enum values now to the requirement lists (category matches AI-03's five values; kind matches COMP-01's two). Add speculative-but-cheap nullable columns now (health fields, `published_at`); anything else later is additive and safe.

### Pitfall 7: Neon autosuspend cold start during demo
**What goes wrong:** First page load after >5 min idle takes an extra ~0.5–2s while Neon compute wakes. Free tier autosuspend is fixed at 5 min, not configurable. [CITED: neon.com/pricing, fetched 2026-07-03]
**How to avoid:** Accept it (single cold query, not 30–60s like Render). Don't add keep-alive pingers — they burn CU-hours. Note it in the README as expected behavior.

### Pitfall 8: Unvalidated URLs stored for later server-side fetching (SSRF seed)
**What goes wrong:** Phase 2 will fetch whatever URLs Phase 1 stored. A `file://`, `http://169.254.169.254/`, or `http://localhost:...` URL stored now becomes an SSRF in Phase 2.
**How to avoid:** Validate at input time: `z.url()` + explicit scheme allowlist (`http:`/`https:` only) + reject obvious internal hosts. Cheap now, required later (PITFALLS.md Security Mistakes).

## Code Examples

All patterns verified against official docs fetched 2026-07-03.

### 1. Full roadmap schema (`src/lib/db/schema.ts`)

```typescript
// Sources: orm.drizzle.team/docs/get-started/neon-new (conventions);
// column set from project ARCHITECTURE.md data model + phase success criteria
import {
  pgTable, pgEnum, integer, text, varchar, boolean, timestamp,
} from 'drizzle-orm/pg-core'

export const sourceKind = pgEnum('source_kind', ['changelog', 'pricing'])
export const fetchStrategy = pgEnum('fetch_strategy', ['direct', 'jina'])
export const changeCategory = pgEnum('change_category', [
  'feature_launch', 'pricing_change', 'deprecation', 'fix', 'other',
])

export const competitors = pgTable('competitors', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 200 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sources = pgTable('sources', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  competitorId: integer('competitor_id').notNull()
    .references(() => competitors.id, { onDelete: 'cascade' }),
  url: text().notNull(),
  kind: sourceKind().notNull(),
  fetchStrategy: fetchStrategy('fetch_strategy').notNull().default('direct'),
  active: boolean().notNull().default(true),
  // Per-source health (MON-06; required in schema by Phase 1 success criteria)
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastStatus: text('last_status'),          // e.g. 'ok' | 'fetch_error' | 'extract_empty' | 'challenge_page'
  lastError: text('last_error'),
  failureStreak: integer('failure_streak').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const snapshots = pgTable('snapshots', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sourceId: integer('source_id').notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  contentHash: varchar('content_hash', { length: 64 }).notNull(), // sha256 hex
  extractedText: text('extracted_text').notNull(),
  rawHtml: text('raw_html'),                 // optional, for re-extraction while tuning
  httpStatus: integer('http_status'),
  fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
})

export const changes = pgTable('changes', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  sourceId: integer('source_id').notNull()
    .references(() => sources.id, { onDelete: 'cascade' }),
  fromSnapshotId: integer('from_snapshot_id').references(() => snapshots.id),
  toSnapshotId: integer('to_snapshot_id').notNull().references(() => snapshots.id),
  diffText: text('diff_text').notNull(),
  // LLM analysis fields — nullable until Phase 4 populates them
  isMeaningful: boolean('is_meaningful'),
  category: changeCategory(),
  summary: text(),
  whyItMatters: text('why_it_matters'),
  publishedAt: timestamp('published_at', { withTimezone: true }), // source-stated date (backfill)
  detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
})

export const digests = pgTable('digests', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  contentMd: text('content_md').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
```

### 2. DB client + drizzle config

```typescript
// src/lib/db/index.ts
// Source: orm.drizzle.team/docs/get-started/neon-new
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle({ client: sql, schema })
```

```typescript
// drizzle.config.ts (project root)
// Source: orm.drizzle.team/docs/get-started/neon-new + neon.com/docs/connect/choose-connection
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // Direct (unpooled) connection — required for schema tooling
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
})
```

```bash
# Apply schema (local machine, never in CI/build this phase)
pnpm drizzle-kit push
```

### 3. Server Action CRUD with zod + revalidatePath

```typescript
// src/app/competitors/actions.ts
// Source pattern: nextjs.org/docs/app/getting-started/mutating-data (v16.2.10, lastUpdated 2026-06-23)
'use server'

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { competitors, sources } from '@/lib/db/schema'

const urlSchema = z.url().refine(
  (u) => {
    const parsed = new URL(u)
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      !['localhost', '127.0.0.1', '169.254.169.254', '0.0.0.0'].includes(parsed.hostname)
    )
  },
  { message: 'URL must be a public http(s) address' },
)

const createCompetitorSchema = z.object({
  name: z.string().min(1).max(200),
  urls: z.array(z.object({ url: urlSchema, kind: z.enum(['changelog', 'pricing']) })).min(1),
})

export async function createCompetitor(_prev: unknown, formData: FormData) {
  const raw = {
    name: formData.get('name'),
    // form encodes url rows as urls[i][url] / urls[i][kind] — assemble before parse
    urls: JSON.parse(String(formData.get('urls') ?? '[]')),
  }
  const parsed = createCompetitorSchema.safeParse(raw)
  if (!parsed.success) return { error: z.treeifyError(parsed.error) }

  const [competitor] = await db
    .insert(competitors)
    .values({ name: parsed.data.name })
    .returning()

  await db.insert(sources).values(
    parsed.data.urls.map((u) => ({ competitorId: competitor.id, url: u.url, kind: u.kind })),
  )

  revalidatePath('/competitors')
  return { success: true }
}

export async function deleteCompetitor(formData: FormData) {
  const id = z.coerce.number().int().parse(formData.get('id'))
  await db.delete(competitors).where(eq(competitors.id, id)) // sources cascade
  revalidatePath('/competitors')
}
```

### 4. RSC list page (dynamic) + form invocation

```typescript
// src/app/competitors/page.tsx
// Source pattern: nextjs.org/docs/app/getting-started/mutating-data
export const dynamic = 'force-dynamic' // Pitfall 2 — never prerender DB reads

import { db } from '@/lib/db'
import { CompetitorForm } from '@/components/competitors/form'

export default async function CompetitorsPage() {
  const rows = await db.query.competitors.findMany({
    with: { /* relations config for sources */ },
  })
  return (
    <main>
      <CompetitorForm />
      {/* list rows with edit/delete, each delete a <form action={deleteCompetitor}> */}
    </main>
  )
}
```

```typescript
// src/components/competitors/form.tsx — pending state via useActionState
// Source: nextjs.org/docs/app/getting-started/mutating-data
'use client'
import { useActionState } from 'react'
import { createCompetitor } from '@/app/competitors/actions'

export function CompetitorForm() {
  const [state, action, pending] = useActionState(createCompetitor, null)
  return (
    <form action={action}>
      {/* name input, dynamic URL rows (url + kind select), submit disabled={pending} */}
    </form>
  )
}
```

### 5. Vercel deployment steps (manual Neon connection — recommended path)

```bash
# 1. Create Neon project at console.neon.tech (region close to Vercel deployment region)
#    Copy BOTH connection strings: pooled -> DATABASE_URL, direct -> DATABASE_URL_UNPOOLED
# 2. Local: .env with both vars; run `pnpm drizzle-kit push`; verify with `pnpm dev`
# 3. Push repo to GitHub (no gh CLI installed — create repo via github.com UI, then:)
git remote add origin <repo-url> && git push -u origin main
# 4. vercel.com → Add New Project → import the GitHub repo
#    Set env vars BEFORE first deploy (Production+Preview): DATABASE_URL, DATABASE_URL_UNPOOLED
# 5. Deploy. Verify: add a competitor on the public URL, redeploy, confirm it persists.
# (Alternative without GitHub: `npx vercel` CLI deploy from the repo root.)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API routes + client fetch for mutations | Server Functions (`'use server'`) with `<form action>`, `useActionState` | Stable since Next 14/15; the documented default in Next 16 | Less code, single-roundtrip UI updates, progressive enhancement |
| `router.refresh()` from client after mutation | `refresh()` from `next/cache` inside the Server Action (new), or `revalidatePath` | Next 16.x | `revalidatePath('/competitors')` is sufficient for this phase |
| Drizzle stable 0.45.x everywhere | Official quickstarts now push `@rc` (1.0 release candidate) | mid-2026 | Deliberately stay on 0.45.2 (project decision) |
| Tailwind v3 config file | Tailwind 4 CSS-first (`@import "tailwindcss"`, `@theme`), no tailwind.config | Tailwind 4 (2025) | shadcn init handles it; don't create a v3-style config |
| shadcn `tailwindcss-animate` | `tw-animate-css` | Tailwind v4 migration | CLI handles it during init [CITED: ui.shadcn.com/docs/tailwind-v4] |

**Neon free tier — re-verified 2026-07-03 at neon.com/pricing (upgrades prior MEDIUM confidence to HIGH):**
- 0.5 GB storage/project; 100 CU-hours/month/project; autoscaling up to 2 CU (8 GB RAM)
- 10 branches/project; 5 GB public egress/month; 6-hour history window (1 GB limit)
- Autosuspend after 5 min inactivity — always enforced, not configurable; suspended compute costs $0
- **If a monthly limit is exceeded, compute is suspended until the next billing month** (no auto-upgrade) — at this app's scale (~10 URLs daily + a dashboard) usage is a tiny fraction of limits; no risk identified

**Deprecated/outdated:** none of the planned stack is deprecated. Watch item: drizzle 1.0 will eventually GA — migration is a post-v1 concern.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | All npm packages are legitimate (slopcheck unavailable; manual signals only: official repos, multi-million weekly downloads, no postinstall scripts) | Package Legitimacy Audit | Very low — all are canonical ecosystem packages discovered via official docs; planner adds one consolidated human-verify checkpoint |
| A2 | create-next-app will reject the non-empty repo root (`.planning/`, `CLAUDE.md` not on its allowlist) — based on known CLI behavior, not tested against 16.2.10 in this session | Pitfall 1 | Low — if it scaffolds in place, the temp-dir step is skipped; if it rejects, the documented workaround applies either way |
| A3 | `z.treeifyError` / zod 4 error API shape in Code Example 3 | Code Examples | Trivial — executor adjusts to actual zod 4.4.3 API at build time; validation approach unchanged |
| A4 | Neon cold-start latency after autosuspend is ~0.5–2s | Pitfall 7 | Low — magnitude only; autosuspend-at-5-min itself is verified from pricing page |
| A5 | Vercel Hobby remains sufficient (no new limits since project research 2026-07-02) | Deployment | Low — deploy-day-one strategy exists precisely to surface this immediately |

## Open Questions

1. **Edit UX: inline dialogs vs dedicated edit page?**
   - What we know: both are trivial with shadcn (Dialog vs `[id]/page.tsx`); COMP-02 only requires that edit/remove work
   - Recommendation: planner's/executor's discretion; dialog-on-list-page is less routing surface for a walking skeleton
2. **Should `sources.url` be unique per competitor?**
   - What we know: duplicate URLs would create duplicate monitoring work in Phase 2
   - Recommendation: add a composite unique index `(competitor_id, url)` — cheap now, prevents a Phase 2 bug class
3. **Single `.env` vs `.env.local` split locally**
   - What we know: Next.js loads `.env.local`; drizzle.config.ts uses `dotenv` which loads `.env`
   - Recommendation: single `.env` (gitignored) + `dotenv` in drizzle.config.ts; Next also reads `.env`

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next 16 (needs 20+) | ✓ | v24.18.0 | — |
| npm | package ops | ✓ | 11.16.0 | — |
| pnpm | project package manager (STACK.md) | ✗ | — | `corepack enable` (corepack 0.35.0 present) or `npm i -g pnpm` |
| corepack | pnpm activation | ✓ | 0.35.0 | — |
| git | repo (already initialized) | ✓ | 2.50.1 | — |
| gh CLI | GitHub repo creation | ✗ | — | Create repo via github.com UI; or `npx vercel` direct deploy |
| Vercel CLI | deploy/env management | ✗ | — | Vercel Git integration (dashboard) — recommended; or `npx vercel` (no global install) |
| Neon account/project | hosted Postgres | unknown (external service) | — | Created during execution at console.neon.tech (free, no card) |
| Vercel account | hosting | unknown (external service) | — | Created during execution (free Hobby) |

**Missing dependencies with no fallback:** none.
**Missing dependencies with fallback:** pnpm (corepack, one command), gh (web UI), Vercel CLI (git integration / npx). Plan should include a pnpm-activation step and must not assume `gh` or `vercel` binaries exist.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 (greenfield — nothing installed yet) |
| Config file | none — see Wave 0 (`vitest.config.ts`) |
| Quick run command | `pnpm vitest run <file>` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMP-01 | Competitor create input validation (name required, ≥1 URL, kind enum, scheme allowlist, internal-host rejection) | unit | `pnpm vitest run tests/validation.test.ts` | ❌ Wave 0 |
| COMP-01 | Add competitor persists competitor + typed sources end-to-end | manual-only (justification: requires live Neon + deployed app; walking-skeleton success criterion is inherently E2E on the public URL) | checklist: add on public URL → row visible after reload | — |
| COMP-02 | Edit/remove competitor and URLs; delete cascades sources | unit (schema: cascade config asserted) + manual on deployed URL | `pnpm vitest run tests/schema.test.ts` | ❌ Wave 0 |
| — (SC4) | Data persists across redeploys; full 5-table schema exists in Neon | manual-only: `drizzle-kit push` output lists all 5 tables + 3 enums; redeploy → data intact | checklist | — |

Optional (planner discretion): DB integration tests against a Neon branch or `@electric-sql/pglite` in-memory Postgres — flagged as nice-to-have, not required for a walking skeleton. If added, verify pglite legitimacy first (not audited this session).

### Sampling Rate
- **Per task commit:** `pnpm vitest run` (suite is tiny this phase, <5s)
- **Per wave merge:** `pnpm vitest run` + `pnpm build` (catches prerender/type errors that break Vercel deploys)
- **Phase gate:** full suite green + `pnpm build` green + manual checklist on the deployed URL before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — minimal node-environment config
- [ ] `tests/validation.test.ts` — covers COMP-01 input rules (zod schemas exported from actions module or a shared `lib/validation.ts`)
- [ ] `tests/schema.test.ts` — asserts enum values and cascade config (covers COMP-02 delete semantics at schema level)
- [ ] Framework install: `pnpm add -D vitest@4.1.9`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (explicit project out-of-scope: single-user portfolio demo) | Documented accepted risk; see threat table |
| V3 Session Management | no | n/a — no sessions |
| V4 Access Control | partially | No auth by design; Server Actions are publicly invocable POST endpoints — accepted for v1, noted for planner (optional cheap mitigation: admin-secret cookie gate, deferrable) |
| V5 Input Validation | yes | zod 4 in every Server Action: name length caps, URL format, scheme allowlist (http/https), internal-host denylist |
| V6 Cryptography | no | n/a this phase (no secrets beyond DATABASE_URL env var) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL injection | Tampering | Drizzle parameterized queries only; no raw SQL string interpolation |
| SSRF-by-stored-URL (Phase 2 fetches Phase 1's URLs) | Tampering/Info Disclosure | Validate at input: http/https only, reject localhost/link-local/metadata IPs (Code Example 3) |
| Public mutation endpoints (no auth) | Elevation of Privilege | Accepted risk per requirements ("Auth out of scope"); server-side zod validation limits abuse surface; document in README |
| Stored XSS via competitor name/URL rendered in UI | Tampering | React escapes by default; never `dangerouslySetInnerHTML`; length caps on inputs |
| Secret leakage (DATABASE_URL) | Info Disclosure | Server-only modules (`lib/db` imported only from server code); `.env*` gitignored; env vars in Vercel dashboard only |

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view <pkg> version|time.modified|repository.url|scripts.postinstall`, 2026-07-03) — all versions, ages, repos, postinstall absence
- https://nextjs.org/docs/app/api-reference/cli/create-next-app (v16.2.10) — full flag list, defaults (TS/Tailwind/Turbopack/agents-md default on)
- https://nextjs.org/docs/app/getting-started/mutating-data (v16.2.10, lastUpdated 2026-06-23) — Server Functions/Actions patterns, useActionState, revalidatePath, refresh(), security warning
- https://orm.drizzle.team/docs/get-started/neon-new — connection setup, drizzle.config.ts, push workflow (noting its `@rc` install advice is overridden by project decision)
- https://neon.com/docs/connect/choose-connection — pooled vs direct vs HTTP driver rules; migrations require direct
- https://neon.com/pricing (fetched 2026-07-03) — free-tier limits (upgrades prior MEDIUM item to HIGH)
- https://neon.com/docs/guides/vercel-managed-integration — integration env vars (DATABASE_URL / DATABASE_URL_UNPOOLED), preview-branch gotchas
- https://ui.shadcn.com/docs/tailwind-v4 + /docs/installation/next — Tailwind 4 + React 19 support confirmed; init/add commands
- Local environment probes (2026-07-03) — Node 24.18, npm 11.16, corepack 0.35, git 2.50.1; pnpm/gh/vercel absent

### Secondary (MEDIUM confidence)
- Project research docs (.planning/research/STACK.md, ARCHITECTURE.md, PITFALLS.md, researched 2026-07-02) — schema shape, project structure, pitfall context; themselves verified against official sources at research time

### Tertiary (LOW confidence)
- create-next-app non-empty-directory allowlist behavior (A2) — training knowledge, not re-tested this session
- Neon cold-start latency magnitude (A4) — training knowledge

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version re-verified against npm registry 2026-07-03; zero drift from project STACK.md
- Architecture: HIGH — Server Actions and Drizzle/Neon patterns copied from current official docs; schema derived from project ARCHITECTURE.md + explicit phase success criteria
- Pitfalls: HIGH for platform-limit and connection-string pitfalls (official docs); MEDIUM for scaffold-conflict pitfall (assumed CLI behavior, safe workaround either way)
- Package legitimacy: ASSUMED across the board (slopcheck unavailable) with strong manual signals — planner gates installs behind one consolidated human-verify checkpoint

**Research date:** 2026-07-03
**Valid until:** ~2026-08-03 (stable ecosystem; re-check only if Next 17 or drizzle 1.0 GA lands)
