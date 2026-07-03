# Project Research Summary

**Project:** ProductPulse
**Domain:** AI-native competitive intelligence (scheduled scraping + change detection + LLM analysis + dashboard)
**Researched:** 2026-07-02
**Confidence:** HIGH

## Executive Summary

ProductPulse is a "poll pages, detect changes, explain them, show a feed" application — a shape with a well-established five-stage pipeline that every serious tool in the category converges on: **capture → normalize → compare → classify → report**. The AI-native twist is that classification is an LLM call instead of regex rules, and the report is an insight feed instead of raw diff emails. At this scale (3–5 competitors, ~6–10 URLs, daily polling, single user), experts build this as a **modular monolith**: one Next.js app containing the dashboard, the API, and the pipeline as a pure library module, sharing one Postgres database. No queues, no workers, no microservices.

The recommended approach: Next.js 16 on Vercel (Hobby) for the dashboard, Neon Postgres + Drizzle for data, fetch + cheerio + turndown for scraping/normalization, SHA-256 hash gate + jsdiff for change detection, and Gemini 2.5 Flash via the Vercel AI SDK (`generateObject` + Zod) for analysis. The scheduled pipeline runs as a **GitHub Actions cron job** executing the same TypeScript pipeline module — avoiding Vercel Hobby's function-duration and once-daily-cron limits — while a secret-protected route powers a "Check now" button that exercises the identical code path for demos and debugging. Total cost: **$0/mo** against a <$10/mo budget. Market research confirms the differentiation thesis: raw change detection with AI summaries is now table stakes (Visualping ships it free); the winning surface is analysis depth ("why it matters," significance scoring, cross-competitor digest) and product-signal-specific structure (feature timelines, structured pricing history).

The two highest-stakes risks are **noise** and **credibility**. Diffing raw HTML floods the feed with false positives and burns LLM budget — prevention is extract-then-diff (content region → normalized Markdown → hash → diff) plus an LLM noise gate, proven by a multi-day soak test before building UI on top. Hallucinated insights (wrong prices, invented features) would destroy a competitive-intelligence product's trust in one demo — prevention is structured output, verbatim-quoting prompt rules, and always showing the underlying diff as evidence next to every AI claim. A third, portfolio-specific risk: nothing changes during the demo window — mitigated by backfilling existing changelog entries on competitor add (real, dated data, not fake), picking fast-shipping competitors, and the "Check now" live trigger.

## Key Findings

### Recommended Stack

One TypeScript codebase serves both the Vercel-deployed dashboard and the GitHub Actions pipeline worker, sharing the Neon database via the HTTP driver. Every component has a free tier that comfortably covers this scale. All package versions were verified against the npm registry on 2026-07-02. Full details in `STACK.md`.

**Core technologies:**
- **Next.js 16.2.10 (App Router)**: Dashboard + API + competitor CRUD — Server Components fit a read-heavy feed; default 2026 choice
- **Neon Postgres + Drizzle 0.45.2 (stable, not 1.0-rc)**: Data layer — serverless Postgres that stays reachable (Supabase pauses free projects after 1 week — disqualifying for a live demo)
- **GitHub Actions scheduled workflow**: Pipeline cron — no function timeout, free minutes, runs `tsx scripts/monitor.ts` against the same DB
- **cheerio + turndown + jsdiff**: Extract content region → normalize to Markdown → diff — 10x cheaper than a headless browser; Jina Reader as per-URL fallback for JS-rendered pages
- **Gemini 2.5 Flash via Vercel AI SDK 7 (`generateObject` + Zod 4)**: Typed, validated LLM analysis — genuinely free API tier; model is a config string, trivially swappable
- **Tailwind 4 + shadcn/ui**: Feed cards, tables, badges — copy-in components, no lock-in

**Explicitly avoid:** Playwright/Puppeteer in the pipeline, Vercel Cron as the pipeline trigger, Supabase free tier, LangChain, Prisma, Redis/BullMQ, raw HTML diffing, MongoDB.

### Expected Features

The market splits into enterprise CI suites (Crayon/Klue, $20–40K/yr), generic change-detection tools (Visualping — AI summaries now free-tier table stakes), and niche AI-native trackers (Trackmore is the closest analog). Differentiation lives in analysis depth and structured product signals, not detection. Full landscape in `FEATURES.md`.

**Must have (table stakes):**
- Competitor management (add competitor + typed URLs: changelog | pricing)
- Daily scheduled monitoring with stored snapshots
- Text-based change detection + noise filtering (the category's #1 failure mode)
- Before/after evidence (diff excerpt + source link) on every item
- Chronological intelligence feed with competitor/type filters
- Per-change AI summary with timestamps and source links

**Should have (differentiators):**
- "Why it matters" significance analysis per change — the core demo moment
- AI significance scoring (high/med/low) driving feed badges and digest inclusion
- LLM-based semantic noise gate, on by default, zero user configuration
- Change-type classification (feature launch / pricing change / removal / other)
- Per-competitor feature launch timeline
- AI cross-competitor periodic digest (sequence last — needs accumulated data)

**Defer (v1.x / v2+):**
- Structured pricing extraction + pricing history timeline (highest wow-factor, hardest feature — after changelog loop is proven)
- URL auto-discovery from bare domain; email digest delivery; cross-competitor pattern callouts
- Anti-features (never): broad multi-source monitoring, battlecards, real-time polling, pixel diffs, user-configured CSS selectors, auth/teams, integrations

### Architecture Approach

Single deployable Next.js app with the pipeline as a **pure library module** (`lib/pipeline/`) callable from any trigger — GitHub Actions cron, a secret-protected route, a dashboard "Check now" button, or a local script. Identical code path everywhere: what you demo is what runs nightly. Data model: `competitors 1—* sources 1—* snapshots`, with `changes` rows carrying the diff plus inline LLM fields (1:1, no separate insights table), and standalone `digests`. Sources — not competitors — are the unit of monitoring; source `kind` drives extraction hints and prompt framing. Full details in `ARCHITECTURE.md`.

**Major components:**
1. **Fetcher + Extractor** — HTTP fetch with validation (status, challenge-page fingerprints, min content length); HTML → clean normalized Markdown of the content region only
2. **Hash gate + Differ** — SHA-256 of normalized text vs. last snapshot; only on mismatch, produce a unified text diff (the LLM cost firewall — LLM spend scales with actual changes, not polls)
3. **LLM analyst** — one structured-output call per detected change: `{is_meaningful, category, summary, why_it_matters, significance}`
4. **Data layer (Neon Postgres)** — competitors, sources, snapshots, changes, digests; per-source health status (`last_checked`, `last_status`)
5. **Dashboard (server-rendered)** — feed (money screen), competitor profiles, digest view, competitor management with health indicators

**Key patterns:** extract-then-diff (never diff raw HTML); hash gate before LLM; per-source error isolation with idempotent runs; prompts versioned in a separate module.

### Critical Pitfalls

Top 5 of 9 identified (full list with warning signs and recovery strategies in `PITFALLS.md`):

1. **Raw-HTML diffing drowns the feed in false positives** — extract content region → normalize → hash/diff text only; verify with a multi-day soak test (zero false positives on unchanged real pages) before building the AI layer
2. **Static fetch fails silently on JS-rendered changelogs** — curl-vet every target URL before committing; per-URL fetch strategy (`direct` | `jina`); reject suspiciously-empty extractions as errors, never baselines; prefer RSS/JSON feeds where they exist
3. **Hallucinated insights destroy credibility** — structured output with enums, quote-verbatim prompt rules, explicit "minor/unclear" permitted, and always show the diff as evidence next to every insight
4. **LLM cost blowout** — LLM only fires on hash-gate triggers; send diffs not pages; token logging and monthly caps from day one; cache analyses by content hash
5. **Nothing changes during the demo window** — backfill existing changelog entries on competitor add (with `published_at` vs `detected_at` separated in the schema); pick fast-shipping competitors; "Check now" button for live demos

Also notable: bot detection (validate fetches, never store challenge pages, swap blocked targets rather than bypass), silent scraper staleness (per-URL health model surfaced in UI), free-tier runtime limits (drives the GitHub Actions decision), and legal politeness (robots.txt, daily polling, excerpts not mirrors).

## Implications for Roadmap

Research converges on a dependency-driven build order: everything downstream (feed, profiles, digest) is a view over the same store of analyzed change events, so detection quality must be proven before any UI polish. The riskiest unknowns — per-target extraction quality and LLM insight quality — get validated earliest, with real data at every step.

### Phase 1: Foundation, Data Model & Competitor Management
**Rationale:** Everything depends on the schema; deploying to a public URL on day one surfaces platform constraints early (Pitfall 6 says stack limits must drive decisions, not be discovered later).
**Delivers:** Deployed Next.js 16 skeleton on Vercel; Drizzle schema (competitors, sources, snapshots, changes, digests — including `published_at`/`detected_at` and per-source health fields); competitor/source CRUD.
**Addresses:** Competitor management (table stakes, entry point for everything).
**Avoids:** Free-tier limit surprises (P6); wrong-timestamp debt (schema decision now, not retrofit).

### Phase 2: Scraping Pipeline & Snapshots (manual trigger only)
**Rationale:** Extraction quality against the actual 3–5 targets is the highest-uncertainty component; validate it with real pages before diffing or LLM work exists. Includes a target-vetting spike: curl-test every candidate URL, choose scrapeable competitors, flag JS-rendered URLs for the Jina fallback.
**Delivers:** fetch → extract (cheerio + turndown) → normalize → snapshot, behind a "Check now" button; fetch validation (status, challenge fingerprints, min-length); per-source health states; backfill of existing changelog entries on competitor add.
**Uses:** cheerio, turndown, Jina Reader fallback, Neon HTTP driver.
**Avoids:** JS-rendered silent failure (P2), bot-detection baselines (P3), silent staleness (P8), empty demo feed (P7 — backfill), legal missteps (P9 — robots.txt, UA, polite polling).

### Phase 3: Change Detection (hash gate + diff)
**Rationale:** The deterministic core the entire product stands on; must be proven noise-free before the LLM layer, or every downstream surface degrades simultaneously.
**Delivers:** SHA-256 hash gate, jsdiff unified diffs, stored change records; **multi-day soak test against real targets with zero false positives as the phase's exit criterion**.
**Implements:** Hash gate + differ components; extract-then-diff pattern.
**Avoids:** Raw-HTML noise (P1 — the category's #1 failure mode).

### Phase 4: AI Analysis (noise gate + structured insights)
**Rationale:** The differentiator and demo centerpiece; depends on trustworthy diffs from Phase 3. Prompt iteration is the highest-churn work — keep prompts versioned and raw diffs visible to judge quality.
**Delivers:** LLM noise gate + analysis via `generateObject` (`is_meaningful`, category, summary, why-it-matters, significance); token logging, per-run/per-month call caps, analysis caching by content hash; backfilled entries analyzed.
**Uses:** Vercel AI SDK 7 + Gemini 2.5 Flash + Zod schemas.
**Avoids:** Cost blowout (P4 — instrumentation is part of definition-of-done), hallucination (P5 — schema constraints + verbatim-quote rules).

### Phase 5: Intelligence Feed & Scheduling
**Rationale:** The money screen, built only once the data feeding it is trustworthy; then wire the scheduler to the already-proven manual code path.
**Delivers:** Chronological feed with competitor/type filters, significance badges, evidence (diff excerpt + source link + dates) on every item; GitHub Actions daily cron running the pipeline; run heartbeat records; verification that fetches succeed from production/CI IPs for a full week.
**Addresses:** Feed + filtering (table stakes), significance-driven sorting (differentiator).
**Avoids:** Evidence-free insights (P5 UI half), silent cron death (P6), bot-detection from datacenter IPs (P3 deployment half).

### Phase 6: Competitor Profiles & AI Digest
**Rationale:** Pure read models plus one more LLM prompt over accumulated `changes` data; deliberately last because they need real accumulated data to look good — a digest over an empty week is embarrassing.
**Delivers:** Profile pages (feature timeline, pricing changes as events, health indicators); AI-written periodic digest generated in the Actions job and stored; polished empty/error states; demo-readiness checklist (cold-start check, fresh-deploy-to-populated-feed flow).
**Addresses:** Profiles + digest (final v1 requirements from PROJECT.md).

**v1.x (post-roadmap candidates, not phases):** structured pricing extraction + history timeline (second wow-feature; hardest), URL auto-discovery, email digest.

### Phase Ordering Rationale

- **Detection quality gates everything:** feed, profiles, and digest are all views over analyzed change events (FEATURES dependency graph), so pipeline phases (2–4) precede all presentation phases (5–6).
- **Riskiest unknowns first:** extraction quality (Phase 2) and LLM insight quality (Phase 4) are validated with real data before UI is built on them (ARCHITECTURE build order).
- **Cron comes late by design:** the manual "Check now" trigger exercises the identical pipeline function, so scheduling is a wiring task, not a milestone — and the manual path is itself a demo requirement (P7) and anti-pattern avoidance (cron-only pipelines make development miserable).
- **Digest last:** requires accumulated real data; sequencing it after weeks of live tracking means the demo shows a genuine synthesis, not a thin one.
- **Cost control is structural, not additive:** the hash gate (Phase 3) and noise gate + caps (Phase 4) are the budget mechanism, ordered before the always-on scheduler (Phase 5) can spend anything.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Scraping):** Target-specific — each chosen competitor's changelog/pricing page needs verification (server-rendered? RSS/JSON feed available? bot-protected?). Extraction technique confidence is MEDIUM; plan a vetting spike with real URLs.
- **Phase 4 (AI Analysis):** Prompt design for calibrated significance scoring and hallucination-resistant summaries is empirical, prompt-sensitive work; also confirm current Gemini free-tier rate limits (sources conflicted: 250–1,500 RPD) at ai.google.dev/pricing when wiring up.

Phases with standard patterns (skip research-phase):
- **Phase 1:** create-next-app + Drizzle + Neon is thoroughly documented boilerplate.
- **Phase 3:** hash + jsdiff is deterministic, well-understood; the work is testing, not research.
- **Phase 5:** GitHub Actions cron + shadcn feed UI are established patterns.
- **Phase 6:** pure read models + one LLM prompt; reuses Phase 4 learnings.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry 2026-07-02; Vercel limits from official docs; Neon-vs-Supabase and Gemini rate-limit specifics MEDIUM (re-verify at build time) |
| Features | MEDIUM-HIGH | Crayon and Trackmore fetched directly; Visualping/Klue/others corroborated across multiple independent sources; some vendor-authored comparisons |
| Architecture | HIGH | Pipeline pattern and platform limits verified against official docs; specific extraction techniques MEDIUM (community consensus) |
| Pitfalls | HIGH | Scraping/change-detection/free-tier pitfalls verified against multiple current sources incl. changedetection.io issue tracker; demo-readiness mitigations MEDIUM (first-principles) |

**Overall confidence:** HIGH

### Gaps to Address

- **Vercel Hobby function duration discrepancy:** STACK cites 60s max; ARCHITECTURE cites 300s. Resolved architecturally — the pipeline-as-library pattern makes the runner swappable, and the recommendation stands on GitHub Actions cron (no timeout risk either way, plus better cron precision). Verify current Hobby limits only if reconsidering Vercel Cron.
- **Backfill scope reconciliation:** FEATURES lists "historical backfill" as an anti-feature (deep Wayback archive ETL); PITFALLS makes backfill-on-add the top demo mitigation. Resolution: backfill only the entries **visible on the current changelog page** (real, dated, already-fetched content) — no archive scraping. Roadmapper should scope Phase 2 backfill accordingly.
- **Gemini free-tier exact rate limits:** sources conflict (250–1,500 RPD); irrelevant at ~10–50 req/day but confirm at ai.google.dev/pricing during Phase 4. Free-tier data-training caveat is acceptable for public web content; flag in README.
- **Actual target scrapeability unknown until competitors are chosen:** competitor selection is a planning-time decision with engineering consequences (fetch strategy, demo cadence). Make target vetting an explicit Phase 2 entry task.
- **Neon free-tier limits:** MEDIUM-confidence secondary sources; re-verify at neon.com/pricing during Phase 1 setup.

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view`, 2026-07-02) — all recommended package versions
- Vercel official docs (cron usage/pricing, function limits/duration) — Hobby constraints driving the GitHub Actions decision
- ai.google.dev — Gemini model lineup and API docs
- nextjs.org/blog, orm.drizzle.team — Next 16 and Drizzle 0.45.x stability
- crayon.co, trackmore.io — fetched directly; closest enterprise and niche-analog feature sets
- changedetection.io GitHub + issue tracker — reference architecture and real-world noise failure modes
- hiQ v. LinkedIn (Ninth Circuit opinion) — public-page scraping legality baseline

### Secondary (MEDIUM confidence)
- Visualping, Unkover, Competitors.app, Kompyte/Klue comparisons — category table stakes and positioning
- Kite Metric / TrackSimple / dev.to change-detection guides — pipeline decomposition, noise sources, normalization strategies
- ScrapFly / ScrapeOps / Browserless — bot-detection mechanics
- 2026 free-tier comparisons (Neon vs Supabase vs Turso; Render limits) — platform selection
- LLM cost-optimization guides (CODERCOPS, Morph, Splunk) — tiered models, token accumulation, caching

### Tertiary (LOW confidence)
- Gemini free-tier RPD figures (tokenmix.ai, costbench.com) — conflicting; verify at build time
- Vercel Hobby cron bypass patterns (runhooks.app) — single source; only relevant if sub-daily polling ever wanted

---
*Research completed: 2026-07-02*
*Ready for roadmap: yes*
