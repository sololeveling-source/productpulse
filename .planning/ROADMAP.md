# Roadmap: ProductPulse

## Overview

ProductPulse ships as six vertical slices ordered by dependency and risk. Phase 1 deploys a live skeleton with competitor management to surface platform limits on day one. Phases 2–4 build and prove the pipeline against real targets — extraction first (highest uncertainty), then deterministic change detection (soak-tested to zero false positives), then LLM analysis (the differentiator, gated by cost controls). Phase 5 delivers the money screen — the intelligence feed — and wires the GitHub Actions daily cron to the same code path as the manual "Check now" trigger, completing the deployed live demo. Phase 6 adds the read models that need accumulated real data to look good: competitor profiles and the AI digest.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Competitor Management** - Deployed Next.js skeleton with schema and competitor/URL CRUD
- [ ] **Phase 2: Scraping Pipeline & Snapshots** - Fetch → extract → normalize → snapshot against real targets, behind "Check now", with per-URL health
- [ ] **Phase 3: Change Detection** - Hash gate + text diff producing change records, soak-tested to zero false positives
- [ ] **Phase 4: AI Analysis** - LLM noise gate plus structured summary, "why it matters", and change-type classification with cost controls
- [ ] **Phase 5: Intelligence Feed & Scheduled Deployment** - Filterable evidence-backed feed plus GitHub Actions daily cron monitoring real competitors from production
- [ ] **Phase 6: Competitor Profiles & AI Digest** - Per-competitor timelines, pricing events, and the AI-written periodic digest

## Phase Details

### Phase 1: Foundation & Competitor Management
**Goal**: A deployed, publicly reachable app where the user manages competitors and the URLs to monitor, backed by the full data schema
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: COMP-01, COMP-02
**Success Criteria** (what must be TRUE):
  1. App is live at a public URL (deployed skeleton on Vercel), proving the hosting path before any pipeline work
  2. User can add a competitor with a name and one or more monitored URLs, each typed as changelog or pricing
  3. User can edit and remove competitors and their monitored URLs
  4. Competitor and source data persists in hosted Postgres across sessions and redeploys (schema includes snapshots, changes, digests, published_at/detected_at, and per-source health fields)
**Plans**: TBD
**UI hint**: yes

### Phase 2: Scraping Pipeline & Snapshots
**Goal**: The user can trigger a real check and see clean, normalized content snapshots and per-URL health for actual competitor pages
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: MON-02, MON-05, MON-06
**Success Criteria** (what must be TRUE):
  1. User can click "Check now" on the dashboard and the pipeline fetches all monitored URLs of vetted real competitors
  2. Each check stores a snapshot of extracted, normalized page content per URL, and the user can inspect it
  3. Each monitored URL shows health status (last checked, last success, failure streak) so silent scraper failures are visible
  4. Adding a competitor backfills the entries currently visible on their changelog page as real, dated items (no archive scraping)
  5. Failed or suspiciously empty fetches are recorded as errors — never stored as content baselines
**Plans**: TBD
**UI hint**: yes

### Phase 3: Change Detection
**Goal**: When a monitored page genuinely changes, a change record with diff evidence exists — and when it doesn't, nothing fires
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: MON-03
**Success Criteria** (what must be TRUE):
  1. Unchanged pages are skipped by the content-hash gate — repeated checks of a stable page create no diff work and no change records
  2. When a monitored page's content genuinely changes, a change record with a unified text diff against the previous snapshot appears and is viewable
  3. A multi-day soak test polling real targets completes with zero false-positive change records before any AI analysis is built on top
**Plans**: TBD

### Phase 4: AI Analysis
**Goal**: Every meaningful change carries trustworthy AI insight — summary, "why it matters", and type — with noise filtered out and LLM spend capped
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: MON-04, AI-01, AI-02, AI-03
**Success Criteria** (what must be TRUE):
  1. An LLM noise gate classifies each raw diff as meaningful vs. noise before analysis runs — noise diffs produce no insights in the product
  2. Each meaningful change shows an AI-generated plain-English summary grounded in the diff (structured output, verbatim-quote rules)
  3. Each meaningful change shows an AI "why it matters" strategic assessment
  4. Each change is classified by type (feature launch / pricing change / deprecation / fix / other), including backfilled entries
  5. Token usage is logged with per-run and per-month caps, and identical content (by hash) is never re-analyzed
**Plans**: TBD

### Phase 5: Intelligence Feed & Scheduled Deployment
**Goal**: The user opens a live public app and sees an evidence-backed chronological intelligence feed that updates itself daily without manual action
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: FEED-01, FEED-02, FEED-03, MON-01, DEPL-01
**Success Criteria** (what must be TRUE):
  1. User can view a reverse-chronological feed of detected changes showing competitor, change type, AI summary, and timestamp
  2. User can filter the feed by competitor and by change type
  3. Every feed item shows before/after diff evidence and a link to the source page next to its AI insight
  4. A GitHub Actions daily cron runs the pipeline through the same code path as "Check now", and recent-run heartbeats are visible
  5. The deployed public app monitors 3–5 real competitors on schedule, with scrapes succeeding from production/CI IPs over a sustained (week-long) window
**Plans**: TBD
**UI hint**: yes

### Phase 6: Competitor Profiles & AI Digest
**Goal**: The user can study any single competitor's product trajectory and read an AI-written synthesis of recent competitive activity
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: PROF-01, PROF-02, PROF-03, DGST-01
**Success Criteria** (what must be TRUE):
  1. User can open a per-competitor profile page from the feed or competitor list
  2. Profile shows a feature-launch timeline derived from classified changes
  3. Profile lists pricing-page change events for that competitor
  4. User can view an AI-written periodic digest summarizing recent activity across all competitors, generated over accumulated real data
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Competitor Management | 0/TBD | Not started | - |
| 2. Scraping Pipeline & Snapshots | 0/TBD | Not started | - |
| 3. Change Detection | 0/TBD | Not started | - |
| 4. AI Analysis | 0/TBD | Not started | - |
| 5. Intelligence Feed & Scheduled Deployment | 0/TBD | Not started | - |
| 6. Competitor Profiles & AI Digest | 0/TBD | Not started | - |

---
*Roadmap created: 2026-07-02*
