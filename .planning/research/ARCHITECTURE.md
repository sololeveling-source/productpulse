# Architecture Research

**Domain:** AI-native competitive intelligence (scheduled scraping + change detection + LLM analysis + dashboard)
**Researched:** 2026-07-02
**Confidence:** HIGH (pipeline pattern, platform limits verified against official docs) / MEDIUM (specific extraction techniques, verified across multiple community sources)

## Standard Architecture

This shape of app — "poll pages, detect changes, explain them, show a feed" — has a well-established structure. Reference systems (changedetection.io, Visualping-class tools, competitor-monitoring workflows) all converge on the same five-stage pipeline: **capture → normalize → compare → classify → report**. The AI-native twist is that the classify stage is an LLM call instead of regex rules, and the report stage is an insight feed instead of raw diff emails.

At this project's scale (3–5 competitors, ~6–10 URLs, daily polling, single user), the correct architecture is a **single deployable web app (modular monolith) with a cron-triggered pipeline route** — not workers, not queues, not microservices. Everything lives in one Next.js-style app: the dashboard pages, the API, and the pipeline are the same deployment, sharing one database.

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  TRIGGER LAYER                                                    │
│  ┌──────────────────┐        ┌─────────────────────┐             │
│  │ Vercel Cron      │        │ Manual "Run Now"    │             │
│  │ (daily, Hobby)   │        │ button (dashboard)  │             │
│  └────────┬─────────┘        └─────────┬───────────┘             │
│           └────────────┬───────────────┘                          │
├────────────────────────┼──────────────────────────────────────────┤
│  PIPELINE (one protected API route / server action, per-source    │
│  loop with error isolation)                                       │
│                        ▼                                          │
│  ┌─────────┐  ┌───────────┐  ┌────────┐  ┌────────┐  ┌────────┐ │
│  │ Fetcher │→ │ Extractor │→ │ Hash   │→ │ Differ │→ │ LLM    │ │
│  │ (HTTP)  │  │ (HTML →   │  │ Gate   │  │ (text  │  │ Analyst│ │
│  │         │  │ clean md/ │  │ (skip  │  │ diff)  │  │ (class │ │
│  │         │  │ text)     │  │ if =)  │  │        │  │ +sum)  │ │
│  └─────────┘  └───────────┘  └────────┘  └────────┘  └────────┘ │
│       │             │             │            │           │      │
├───────┴─────────────┴─────────────┴────────────┴───────────┴──────┤
│  DATA LAYER (Postgres — Neon/Supabase free tier)                  │
│  ┌────────────┐ ┌─────────┐ ┌───────────┐ ┌─────────┐ ┌────────┐│
│  │ competitors│ │ sources │ │ snapshots │ │ changes │ │ digests││
│  └────────────┘ └─────────┘ └───────────┘ └─────────┘ └────────┘│
├───────────────────────────────────────────────────────────────────┤
│  PRESENTATION LAYER (same app — server-rendered pages)            │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐     │
│  │ Intelligence │  │ Competitor      │  │ Digest view      │     │
│  │ Feed (home)  │  │ Profiles        │  │ (periodic AI     │     │
│  │              │  │ (timeline +     │  │ summary)         │     │
│  │              │  │ pricing history)│  │                  │     │
│  └──────────────┘  └─────────────────┘  └──────────────────┘     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Competitor management (add/edit competitors + URLs)      │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Scheduler | Fire the pipeline on a cadence | Vercel Cron (once/day on Hobby — sufficient; pages change over days/weeks) hitting a secret-protected API route |
| Manual trigger | Same pipeline, on demand — essential for demos and debugging | Dashboard button → same route as cron |
| Fetcher | GET the page, handle timeouts/redirects/status codes; record HTTP status separately from content | Plain `fetch` with UA header; headless-browser fallback only if a target proves JS-rendered |
| Extractor | Convert raw HTML to stable, clean text/markdown of the *content region only* (strip nav, footer, scripts, tracking noise) | Readability-style extraction + HTML→markdown; this stage is the main defense against false positives |
| Hash gate | Cheap O(1) "did anything change?" check on the *extracted* text — the LLM cost firewall | SHA-256 of normalized text compared to latest snapshot's hash |
| Differ | Produce a human/LLM-readable unified diff between old and new extracted text | Line-based text diff (`diff` npm lib or similar); output stored on the change record |
| LLM analyst | Given the diff (+ surrounding context), decide meaningful-vs-noise, classify (feature launch / pricing change / other), summarize, and write "why it matters" | One structured-output LLM call per detected change; cheap model tier |
| Digest generator | Periodically summarize recent changes across all competitors | Separate LLM call over last N days of `changes` rows; runs after pipeline or on its own schedule |
| Snapshot store | Persist every fetched version (raw HTML optional, extracted text required, hash, timestamp, status) | Postgres text columns — at this scale, no blob storage needed |
| API / server layer | CRUD for competitors/sources, read models for feed/profile/digest | Server components + a few route handlers / server actions |
| Dashboard UI | Feed (primary screen), profiles, digest, competitor management | Server-rendered pages reading Postgres directly |

## Recommended Project Structure

```
src/
├── app/
│   ├── page.tsx                  # Intelligence feed (home / "money screen")
│   ├── competitors/
│   │   ├── page.tsx              # Competitor management (list/add/edit)
│   │   └── [id]/page.tsx         # Competitor profile (timeline + pricing history)
│   ├── digest/page.tsx           # Latest digest view
│   └── api/
│       ├── cron/monitor/route.ts # Pipeline entrypoint (cron + manual, secret-protected)
│       └── cron/digest/route.ts  # Digest generation entrypoint
├── lib/
│   ├── db/
│   │   ├── schema.ts             # competitors, sources, snapshots, changes, digests
│   │   └── queries.ts            # Read models for feed/profile/digest
│   ├── pipeline/
│   │   ├── run.ts                # Orchestrates per-source loop, error isolation
│   │   ├── fetch.ts              # HTTP fetch + status handling
│   │   ├── extract.ts            # HTML → clean text/markdown + normalization
│   │   ├── diff.ts               # Hash compare + text diff
│   │   └── analyze.ts            # LLM call: classify + summarize + significance
│   ├── llm/
│   │   ├── client.ts             # Provider client, model config
│   │   └── prompts.ts            # Change-analysis + digest prompts (versioned)
│   └── digest.ts                 # Digest assembly over recent changes
└── components/                   # Feed cards, timeline, pricing table, forms
```

### Structure Rationale

- **`lib/pipeline/` as a pure module:** the pipeline is ordinary functions callable from any trigger (cron route, manual button, local script, test). Never couple pipeline logic to the HTTP handler — this is what makes "run it locally against real pages" possible during development, before any scheduler exists.
- **One entrypoint for cron and manual runs:** the cron route just calls `pipeline/run.ts`. The dashboard "Run Now" button calls the same function. Identical code path = what you demo is what runs nightly.
- **`llm/prompts.ts` separated:** prompt iteration is the highest-churn part of this app; keep prompts out of pipeline control flow.

## Architectural Patterns

### Pattern 1: Extract-Then-Diff (normalize before comparing)

**What:** Never diff raw HTML. Fetch → extract main content → normalize (strip timestamps, tracking params, whitespace) → hash/diff the normalized text.
**When to use:** Always, for content-change monitoring. Raw HTML diffs are dominated by noise: rotated script hashes, session tokens, CSS class churn, ad slots.
**Trade-offs:** Extraction can occasionally drop real content if selectors/heuristics are wrong; mitigate by also storing raw HTML for the first few weeks so you can re-extract retroactively.

```typescript
// extract.ts
export function extractContent(html: string, source: Source): string {
  const article = readabilityExtract(html);        // main-content region
  const md = htmlToMarkdown(article);
  return md
    .replace(/\b\d{4}-\d{2}-\d{2}T[\d:.Z+-]+\b/g, "") // ISO timestamps
    .replace(/[?&]utm_[^&\s)]+/g, "")                  // tracking params
    .trim();
}
```

### Pattern 2: Hash Gate Before LLM (cost firewall)

**What:** Compare SHA-256 of extracted text against the previous snapshot. Only when hashes differ do you compute a diff and call the LLM. The LLM then makes the *meaningful vs. noise* call on the diff.
**When to use:** Any polling + LLM system where most polls find nothing (here: pages change every days/weeks, so ~90%+ of polls are no-ops).
**Trade-offs:** None at this scale. This is the single most important cost-control decision — it means LLM spend scales with *actual changes* (a few per week), not with polls.

```typescript
// diff.ts — the gate
const prev = await getLatestSnapshot(source.id);
const hash = sha256(extractedText);
if (prev?.contentHash === hash) return { changed: false }; // no snapshot row needed beyond checked_at
const snapshot = await saveSnapshot({ sourceId: source.id, contentHash: hash, extractedText });
const textDiff = unifiedDiff(prev?.extractedText ?? "", extractedText);
return { changed: true, snapshot, textDiff, prevSnapshot: prev };
```

### Pattern 3: LLM as Structured Classifier + Analyst (one call, JSON out)

**What:** One LLM call per detected change takes the diff plus light context (competitor name, source type changelog/pricing, page URL) and returns structured JSON: `{ is_meaningful, category, summary, why_it_matters, significance }`. Non-meaningful changes are stored but flagged, not surfaced in the feed.
**When to use:** This is the core "AI-native" mechanic — the LLM replaces brittle regex classification, which the ecosystem consistently identifies as "the hard part" of change monitoring.
**Trade-offs:** LLM judgment on significance is subjective and prompt-sensitive; store the raw diff alongside the insight so the feed can always show ground truth, and version your prompts.

```typescript
// analyze.ts
const analysis = await llm.generateObject({
  schema: z.object({
    is_meaningful: z.boolean(),
    category: z.enum(["feature_launch", "pricing_change", "removal", "other"]),
    summary: z.string(),
    why_it_matters: z.string(),
    significance: z.enum(["low", "medium", "high"]),
  }),
  prompt: changeAnalysisPrompt({ competitor, sourceType, textDiff }),
});
```

### Pattern 4: Per-Source Error Isolation, Idempotent Runs

**What:** The pipeline loops over sources; each source's fetch/extract/analyze is wrapped in its own try/catch with the outcome recorded (a `checked_at`/`last_status` on the source). One competitor's broken page never blocks the others. Runs are idempotent because the hash gate makes re-processing an unchanged page a no-op.
**When to use:** Always for multi-target scrapers. Target sites *will* intermittently 403/timeout/redesign.
**Trade-offs:** Requires visible per-source health status in the UI (a small "last checked / last error" indicator on competitor management) so silent failures don't rot.

## Data Flow

### Pipeline Flow (write path)

```
Vercel Cron (daily)  ──┐
                       ├─→ POST /api/cron/monitor (secret check)
"Run Now" button    ──┘        │
                               ▼
                    for each active source:
        fetch(url) ─→ extract(html) ─→ sha256(text)
                               │
                 hash == last snapshot hash?
                    │yes                │no
                    ▼                   ▼
            update source        INSERT snapshot
            checked_at only            │
            (STOP — no LLM)     diff(prev, new)
                                       │
                                LLM analyze(diff)
                                       │
                          INSERT change (diff + category
                          + summary + why_it_matters +
                          significance + is_meaningful)
                                       │
                              feed shows it (read path)
```

### Read Path (dashboard)

```
Feed page      → changes WHERE is_meaningful ORDER BY detected_at DESC
                 (join competitors for name/logo)
Profile page   → changes WHERE competitor_id ... split by category:
                 feature timeline (feature_launch/removal)
                 pricing history (pricing_change + pricing snapshots)
Digest page    → latest digests row (generated by digest cron/LLM pass
                 over last 7 days of changes)
Management     → competitors + sources CRUD; shows last_checked/last_error
```

### Data Model (entity relationships)

```
competitors 1──* sources 1──* snapshots
                    │
                    └──1──* changes (fk: source_id, from_snapshot_id,
                              to_snapshot_id) 
changes: diff text + LLM fields inline (no separate "insights" table —
         a change and its insight are 1:1; a join table is overkill here)
digests: standalone (period_start, period_end, content_md, created_at)
```

**Key modeling decisions:**
- `sources` (not just competitors) is the unit of monitoring — a competitor has multiple URLs of different `kind` (`changelog` | `pricing`), and kind drives both the extraction hints and the LLM prompt framing.
- Snapshots store `extracted_text` (required) and optionally `raw_html` (nice for re-extraction while tuning); at ~10 URLs × daily × mostly-unchanged (only insert on change), Postgres free tiers handle this for years.
- LLM output lives on the `changes` row. A separate `insights` table only earns its keep with multiple analyses per change (re-analysis history, multiple models) — defer that.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| v1 (5 competitors, 1 user) | Everything above. Sequential source loop inside one cron invocation — 10 URLs × (fetch ~2s + occasional LLM ~5s) fits comfortably in Vercel Hobby's 300s function limit |
| ~25 competitors | Parallelize fetches (`Promise.allSettled` in batches); still one function invocation |
| ~100+ sources or hourly polling | Outgrow Hobby cron (once/day limit) and single-invocation duration: move trigger to GitHub Actions/Cloudflare cron or upgrade; consider fan-out (one invocation per source) or a queue (Inngest/QStash). **Do not build this now** |

### Scaling Priorities

1. **First bottleneck:** Vercel Hobby cron frequency (once/day max). Not actually a bottleneck for this domain — pages change over days/weeks — but if sub-daily polling is ever wanted, the standard workaround is GitHub Actions cron (free, but timing is best-effort and can be delayed) calling the same protected route.
2. **Second bottleneck:** single-invocation wall time as source count grows. Fix with batched parallel fetches long before reaching for queues.

## Anti-Patterns

### Anti-Pattern 1: Diffing Raw HTML

**What people do:** Hash/diff the full HTML response and alert on any byte change.
**Why it's wrong:** Modern pages change on every request (script hashes, tokens, timestamps, A/B classes). You get a "noise generator, not monitoring" — the failure mode the ecosystem warns about most consistently.
**Do this instead:** Extract-then-diff (Pattern 1). Hash the normalized extracted text only.

### Anti-Pattern 2: Sending Whole Pages to the LLM Every Poll

**What people do:** "AI-native" interpreted as: fetch page → dump full HTML into LLM → ask "did anything change?"
**Why it's wrong:** Burns tokens on ~90% no-op polls, gives the LLM no ground truth to compare against (it hallucinates changes), and blows the <$10/mo budget.
**Do this instead:** Hash gate + deterministic diff first (Patterns 2/3); the LLM only ever sees a real diff.

### Anti-Pattern 3: Distributed-System Cosplay

**What people do:** Separate scraper service, message queue, worker pool, dedicated API service, separate frontend — for 10 URLs polled daily.
**Why it's wrong:** 5× the deploy surface and cost, zero benefit at this scale; kills the free-tier constraint and slows every iteration loop.
**Do this instead:** Modular monolith with the pipeline as a library module invoked by a cron route. Boundaries live in the folder structure, not the network.

### Anti-Pattern 4: Headless Browser by Default

**What people do:** Reach for Playwright/Puppeteer for all fetching.
**Why it's wrong:** Heavy (won't run in standard serverless functions without special builds), slow, and unnecessary — most changelogs and pricing pages are server-rendered or statically generated.
**Do this instead:** Plain HTTP fetch first. If a specific target is JS-rendered, handle *that source* via a rendering fallback (e.g., a hosted reader/render API) flagged per-source, rather than browser-rendering everything.

### Anti-Pattern 5: Cron-Only Pipeline (no manual trigger)

**What people do:** Pipeline only runs on schedule; debugging means waiting a day or faking data.
**Why it's wrong:** For a live-demo portfolio app, "watch it detect a change right now" is the money moment; and once/day iteration loops make development miserable.
**Do this instead:** Same pipeline function behind both the cron route and a dashboard "Check now" button (per-source and all-sources variants).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Vercel Cron | `vercel.json` cron entry → GET/POST to `/api/cron/monitor` with `CRON_SECRET` check | Hobby: max once/day, invocation may land anywhere within the scheduled hour; maxDuration up to 300s on Hobby (default) — plenty |
| LLM API (e.g., Claude/GPT cheap tier) | Direct SDK call from `pipeline/analyze.ts`; structured output (JSON schema/tool call) | Cost scales with detected changes (~a few/week), not polls, thanks to hash gate |
| Postgres (Neon or Supabase free tier) | ORM (Drizzle/Prisma) over pooled connection string | Serverless-friendly drivers matter (HTTP/pooled); avoid long-lived connections from functions |
| Target competitor pages | Plain `fetch` with realistic User-Agent, timeout, redirect follow | Expect occasional 403s/redesigns; per-source error isolation + visible health status |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Trigger routes ↔ pipeline | Direct function call (`runPipeline()`) | Routes are thin: auth check + invoke + return run report |
| Pipeline ↔ DB | Repository/query functions in `lib/db` | Pipeline never writes SQL inline; keeps stages testable with fixture HTML |
| Pipeline stages (fetch→extract→diff→analyze) | Plain function composition, typed intermediates | Each stage independently testable; extract/diff are pure functions |
| UI ↔ data | Server components read via `lib/db/queries.ts`; mutations via server actions | No client-side data layer needed for v1 (single user, read-mostly) |
| Digest ↔ changes | Digest reads `changes` rows; never re-scrapes or re-diffs | Digest is a pure read-model consumer — cheap and decoupled |

## Suggested Build Order (dependency-driven)

1. **Skeleton + data model + competitor management** — app deployed to a public URL on day one; competitors/sources CRUD. Everything depends on the schema; deploying first surfaces platform constraints early.
2. **Fetch → extract → snapshot, manual trigger only** — "Check now" button stores real snapshots of real pages. No cron, no diff, no LLM yet. Validates extraction quality against the actual 3–5 targets (the highest-uncertainty component).
3. **Hash gate + diff + change records** — second snapshot of a changed page produces a stored diff. Verifiable by editing… nothing; verify against a page you *know* changed, or seed with an older snapshot fetched via the Wayback Machine for testing.
4. **LLM analysis** — diff → structured insight on the change row. Prompt iteration happens here; keep raw diffs visible next to insights to judge quality.
5. **Intelligence feed** — the primary screen, reading meaningful changes. First demo-able "money screen."
6. **Cron scheduling** — wire Vercel Cron to the existing route; the system now runs itself.
7. **Competitor profiles + digest** — pure read models + one more LLM prompt over accumulated `changes` data; deliberately last because they need accumulated real data to look good.

**Rationale:** each step is independently verifiable with real data; the riskiest unknowns (extraction quality per target, LLM insight quality) are validated in steps 2 and 4 before the presentation layers are built on top of them. Cron is late because the manual trigger exercises the identical code path.

## Sources

- [Vercel — Configuring Max Duration](https://vercel.com/docs/functions/configuring-functions/duration) — Hobby 300s default/max (HIGH, official, fetched 2026-07-02)
- [Vercel — Cron Jobs usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing) — Hobby once/day limit, invocation window within hour (HIGH, official)
- [How Website Change Detection Actually Works (Hashes, Diffs, Snapshots)](https://dev.to/apify_forge/how-website-change-detection-actually-works-hashes-diffs-and-snapshots-1aeb) — capture/hash/compare/classify/report pipeline; "monitoring without classification is a noise generator" (MEDIUM, verified against multiple sources)
- [changedetection.io](https://github.com/dgtlmoon/changedetection.io) — reference OSS architecture for scheduled page monitoring with filtering/extraction before diff (MEDIUM)
- [Kite Metric — Building a Robust Website Change Detection System](https://kitemetric.com/blogs/the-ultimate-guide-to-website-change-detection-building-a-robust-monitoring-system) — collection layer / detection engine / notification layer decomposition; false-positive filtering (MEDIUM)
- [Free serverless cron platforms comparison](https://litelambda.in/blog/best-free-serverless-cron-platforms/) + [Cloudflare Cron Triggers](https://blog.cloudflare.com/introducing-cron-triggers-for-cloudflare-workers/) — GitHub Actions timing unreliability; Cloudflare free-tier cron limits (MEDIUM)
- [Bypassing Vercel Hobby cron limits](https://runhooks.app/blog/bypassing-vercel-hobby-plan-cron-limit/) — external-trigger workaround pattern if sub-daily polling ever needed (LOW, single source, only relevant to scaling note)

---
*Architecture research for: AI-native competitive intelligence app (ProductPulse)*
*Researched: 2026-07-02*
