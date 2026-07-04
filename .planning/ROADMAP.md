# Roadmap: ProductPulse

## Overview

ProductPulse ships as six vertical slices ordered by dependency and risk. Phase 1 deploys a live skeleton with competitor management to surface platform limits on day one. Phases 2-4 build and prove the pipeline against real targets — extraction first (highest uncertainty), then deterministic change detection (soak-tested to zero false positives), then LLM analysis (the differentiator, gated by cost controls). Phase 5 delivers the money screen — the intelligence feed — and wires the GitHub Actions daily cron to the same code path as the manual "Check now" trigger, completing the deployed live demo. Phase 6 adds the read models that need accumulated real data to look good: competitor profiles and the AI digest.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Competitor Management** — Deployed Next.js skeleton with schema and competitor/URL CRUD (5/5 executed, complete 2026-07-04)
- [ ] **Phase 2: Scraping Pipeline & Snapshots** — Fetch → extract → normalize → snapshot against real targets, behind "Check now", with per-URL health
- [ ] **Phase 3: Change Detection** — Hash gate + text diff producing change records, soak-tested to zero false positives
- [ ] **Phase 4: AI Analysis** — LLM noise gate plus structured summary, "why it matters", and change-type classification with cost controls
- [ ] **Phase 5: Intelligence Feed & Scheduled Deployment** — Filterable evidence-backed feed plus GitHub Actions daily cron monitoring real competitors from production
- [ ] **Phase 6: Competitor Profiles & AI Digest** — Per-competitor timelines, pricing events, and the AI-written periodic digest

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

**Plans**: 5 waves planned; 5/5 executed — Phase complete 2026-07-04

**Wave 1: 01-01-PLAN.md — Scaffold Next.js 16 + pinned deps + dark app shell**
Status: Complete
Deliverables: Next.js 16 scaffold with pinned dependency set, genuine shadcn/ui (radix) components, dark-only app shell (240px sidebar, feed placeholder, competitors empty-state shell). Zero database code — schema arrives in Plan 01-02.

**Wave 2: 01-02-PLAN.md — TDD validation rules + full schema + db client + drizzle config**
Status: Complete
Deliverables: Complete Drizzle ORM schema with 6 tables, DB client wrapper using @neondatabase/serverless, TDD test suite validating SSRF gate rules

**Wave 3: 01-03-PLAN.md — Neon provisioning + drizzle-kit push + COMP-01 add/list**
Status: Complete
Deliverables: Neon provisioned and connected, schema pushed via drizzle-kit, competitor form creates one competitor linked to N sources, list view at /dashboard

**Wave 4: 01-04-PLAN.md — Edit (reconcile-by-id) + delete with confirmation dialog**
Status: Complete
Deliverables: Edit functionality via reconcile-by-id pattern, delete cascade removes all sources, confirm dialog before destructive actions

**Wave 5: 01-05-PLAN.md — GitHub push + Vercel deploy + production E2E verification**
Status: Complete
Deliverables: Production deployment live on Vercel (public URL), all 4 success criteria verified end-to-end against production, including data persistence across a redeploy. Along the way: fixed a 'use server' export bug that only manifested in production, and corrected Vercel's Git integration which had connected to the wrong (Vercel-created) repo.

### Phase 2: Scraping Pipeline & Snapshots

**Goal**: The user can trigger a real check and see clean, normalized content snapshots and per-URL health for actual competitor pages
**Mode:** mvp  
**Depends on**: Phase 1  
**Requirements**: MON-02, MON-05, MON-06

### Phase 3: Change Detection

**Goal**: When a monitored page genuinely changes, a change record with diff evidence exists — and when it doesn't, nothing fires
**Mode:** mvp  
**Depends on**: Phase 2  
**Requirements**: MON-03

### Phase 4: AI Analysis

**Goal**: Every meaningful change carries trustworthy AI insight — summary, "why it matters", and type — with noise filtered out and LLM spend capped
**Mode:** mvp  
**Depends on**: Phase 3  
**Requirements**: MON-04, AI-01, AI-02, AI-03

### Phase 5: Intelligence Feed & Scheduled Deployment

**Goal**: The user opens a live public app and sees an evidence-backed chronological intelligence feed that updates itself daily without manual action
**Mode:** mvp  
**Depends on**: Phase 4  
**Requirements**: FEED-01, FEED-02, FEED-03, MON-01, DEPL-01

### Phase 6: Competitor Profiles & AI Digest

**Goal**: The user can study any single competitor's product trajectory and read an AI-written synthesis of recent competitive activity
**Mode:** mvp  
**Depends on**: Phase 5  
**Requirements**: PROF-01, PROF-02, PROF-03, DGST-01

## Progress

**Execution Order:** Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|---------|-----------|
| 1. Foundation & Competitor Management | 5/5 | Complete | 2026-07-04 |
| 2. Scraping Pipeline & Snapshots | - | Not started | - |
| 3. Change Detection | - | Not started | - |
| 4. AI Analysis | - | Not started | - |
| 5. Intelligence Feed & Scheduled Deployment | - | Not started | - |
| 6. Competitor Profiles & AI Digest | - | Not started | - |

---
*Roadmap created: 2026-07-02*  
*Phase 1 planned: 2026-07-03 (5 waves)*  
*Last updated: 2026-07-04 — Phase 1 complete, all 5 waves executed and verified on production*
