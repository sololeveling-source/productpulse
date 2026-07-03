# Requirements: ProductPulse

**Defined:** 2026-07-02
**Core Value:** The app automatically detects real competitor product changes (feature launches and pricing changes) and delivers AI-generated "what changed and why it matters" insight — without manual monitoring.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Competitor Management

- [ ] **COMP-01**: User can add a competitor with a name and one or more monitored URLs, each typed as changelog or pricing
- [ ] **COMP-02**: User can edit and remove competitors and their monitored URLs

### Monitoring & Change Detection

- [ ] **MON-01**: System automatically checks all monitored URLs on a daily schedule
- [ ] **MON-02**: System stores a snapshot of extracted, normalized page content per check
- [ ] **MON-03**: System detects changes by diffing normalized text against the previous snapshot, with a content-hash gate to skip unchanged pages
- [ ] **MON-04**: An LLM noise gate classifies each raw diff as meaningful vs. noise before any analysis runs
- [ ] **MON-05**: User can trigger an immediate check ("Check now") from the dashboard
- [ ] **MON-06**: Each monitored URL shows health status (last checked, last success, failure streak) so silent scraper failures are visible

### AI Analysis

- [ ] **AI-01**: Each meaningful change gets an AI-generated plain-English summary
- [ ] **AI-02**: Each meaningful change gets an AI "why it matters" strategic assessment
- [ ] **AI-03**: Each change is classified by type (feature launch / pricing change / deprecation / fix / other)

### Intelligence Feed

- [ ] **FEED-01**: User can view a reverse-chronological feed of detected changes showing competitor, change type, summary, and timestamp
- [ ] **FEED-02**: User can filter the feed by competitor and change type
- [ ] **FEED-03**: Each feed item shows before/after diff evidence and a link to the source page

### Competitor Profiles

- [ ] **PROF-01**: User can view a per-competitor profile page
- [ ] **PROF-02**: Profile shows a feature-launch timeline derived from classified changes
- [ ] **PROF-03**: Profile lists pricing-page change events

### Digest

- [ ] **DGST-01**: User can view an AI-written periodic digest summarizing recent activity across all competitors

### Deployment

- [ ] **DEPL-01**: App is deployed to a public URL, monitoring 3–5 real competitors on schedule

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### AI Analysis

- **AI-04**: Each change gets an AI significance score (high/med/low) with feed badges and sorting — user deferred from v1
- **AI-05**: Digest includes cross-competitor pattern callouts (needs accumulated data)

### Pricing Intelligence

- **PRICE-01**: System extracts structured plan/price data from pricing-page snapshots
- **PRICE-02**: Profile shows a pricing history timeline ("Pro went $29→$39 on June 12")

### Onboarding & Delivery

- **ONBD-01**: System auto-discovers changelog/pricing URLs from a bare competitor domain
- **DLVR-01**: Digest can be delivered by email

### Quality Loop

- **QLTY-01**: User can mark a change as "not meaningful" to tune the noise gate

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Auth / multi-user / teams | Single-user portfolio demo; auth demonstrates nothing about core value |
| News/social/reviews/ads/jobs monitoring | Product signals only — the narrow-beats-shallow thesis; each source is a separate noise problem |
| Battlecards & sales enablement | Downstream of intel, needs a sales team; digest is the shareable artifact |
| Real-time / minute-level monitoring | Target pages change on day/week cadence; high frequency wastes budget and adds noise |
| Pixel/visual screenshot comparison | Notoriously noise-prone; text/DOM semantic diffing is the chosen approach |
| User-configured CSS selectors / element-hiding | Pushes the hardest job onto the user; contradicts AI-native positioning |
| Slack/CRM integrations | No team to deliver to in v1 |
| Historical backfill (Wayback Machine) | Separate ETL project with different failure modes; track forward from onboarding |
| Win/loss analytics, revenue attribution | Requires sales data that doesn't exist here |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMP-01 | Phase 1 | Pending |
| COMP-02 | Phase 1 | Pending |
| MON-02 | Phase 2 | Pending |
| MON-05 | Phase 2 | Pending |
| MON-06 | Phase 2 | Pending |
| MON-03 | Phase 3 | Pending |
| MON-04 | Phase 4 | Pending |
| AI-01 | Phase 4 | Pending |
| AI-02 | Phase 4 | Pending |
| AI-03 | Phase 4 | Pending |
| FEED-01 | Phase 5 | Pending |
| FEED-02 | Phase 5 | Pending |
| FEED-03 | Phase 5 | Pending |
| MON-01 | Phase 5 | Pending |
| DEPL-01 | Phase 5 | Pending |
| PROF-01 | Phase 6 | Pending |
| PROF-02 | Phase 6 | Pending |
| PROF-03 | Phase 6 | Pending |
| DGST-01 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-02*
*Last updated: 2026-07-02 after roadmap creation (traceability populated)*
