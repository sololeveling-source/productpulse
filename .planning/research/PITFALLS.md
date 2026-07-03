# Pitfalls Research

**Domain:** AI-native competitive intelligence (scheduled scraping + change detection + LLM analysis + web dashboard)
**Researched:** 2026-07-02
**Confidence:** HIGH (scraping, change detection, free-tier limits — verified against multiple current sources) / MEDIUM (LLM pipeline specifics, demo-readiness — verified patterns + first-principles for this project shape)

## Critical Pitfalls

### Pitfall 1: Raw-HTML diffing drowns the feed in false positives

**What goes wrong:**
The change detector compares raw HTML (or full rendered DOM) between polls and flags a "change" on nearly every run. Session tokens, CSRF nonces, timestamps, cookie-banner state, ad/analytics script hashes, A/B-test bucket attributes, and "3 days ago" relative dates all differ per request. The intelligence feed fills with garbage, every false positive triggers a paid LLM call, and the core value proposition ("distinguishes meaningful changes from noise") is dead on arrival.

**Why it happens:**
Diffing HTML is the obvious first implementation and it appears to work in a 10-minute test. The noise only shows up after hours/days of real polling against real sites — after the pipeline is already built on top of it.

**How to avoid:**
- Never diff raw HTML. Pipeline should be: fetch → extract content region (CSS selector per monitored URL, e.g., the changelog `<main>` or pricing table) → convert to normalized text/markdown → strip volatile patterns (dates, "X days ago", version-string-only lines if desired) → hash/diff the normalized text.
- Store the extracted normalized text per URL, not the raw HTML, as the comparison baseline (keep one raw snapshot for debugging).
- Add a per-URL "ignore selectors" config (nav, footer, cookie banner, sidebars) from day one — changedetection.io's ecosystem shows selector-based scoping is far more reliable than regex ignore-patterns.
- Treat the LLM as a second-stage filter: after a text-level diff triggers, ask the LLM "is this a meaningful product/pricing change or noise?" with a cheap model before generating a full insight. This is the pattern commercial tools converged on.

**Warning signs:**
- Same URL "changes" on two consecutive polls with no visible page change.
- Diffs containing tokens/hashes/timestamps.
- LLM spend correlated with poll frequency rather than actual competitor activity.

**Phase to address:**
Change-detection phase (the core pipeline phase). Must be proven with a soak test (several days of polling with zero human-visible changes → zero feed items) before building the AI-analysis layer on top.

---

### Pitfall 2: Static-fetch scraper fails silently on JS-rendered changelogs

**What goes wrong:**
Many SaaS changelogs are client-rendered SPAs or embedded widgets (Canny, Headway, LaunchNotes, Beamer, Productboard portals) — a plain `fetch()` returns an empty shell or a loading skeleton. The scraper stores "empty" as the baseline, then either never detects anything or flags a massive "change" when the shell markup shifts. Pricing pages have the same problem: prices frequently load via JS, appear asynchronously, or vary with A/B tests and geo.

**Why it happens:**
Developers test with `curl` on one or two friendly sites, pick a static HTTP fetcher, and only discover the problem when adding competitor #3 whose changelog is a React app.

**How to avoid:**
- Vet monitoring targets before committing to an architecture: for each candidate competitor URL, check whether `curl` returns the actual content. Choose competitors with scrapeable surfaces (this is a 3–5 competitor demo — you get to pick).
- Support two fetch strategies per URL from the start: static HTTP (default, cheap) and headless/rendered (fallback). Even if v1 ships static-only, the abstraction must exist so adding rendering isn't a rewrite.
- Many changelog widgets expose JSON/RSS endpoints (e.g., Canny and Headway feeds); prefer structured feeds or RSS where they exist — dramatically more stable than DOM scraping.
- Detect and reject "suspiciously empty" extractions: if extracted content is < N chars or the selector matches nothing, record a fetch *error*, not a new baseline.

**Warning signs:**
- Extracted content noticeably shorter than what the browser shows.
- A monitored URL never produces a change over weeks while the live page visibly updated.
- Baseline content contains "Loading…", "Enable JavaScript", or empty `<div id="root">`.

**Phase to address:**
Scraping/fetching phase — and earlier, in competitor selection (pick targets during planning, verify scrapeability as a phase-1 spike).

---

### Pitfall 3: Bot detection blocks the scraper (or worse, serves a challenge page that gets diffed)

**What goes wrong:**
Cloudflare/Akamai/Vercel bot protection serves a challenge page, CAPTCHA, or 403. Two failure modes: (a) monitoring silently stops for that competitor; (b) the challenge HTML gets stored as "content" and diffed — producing a spectacular false change ("Competitor removed their entire pricing page!") that the LLM then confidently analyzes.

**Why it happens:**
Datacenter IPs (all free-tier hosts) have poor IP reputation. Default HTTP-client user agents (`python-requests`, `node-fetch`) are instant flags. Headless browsers leak automation signals (`navigator.webdriver`, missing GPU). Works fine from a laptop, fails from the deployed host.

**How to avoid:**
- Validate every fetch before diffing: check HTTP status, check for challenge-page fingerprints ("Just a moment...", "Checking your browser", Turnstile markup), check content-length sanity. Failed validation → fetch error state + retry later, never a baseline update.
- Send a realistic, consistent browser User-Agent and headers; respect robots.txt; poll at low frequency (daily is plenty for changelogs) — low-and-slow rarely trips protection on public marketing pages.
- Choose competitors whose changelog/pricing pages aren't behind aggressive protection (test from the deployed environment, not just locally).
- Do NOT plan around "bypassing Cloudflare" (stealth browsers, proxy rotation) — it's an arms race, a budget-killer, and a bad look for a portfolio project. If a target blocks you, swap the target.

**Warning signs:**
- Fetches succeed locally but return 403/503 from the deployed host.
- Stored snapshots containing "Just a moment" / "Attention Required" text.
- Sudden "page emptied" diffs.

**Phase to address:**
Scraping phase (fetch validation logic) + deployment phase (verify fetches work from production IPs — a dedicated success criterion).

---

### Pitfall 4: LLM cost blowout from re-analyzing everything on every run

**What goes wrong:**
The $10/mo budget evaporates because the pipeline sends full page content (or worse, full raw HTML) to the LLM on every poll, re-analyzes unchanged content, uses a frontier model for everything, or generates digests over the entire history each time. Full HTML pages are 50–200K tokens; a changelog page sent daily to a premium model can alone blow the budget.

**Why it happens:**
"Just send it to the LLM" is the path of least resistance, and cost is invisible during development (a few test calls cost cents). Input-token accumulation is systematically underestimated.

**How to avoid:**
- LLM is invoked only when the deterministic text-diff triggers — never on unchanged content. With 3–5 competitors whose pages change every days/weeks, that's a handful of calls per week.
- Send the *diff plus minimal context* (the new/changed entries + page title + competitor name), not the whole page.
- Two-tier models: cheap/nano model for noise-vs-signal classification; a mid-tier model only for the "why it matters" insight and digests. At this volume even mid-tier costs pennies.
- Hard guardrails: per-run and per-month call caps in code, truncate inputs to a max token budget, log token usage per call from day one.
- Cache analyses keyed by content hash so redeploys/reruns don't re-bill.

**Warning signs:**
- LLM calls per day > detected changes per day.
- Prompt sizes in the tens of thousands of tokens.
- No visibility into per-call token counts.

**Phase to address:**
AI-analysis phase — cost instrumentation and call gating are part of the phase's definition of done, not an afterthought.

---

### Pitfall 5: Hallucinated insights undermine the entire product's credibility

**What goes wrong:**
The LLM invents specifics: wrong prices ("dropped from $49 to $29" when it was $59 to $49), invented feature names, fabricated strategic rationale stated as fact, or a confident analysis of a diff that was actually a cookie-banner change. For a *competitive intelligence* product, one visibly-wrong insight during a demo destroys trust in every other insight — this is the highest-stakes failure mode for a portfolio piece.

**Why it happens:**
Summarization/analysis rewrites content, which inherently risks invented details and changed numbers. Vague prompts ("analyze this change") invite speculation. No grounding link back to the source evidence.

**How to avoid:**
- Structured output (JSON schema): `summary`, `category` (feature/pricing/other), `significance` (enum), `why_it_matters`, each with constraints. Structured outputs measurably reduce free-form fabrication.
- Prompt rule: quote prices/names verbatim from the provided diff; if the diff doesn't state something, say so; explicitly permit "minor/unclear significance" as an answer (models over-inflate significance when significance is the only interesting output).
- Always display the underlying evidence next to the AI insight in the UI — show the actual diff/excerpt and link to the source URL. This is both a hallucination check and a UX differentiator ("AI insight backed by receipts").
- For pricing changes specifically, extract old/new values deterministically where possible and have the LLM narrate, not extract.

**Warning signs:**
- Insights containing numbers/names not present in the source diff.
- Every change rated "highly significant."
- Insights that read plausibly but can't be verified against the linked page.

**Phase to address:**
AI-analysis phase (prompting + schema + evidence-grounding); UI phase (evidence displayed alongside every insight).

---

### Pitfall 6: Free-tier runtime limits kill the scrape job

**What goes wrong:**
The scheduled scrape job exceeds platform limits and dies mid-run — sometimes silently. Concrete traps: Vercel Hobby functions default to short durations (60s max on Hobby without Fluid; Hobby cron minimum granularity and no execution guarantees at exact times), 50MB function bundle limit vs. ~280MB Chromium (headless browsing on Vercel requires @sparticuz/chromium contortions), Render free web services spin down after 15 min idle with 30–60s cold starts, Neon/Supabase free databases auto-suspend and add connection latency on first hit. A job that scrapes 5 URLs sequentially with a headless browser will not fit in a 60-second serverless window.

**Why it happens:**
Free-tier limits are scattered across docs and only bite in production. Local dev has no timeout, no cold start, no bundle limit.

**How to avoid:**
- Architect the scheduled job to fit the platform, or pick a platform that fits the job. Options that work at this scale: (a) one cron invocation per monitored URL (fan-out) so each run stays small; (b) a platform with real background workers (Railway, Fly.io, Render paid) — but watch the budget; (c) GitHub Actions scheduled workflow as the scraper (free, 6-hour limit, full Node/Python + Playwright available) writing to the hosted DB — a well-known, budget-proof pattern for low-frequency scraping.
- If headless rendering is needed on serverless, budget for @sparticuz/chromium setup pain — or avoid by choosing static-scrapeable targets (see Pitfall 2).
- Handle DB auto-suspend: use connection pooling/HTTP drivers (Neon serverless driver, Supabase REST) and retry-on-first-connect.
- Add job observability:每 run writes a heartbeat row (started/finished/URLs fetched/errors). Silent cron death is otherwise invisible for weeks.

**Warning signs:**
- Cron runs with start records but no finish records.
- Works locally, times out deployed.
- "Last checked" timestamps going stale without errors.

**Phase to address:**
Stack-selection/deployment decisions in phase 1 (this constraint should drive the stack choice, not be discovered after). Job observability in the scraping phase.

---

### Pitfall 7: Nothing changes during the demo window

**What goes wrong:**
The app is deployed, monitoring real companies — and for the two weeks around the demo, no competitor ships anything. The feed shows three stale items. The core "wow" (automatic detection → AI insight) can't be shown live because it depends on external events you don't control. Reviewer sees what looks like a static page of old data.

**Why it happens:**
The project constraint "must track real companies, no seeded fake data" collides with reality: changelogs update on the competitor's schedule (days/weeks), not yours.

**How to avoid:**
- **Backfill on add:** when a competitor is added, ingest their *existing* changelog history (changelog pages are chronological by nature) and run AI analysis on recent entries. The feed is instantly populated with real, dated, real-company data — not fake, just historical. This is the single highest-leverage demo mitigation and should be a first-class feature, not a hack.
- **Pick active competitors:** choose 3–5 companies that ship weekly (fast-moving devtools/AI companies post changelogs constantly). Competitor selection is a demo-readiness decision.
- **On-demand check button:** "Check now" per competitor in the UI proves the live pipeline in seconds during a walkthrough (also invaluable for development/debugging).
- **Demonstrable pipeline:** keep one monitored URL you control (e.g., a test changelog page on your own domain) — edit it live during a demo to show end-to-end detection→analysis in real time. It's a real page really changing; frame it as the pipeline demo target.
- The periodic digest also mitigates: even a slow week produces an AI-written "quiet week, here's the recent picture" artifact.

**Warning signs:**
- Feed design assumes a steady stream of fresh items to look good.
- No manual-trigger path; only way to exercise the pipeline is waiting for cron.
- All chosen competitors ship quarterly.

**Phase to address:**
Backfill belongs in the same phase as competitor management/first scraping (it defines the data model — feed items need real source dates, not detection dates). "Check now" in the pipeline phase. Competitor selection at project start.

---

### Pitfall 8: Scraper breakage is invisible until the data is silently stale

**What goes wrong:**
A competitor redesigns their changelog page; the CSS selector now matches nothing or the wrong region. The system doesn't error — it just extracts empty/wrong content, records "no change" forever (or one giant bogus change), and the dashboard confidently displays stale intelligence. Per industry consensus, selector rot is not an *if* but a *when*, and without validation "data feeds appear complete while accuracy erodes."

**Why it happens:**
Extraction failure and "no change" are indistinguishable unless you explicitly separate them. Monitoring your monitoring feels like over-engineering at demo scale.

**How to avoid:**
- Health model per monitored URL: last fetch status, last successful extraction, extracted-content length trend, days since last detected change. Surface it in the UI (a small status dot on competitor profiles is enough — and it looks professionally rigorous in a portfolio demo).
- Extraction sanity rules: selector matched? content non-empty? length within ±X% of previous? Failures → "attention needed" state, not a baseline update.
- Prefer resilient extraction: semantic containers (`<main>`, `<article>`, headings) or readability-style content extraction over deep brittle selectors; prefer RSS/JSON feeds where available (Pitfall 2).

**Warning signs:**
- A previously active competitor shows zero changes for an unusually long time.
- Extracted content length dropped sharply between runs.
- No per-URL fetch/extraction status stored anywhere.

**Phase to address:**
Scraping phase (health states in the data model); UI phase (status surfaced on competitor pages).

---

### Pitfall 9: Legal/ToS missteps on a public portfolio project

**What goes wrong:**
The project scrapes aggressively, ignores robots.txt, or publicly republishes competitors' content wholesale — and because this is a *publicly deployed, named* portfolio piece, it's attributable. Worst case is a cease-and-desist or a takedown; realistic case is it looks careless to a technically-informed reviewer.

**Why it happens:**
"Scraping public pages is legal" gets read as "anything goes." Post-hiQ v. LinkedIn, scraping public (non-authenticated) pages is broadly not a CFAA violation, but ToS/contract claims remain viable (Meta v. Bright Data line of cases), and good-faith signals matter.

**How to avoid:**
- Only monitor public, logged-out pages (already the plan). Never scrape behind auth.
- Respect robots.txt (trivial to check for 5 URLs; do it at competitor-add time and surface it).
- Low-frequency polling (daily), identifiable behavior, no evasion tooling (see Pitfall 3 — don't build Cloudflare bypasses).
- Display excerpts + AI analysis + link to source, not full mirrored pages. Analysis of facts (prices, feature launches) is safe territory; wholesale republication of changelog prose is where copyright questions start.
- Changelogs and pricing pages are content companies *want* read — this is genuinely low-risk if done politely. Frame the politeness (robots.txt check, rate limits) as a feature in the README.

**Warning signs:**
- Polling frequency measured in minutes.
- Full page content rendered verbatim in the app.
- Any "bypass" dependency in package.json.

**Phase to address:**
Scraping phase (robots.txt check, rate limits, UA); UI phase (excerpt-not-mirror presentation).

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Diff raw HTML instead of extracted text | Ships change detection in an hour | Feed unusable from noise; LLM spend on garbage; rewrite of the core pipeline | Never |
| Hardcode per-site parsers for each competitor | Precise extraction per target | Every site redesign is a code change; adding competitor #6 requires a deploy | Acceptable for v1 at 3–5 competitors IF selectors live in DB config, not code |
| Skip fetch/extraction health tracking | Less schema, less code | Silent staleness; broken scrapers discovered during the demo | Never — a status enum + timestamp is ~1 hour of work |
| Single frontier model for all LLM tasks | One integration, best quality | 10–30x cost vs. tiered models; budget breach | Acceptable during dev with call caps; tier before "always-on" deployment |
| Store only latest snapshot, no history | Simpler storage | Can't rebuild feed, can't debug false positives, no pricing history page (a listed requirement) | Never — snapshots are tiny text blobs |
| Detection-time timestamps instead of source dates on backfilled items | No date parsing needed | Backfilled feed shows everything "today"; timeline pages are wrong | Never if backfill exists (it should) |
| No manual "check now" trigger | One less endpoint | Can't demo live; debugging means waiting for cron | Never — it's the same code path as cron |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Target websites (fetch) | Treating any 200 response as content; storing challenge pages/error shells as baselines | Validate: status, challenge-page fingerprints, minimum content length, selector matched — else record error state |
| Target websites (rendering) | Assuming static fetch works everywhere; discovering JS-rendered targets after architecture is fixed | Vet each target URL with curl before committing; design fetcher as strategy-per-URL (static default, rendered fallback); prefer RSS/JSON feeds |
| LLM API | No token logging, no call caps, full-page prompts, re-analyzing on redeploy | Gate on diff trigger; send diffs not pages; log tokens per call; cache by content hash; hard monthly cap |
| LLM API | Free-form text output parsed with regex | JSON-schema structured outputs with enums for category/significance |
| Serverless cron (Vercel) | Assuming cron fires exactly on schedule and can run long | Hobby cron timing is best-effort; function duration limits apply; fan out one invocation per URL or use external runner (GitHub Actions) |
| Free Postgres (Neon/Supabase) | Direct TCP connections from serverless; surprise at cold-connect latency after auto-suspend | Use HTTP/pooled serverless drivers; retry first connection; keep connection budget in mind |
| Headless browser on serverless | Bundling full Playwright/Chromium (280MB+ vs 50MB limit) | @sparticuz/chromium if unavoidable; better: avoid headless entirely via target selection or run scraping in GitHub Actions where full browsers work |

## Performance Traps

Patterns that work at small scale but fail as usage grows. (Note: at 3–5 competitors/single user, genuine performance work is out of scope — these are the ones that bite even at demo scale.)

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sequential scrape of all URLs in one serverless invocation | Job timeout as URL count or per-site latency grows | Fan-out per URL, or non-serverless runner | ~5+ URLs with rendering, or any slow target site, inside a 60s window |
| Scraping triggered by page load ("check when user visits") | Dashboard takes 30s+ to load; duplicate checks | Decouple: cron writes to DB, dashboard reads DB | Immediately |
| Cold-start stack (Render free + Neon suspend) for the demo URL | First demo pageview takes 30–60s | Warm the app before demos; or choose always-warm-enough hosting; document it | Every time the app idles >15 min — i.e., exactly when a reviewer clicks your link |
| LLM digest over full history each period | Digest cost grows monotonically | Digest over the window's items only (they're already summarized) | A few months of accumulation |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Unauthenticated cron/"check now" endpoints on a public app | Anyone can spam scrapes → target site blocks you, LLM budget drained by strangers | Shared-secret header on cron endpoint (Vercel provides CRON_SECRET pattern); rate-limit or lightly protect manual triggers even without user auth |
| LLM API key in client-side code or committed .env | Key theft, unbounded spend | Server-side only; env vars on host; spend limits set at the provider dashboard |
| Public "add competitor URL" form (no auth in v1) | SSRF-style abuse: your server fetches arbitrary URLs on request | If the app is truly public, protect mutation routes with a simple admin secret; validate/allowlist URL schemes; never fetch internal/metadata IPs |
| Rendering scraped HTML into the dashboard unsanitized | Stored XSS from a monitored page into your app | Store/render extracted *text* or sanitized markdown, never raw scraped HTML |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| AI insight shown without evidence | Viewer can't trust or verify claims; one wrong insight poisons all | Every feed item: AI insight + actual diff/excerpt + source link + detected/published dates |
| Everything rated "significant" | Significance signal becomes meaningless | Calibrated enum with explicit "minor" option; visually de-emphasize minor items rather than hiding them |
| Empty feed on first run / new competitor | App looks broken or fake at exactly the first-impression moment | Backfill historical changelog entries on competitor add |
| No scraper health visibility | Stale data presented as current; user (and demo reviewer) misled | Per-competitor "last checked / last change / status" indicators |
| Detection timestamps shown as event dates | Backfilled history all dated "today"; timelines wrong | Separate `published_at` (from source) and `detected_at` fields, shown appropriately |
| Hiding the pipeline | Reviewer can't tell this from a hand-curated feed | Show the machinery: monitoring status, "checked 2h ago", check-now button — the automation IS the product |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Change detection:** Works on a test edit — but has it survived a multi-day soak against real targets with zero false positives? Verify: run 3+ days, feed should show only human-confirmable changes.
- [ ] **Scraping:** Works locally — but from the production host's IP? Verify: run the full scrape from the deployed environment against all targets before calling the phase done.
- [ ] **Scheduled job:** Cron configured — but is completion observed? Verify: heartbeat records exist for every scheduled run over a week; alerts/visible state on failure.
- [ ] **LLM analysis:** Produces nice output — but is cost bounded? Verify: token logging exists, per-month cap enforced, prompt = diff not full page.
- [ ] **Feed:** Populated in dev — but what does a brand-new deploy look like? Verify: fresh DB + add one competitor → feed populates via backfill within minutes.
- [ ] **Pricing history:** Page exists — but does it handle "no changes yet" and JS-rendered price extraction failures gracefully?
- [ ] **Demo readiness:** Deployed — but click the public URL after 30 minutes of inactivity; is the cold-start experience acceptable? Can you demonstrate live detection on demand?
- [ ] **Error states:** Happy path works — but what does the UI show when a fetch has been failing for a week?

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Noisy diffing built on raw HTML | MEDIUM | Insert normalization/extraction stage before diff; re-baseline all URLs; replay stored raw snapshots through new pipeline to validate |
| Target site blocks production IP | LOW | Swap competitor for a friendlier target (demo-scale luxury); or move fetch execution to GitHub Actions (different IP pool, still free) |
| LLM budget blown mid-month | LOW | Provider-side spend cap stops bleeding; add call gating + cheap-model tier; cached analyses mean no data loss |
| Selector rot / silent staleness | LOW (if snapshots kept) / HIGH (if not) | Fix selector, re-fetch, diff against last good snapshot; this is why raw snapshots and health states are stored |
| Serverless timeout on scrape job | MEDIUM | Fan out per-URL invocations, or relocate the job to GitHub Actions scheduled workflow — DB-centric architecture makes the runner swappable |
| Hallucinated insight discovered post-generation | LOW | Regenerate with tightened prompt against stored diff; evidence-display UI limits blast radius since readers can verify |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Raw-HTML diff noise (P1) | Change-detection pipeline phase | Multi-day soak test: 0 false positives on unchanged real pages |
| JS-rendered targets (P2) | Phase 1 spike (target vetting) + scraping phase | curl-test every target URL; each returns real content or has a feed/render strategy |
| Bot detection (P3) | Scraping phase + deployment phase | Full scrape succeeds from production host; challenge-page fingerprints rejected in tests |
| LLM cost blowout (P4) | AI-analysis phase | Token log exists; projected monthly cost < budget at observed change rates; cap enforced |
| Hallucinated insights (P5) | AI-analysis phase + UI phase | Spot-check N insights against source diffs; UI shows evidence per item |
| Free-tier runtime limits (P6) | Stack selection (phase 1) + scraping phase | Scheduled job completes within platform limits from production for a full week |
| Empty demo window (P7) | Competitor mgmt phase (backfill) + pipeline phase (check-now) | Fresh deploy + add competitor → populated feed; live check-now demonstrates pipeline |
| Silent scraper staleness (P8) | Scraping phase (health model) + UI phase | Kill a selector deliberately → UI shows degraded status within one poll cycle |
| Legal/ToS missteps (P9) | Scraping phase | robots.txt honored; daily-or-slower polling; excerpts not mirrors in UI |

## Sources

- [changedetection.io GitHub + issue tracker](https://github.com/dgtlmoon/changedetection.io) — real-world noise/filter failure modes (regex ignore-pattern unreliability, empty-diff triggers, dynamic-content false positives): issues [#14](https://github.com/dgtlmoon/changedetection.io/issues/14), [#2548](https://github.com/dgtlmoon/changedetection.io/issues/2548), [#3108](https://github.com/dgtlmoon/changedetection.io/issues/3108) — HIGH confidence
- [TrackSimple: Ultimate Guide to Website Change Detection](https://tracksimple.dev/blog/the-ultimate-guide-to-website-change-detection-building-a-robust-monitoring-system) and [Kite Metric guide](https://kitemetric.com/blogs/the-ultimate-guide-to-website-change-detection-building-a-robust-monitoring-system) — noise sources (session tokens, timestamps, ads), selector-scoping and normalization strategies — MEDIUM confidence
- [ScrapFly](https://scrapfly.io/blog/posts/how-to-bypass-cloudflare-anti-scraping) / [ScrapeOps](https://scrapeops.io/web-scraping-playbook/how-to-bypass-cloudflare/) / [Browserless](https://www.browserless.io/blog/how-to-bypass-cloudflare-scraping) — bot-detection mechanics (TLS fingerprinting, headless signals, challenge pages) — MEDIUM confidence
- [Grepsr: Extract Prices from JavaScript Competitor Sites](https://www.grepsr.com/blog/extract-prices-javascript-competitor-sites/) and [Firecrawl price-monitoring glossary](https://www.firecrawl.dev/glossary/web-scraping-apis/best-web-scraping-api-ecommerce-price-monitoring) — JS-rendered prices, A/B/geo pricing, silent selector rot — MEDIUM confidence
- [Vercel docs: Cron Jobs usage/pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing), [Function limits](https://vercel.com/docs/limits), [duration config](https://vercel.com/docs/functions/configuring-functions/duration); [ZenRows: Playwright on Vercel](https://www.zenrows.com/blog/playwright-vercel) (50MB bundle vs ~280MB Chromium, @sparticuz/chromium) — HIGH confidence
- [Render free-tier guide](https://deploybase.app/blog/render-free-tier-complete-guide-2026) and [Render community forum](https://render.discourse.group/t/will-using-cron-jobs-to-hit-free-tier-web-service-every-13-14-minutes-use-up-my-free-instance-hours/23630) — 15-min spin-down, 30–60s cold starts, 750-hr cap — HIGH confidence
- [hiQ Labs v. LinkedIn (Wikipedia)](https://en.wikipedia.org/wiki/HiQ_Labs_v._LinkedIn) + [Ninth Circuit opinion](https://cdn.ca9.uscourts.gov/datastore/opinions/2022/04/18/17-16783.pdf); [cloro: scraping legality 2026](https://cloro.dev/blog/website-scraping-legal/); [Browserless legality overview](https://www.browserless.io/blog/is-web-scraping-legal) — public-page scraping vs. CFAA; ToS/contract claims still viable (Meta v. Bright Data) — HIGH confidence on case law, MEDIUM on current-practice framing
- [CODERCOPS: LLM API cost production guide](https://www.codercops.com/blog/llm-api-cost-optimization-production-2026/), [Morph: LLM cost optimization](https://www.morphllm.com/llm-cost-optimization), [Splunk: LLM observability](https://www.splunk.com/en_us/blog/learn/llm-observability.html) — input-token accumulation, caching, tiered models, summarization hallucination risk — MEDIUM confidence
- Demo-readiness mitigations (backfill, check-now, active-competitor selection): first-principles for this project's constraints, consistent with how commercial CI tools (Crayon-class) onboard with historical data — MEDIUM confidence

---
*Pitfalls research for: AI-native competitive intelligence (scraping + change detection + LLM analysis)*
*Researched: 2026-07-02*
