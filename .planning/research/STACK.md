# Stack Research

**Domain:** AI-native competitive intelligence web app (scheduled scraping + change detection + LLM analysis + dashboard)
**Researched:** 2026-07-02
**Confidence:** HIGH (versions verified against npm registry and official docs on 2026-07-02)

## Summary Recommendation

**Next.js 16 on Vercel (dashboard + API) · Neon Postgres + Drizzle (data) · GitHub Actions cron running a TypeScript worker (scraping pipeline) · fetch + cheerio + turndown (scraping/normalization) · SHA-256 hash + jsdiff (change detection) · Gemini 2.5 Flash via Vercel AI SDK (analysis) · Tailwind 4 + shadcn/ui (UI).**

Total cost: **$0/mo** at this scale (well under the ~$10/mo budget). Every component has a free tier that comfortably covers 3–5 competitors polled daily.

The one non-obvious decision: **the scraping/analysis pipeline runs as a script in GitHub Actions on a cron schedule, not as a Vercel cron-triggered function.** Vercel Hobby limits functions to 60s max duration and crons to once/day with imprecise timing. A GitHub Actions job has no meaningful time limit, free minutes cover it easily, and it runs the same TypeScript codebase against the same Neon database. This is the standard free-tier pattern for scrape-and-store projects.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js (App Router) | 16.2.10 | Dashboard UI + API routes + competitor CRUD | The default 2026 choice for a React dashboard deployed to a public URL. Server Components fit a read-heavy feed perfectly (fetch from Postgres, render on server, no client data-fetching layer needed). Turbopack is now the default bundler. Requires Node 20+. |
| TypeScript | 5.x (latest) | Language everywhere | One language across web app, scraping worker, and DB schema. Non-negotiable for a shared codebase between Vercel and GitHub Actions. |
| Neon Postgres | free tier | Primary database | Serverless Postgres with scale-to-zero that **stays reachable** (unlike Supabase, which pauses free projects after 1 week of inactivity — fatal for a live demo). HTTP driver (`@neondatabase/serverless` 1.1.0) works identically from Vercel functions and GitHub Actions. Free tier: 0.5 GB storage, 100 CU-hours/mo — orders of magnitude more than this app needs. |
| Drizzle ORM | 0.45.2 (stable) | Type-safe DB access + migrations | The standard lightweight TypeScript ORM in 2026. No engine binary, works in serverless and in plain Node scripts, schema-as-code feeds `drizzle-kit` (0.31.10) migrations. Use the stable 0.45.x line, **not** the 1.0.0-rc, for a project you want to finish. |
| GitHub Actions (scheduled workflow) | n/a | Cron scheduler for the monitoring pipeline | Free (unlimited minutes on public repos; ~150 min/mo of a 2000 min/mo allowance if private). No function timeout, so scrape → diff → LLM analysis for all competitors runs in one sequential job. Runs `tsx scripts/monitor.ts` from the same repo. |
| Vercel AI SDK (`ai`) | 7.0.14 | LLM calls with structured output | Provider-agnostic, and `generateObject` with a Zod schema gives you typed, validated LLM output (change classification, significance, summary) instead of hand-parsed JSON. Pair with `@ai-sdk/google` 4.0.8. Requires Node 22+. |
| Gemini 2.5 Flash | API (model: `gemini-2.5-flash`) | Change analysis + digest generation | Best price-performance workhorse with a genuinely free API tier (no credit card). At ~10–50 requests/day this app never leaves the free tier. Fallback to `gemini-2.5-flash-lite` if rate limits pinch. Caveat: free-tier prompts may be used to improve Google's models — acceptable for public web page content. |
| Tailwind CSS | 4.3.2 | Styling | Standard. v4 has zero-config CSS-first setup with Next.js 16. |
| shadcn/ui | latest (CLI) | Dashboard components | Copy-in components (cards, tables, badges, tabs) — exactly what a feed + profile pages + digest UI needs, with no runtime dependency lock-in. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cheerio | 1.2.0 | Parse fetched HTML, extract the content region (e.g., the changelog list) | Every scrape of a server-rendered page. 10x faster and infinitely cheaper than a headless browser. |
| turndown | 7.2.4 | Convert extracted HTML → Markdown | Normalization step before hashing/diffing. Markdown strips volatile markup (class names, script tags, tracking params) so diffs reflect *content* changes, not template churn. |
| diff (jsdiff) | 9.0.0 | Line/word-level diff of old vs new normalized content | When the content hash changes, produce the actual diff to feed the LLM ("here is what changed"). Far better LLM results than sending two full page snapshots. |
| zod | 4.4.3 | Schemas for LLM structured output + form/API validation | Define the analysis shape once (`{ changeType, summary, significance, whyItMatters }`) and reuse for `generateObject` and the DB layer. AI SDK 7 supports Zod 4. |
| @neondatabase/serverless | 1.1.0 | Postgres driver over HTTP/WebSockets | Use with `drizzle-orm/neon-http`. Works in Vercel functions and GitHub Actions without connection pooling headaches. |
| tsx | latest | Run TypeScript scripts directly | Runs `scripts/monitor.ts` in the GitHub Actions job without a build step. |
| Jina Reader (`https://r.jina.ai/{url}`) | hosted API | Fetch JS-rendered pages as clean Markdown | Fallback only, for competitor pages that render client-side (some pricing pages). Free: 20 RPM keyless, 500 RPM with a free API key. At 3–5 competitors/day you will never pay. Store a per-URL flag: `fetchStrategy: 'direct' \| 'jina'`. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| pnpm | Package manager | Fast, standard in 2026; works in GitHub Actions with `pnpm/action-setup`. |
| drizzle-kit | Schema migrations | `drizzle-kit push` for early iteration; switch to `generate`/`migrate` once the schema stabilizes. |
| ESLint 9 + Prettier | Lint/format | Ships with `create-next-app`. |
| Vercel CLI | Deploy + env management | `vercel env pull` keeps local `.env` in sync; the GitHub Actions job gets `DATABASE_URL` and `GOOGLE_GENERATIVE_AI_API_KEY` as repo secrets. |

## Installation

```bash
# Scaffold (choose TypeScript, Tailwind, App Router)
pnpm create next-app@latest productpulse

# Data layer
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit

# Scraping + change detection
pnpm add cheerio turndown diff
pnpm add -D @types/turndown

# LLM
pnpm add ai @ai-sdk/google zod

# Worker runner
pnpm add -D tsx

# UI components
pnpm dlx shadcn@latest init
```

## How the Pieces Fit (stack-level architecture)

```
GitHub Actions (cron, e.g. daily 09:00 UTC)
  └─ tsx scripts/monitor.ts
       1. Load competitors + URLs from Neon
       2. fetch() page → cheerio extract → turndown normalize
          (or Jina Reader for JS-rendered URLs)
       3. SHA-256 hash vs stored hash → skip if unchanged (zero LLM cost)
       4. jsdiff old vs new snapshot → diff text
       5. Gemini 2.5 Flash via generateObject:
          noise filter + summary + "why it matters" + significance
       6. Insert change event into Neon

Vercel (Next.js 16, Hobby plan)
  └─ Server Components read Neon directly
       /            → intelligence feed
       /competitors/[id] → profile: timeline + pricing history
       /digest      → AI digest (generated in the Actions job weekly, stored in DB)
       /settings    → competitor/URL CRUD (server actions)
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| GitHub Actions cron worker | Vercel Cron → API route | If the whole pipeline provably fits in 60s (Hobby max duration) and once/day imprecise timing is fine. Simpler mental model, but you'll fight the timeout the moment one page is slow or you add a competitor. |
| GitHub Actions cron worker | Inngest / Trigger.dev free tiers | If you want retries, step functions, and run observability out of the box. More moving parts and another vendor; overkill for 5 URLs/day, but the "grown-up" path if this becomes a product. |
| Neon Postgres | Turso (libSQL) | If you prefer SQLite semantics; generous free tier (5 GB). Postgres is the safer default — better Drizzle support maturity and standard SQL for timeline queries. |
| Neon Postgres | Supabase | If you later want auth + storage + realtime in one platform. Its free-tier project pausing after 1 week of inactivity is disqualifying for an always-up demo. |
| Gemini 2.5 Flash (free) | OpenAI gpt-4o-mini / gpt-5-mini | If you already have OpenAI credits. Costs real (tiny) money; Gemini's free tier makes it strictly cheaper here. AI SDK makes swapping a one-line change. |
| cheerio + fetch | Firecrawl API | If many targets turn out to be aggressively bot-protected. Free tier is ~1,000 credits (1 page = 1 credit), so daily polling of 10 URLs ≈ 300/mo — viable but a hard dependency on a third party for the core loop. |
| shadcn/ui | Plain Tailwind | If you want fewer abstractions. shadcn just accelerates the feed/card/table UI. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Playwright / Puppeteer in the pipeline | Headless Chromium is slow, heavy (~300 MB), and painful on serverless; unnecessary for mostly server-rendered changelog/pricing pages | fetch + cheerio; Jina Reader for the rare JS-rendered target |
| Vercel Cron as the pipeline trigger | Hobby: 60s max function duration, once/day only, fires anytime within the hour. Scrape + multiple LLM calls will eventually blow the timeout | GitHub Actions scheduled workflow |
| Supabase free tier | Pauses projects after 1 week of inactivity (policy tightened Feb 2026); a paused demo is a dead demo | Neon (scale-to-zero but always reachable) |
| LangChain / LlamaIndex | Heavy abstraction for what is 2–3 direct structured-output LLM calls; adds dependency churn without value | Vercel AI SDK `generateObject` + Zod |
| Prisma | Engine/runtime weight and slower cold starts in serverless vs Drizzle; Drizzle is the 2026 default for this shape | Drizzle ORM 0.45.x |
| Redis + BullMQ (job queue) | Requires a persistent Redis instance ($) and adds infra for a workload of ~10 sequential tasks/day | Sequential loop in the Actions job |
| drizzle-orm@1.0.0-rc | Release candidate with breaking migration-handling changes; risk without benefit for a new project | 0.45.2 stable |
| Raw HTML diffing (no normalization) | Class-name/script/attribute churn produces constant false-positive "changes," flooding the LLM and the feed with noise | Extract content region (cheerio) → Markdown (turndown) → hash → diff |
| MongoDB | The data (competitors, snapshots, change events, timelines) is relational; Postgres timeline queries are trivial | Neon Postgres |

## Stack Patterns by Variant

**If a competitor page is client-rendered (empty body from `fetch`):**
- Flag that URL with `fetchStrategy: 'jina'` and fetch `https://r.jina.ai/{url}` (returns Markdown directly — skip cheerio/turndown for these).
- Because running a browser yourself is the single biggest complexity/cost trap in this project.

**If Gemini free-tier rate limits or the data-training caveat become a problem:**
- Swap to `gemini-2.5-flash-lite` (higher free RPD, cheaper paid: ~$0.10/$0.40 per 1M tokens) or enable billing — estimated real usage is pennies/month.
- Because the AI SDK abstraction makes the model a config string, not an architecture decision.

**If the repo must be private:**
- GitHub Actions free allowance is 2,000 min/mo; a daily ~5-min job uses ~150 min/mo. Still free.

**If you later add multi-user/auth (out of scope for v1):**
- Neon Auth (bundled, 60K MAU free) or Better Auth on the same Postgres. No stack change required — a reason to prefer Neon now.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| next@16.2.10 | Node 20+ (Vercel default 22) | Next 16 raised the Node minimum to 20; Turbopack default |
| ai@7.0.14 | @ai-sdk/google@4.0.8, zod@4.x | AI SDK 7 requires Node 22+; provider major versions track the SDK major — install both fresh, don't mix v7 SDK with v2/v3 providers |
| drizzle-orm@0.45.2 | drizzle-kit@0.31.10, @neondatabase/serverless@1.1.0 | Use `drizzle-orm/neon-http` adapter |
| tailwindcss@4.3.2 | next@16 via `@tailwindcss/postcss` | `create-next-app` wires this automatically |
| tsx (GitHub Actions) | Node 22 runner (`actions/setup-node@v4`, `node-version: 22`) | Match Vercel's runtime to avoid drift |

## Cost Ledger (verify against budget)

| Component | Plan | Monthly Cost |
|-----------|------|--------------|
| Vercel Hobby (hosting) | Free | $0 |
| Neon Postgres | Free tier | $0 |
| GitHub Actions (scheduler/worker) | Free tier | $0 |
| Gemini API (2.5 Flash) | Free tier | $0 |
| Jina Reader (fallback fetches) | Free key | $0 |
| **Total** | | **$0** (budget: <$10) |

## Confidence Assessment

| Claim | Confidence | Basis |
|-------|------------|-------|
| All package versions | HIGH | npm registry queried directly 2026-07-02 |
| Vercel Hobby: 60s function max, daily-only cron | HIGH | Vercel official docs (limits, cron usage-and-pricing) |
| Neon free tier reachability vs Supabase pausing | MEDIUM | Multiple 2026 comparison sources agree; re-verify Neon limits at build time on neon.com/pricing |
| Gemini 2.5 Flash free tier exact RPD (sources cite 250–1,500 RPD) | MEDIUM | Third-party sources conflict; irrelevant at ~10–50 req/day but confirm at ai.google.dev/pricing when wiring up |
| Jina Reader free limits (20 RPM keyless / 500 RPM keyed) | MEDIUM | Multiple secondary sources; trivially sufficient either way |
| cheerio-over-Playwright for this workload | HIGH | Consistent across 2026 ecosystem guidance; matches infrequently-changing, mostly server-rendered targets |

## Sources

- npm registry (`npm view <pkg> version`, 2026-07-02) — next 16.2.10, ai 7.0.14, @ai-sdk/google 4.0.8, drizzle-orm 0.45.2, drizzle-kit 0.31.10, cheerio 1.2.0, turndown 7.2.4, diff 9.0.0, tailwindcss 4.3.2, zod 4.4.3, @neondatabase/serverless 1.1.0 — HIGH
- https://vercel.com/docs/cron-jobs/usage-and-pricing + https://vercel.com/docs/functions/limitations — Hobby cron daily-only, 60s max duration — HIGH
- https://ai.google.dev/gemini-api/docs/models — current Gemini lineup (2.5 Flash / Flash-Lite stable; 3.x preview), fetched 2026-07-02 — HIGH
- https://nextjs.org/blog + endoflife.date/nextjs — Next 16 stable since Oct 2025, Turbopack default, Node 20 minimum — HIGH
- https://orm.drizzle.team/docs/latest-releases — 0.45.x stable, 1.0.0-rc status — HIGH
- agentdeals.dev / buildmvpfast.com free-tier comparisons (Neon vs Supabase vs Turso, 2026) — Supabase pause policy, Neon/Turso limits — MEDIUM
- tokenmix.ai / costbench.com Gemini free-tier guides (2026) — free RPD figures (conflicting) — LOW-MEDIUM
- blog.apify.com + use-apify.com Jina vs Firecrawl comparisons (2026) — Jina 20/500 RPM free, Firecrawl ~1,000 free credits — MEDIUM

---
*Stack research for: AI-native competitive intelligence app (ProductPulse)*
*Researched: 2026-07-02*
