# ProductPulse (working title)

## What This Is

A competitive intelligence web app that automatically monitors competitors' product surfaces — changelogs, release notes, and pricing pages — detects changes, and uses AI to explain what changed and why it matters. Built as a portfolio/learning project in the spirit of Crayon Intelligence, but AI-native and focused purely on product signals rather than broad market intel.

## Core Value

The app automatically detects real competitor product changes (feature launches and pricing changes) and delivers AI-generated "what changed and why it matters" insight — without manual monitoring.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Automated monitoring of 3–5 competitors' changelogs/release notes and pricing pages on a schedule
- [ ] Change detection that distinguishes meaningful product changes from noise (formatting, dates, minor copy)
- [ ] AI analysis of each detected change: summary + "why it matters" significance assessment
- [ ] Intelligence feed as the primary screen: chronological stream of detected changes with AI insight
- [ ] Competitor profile pages: per-competitor feature timeline and pricing history
- [ ] AI-written periodic digest summarizing recent competitive activity
- [ ] Competitor management: add/edit competitors and the URLs to monitor
- [ ] Deployed and publicly accessible as a live working demo

### Out of Scope

- Authentication / multi-user support — single-user v1; portfolio demo doesn't need accounts
- Reviews & sentiment tracking (G2, Capterra) — feature/pricing signals only for v1; different data problem
- News/social/ad monitoring — full Crayon breadth is explicitly not the goal; product signals only
- Battlecards & sales enablement — downstream artifact, not core to the detection+insight loop
- Slack/CRM integrations — no team to integrate with in v1
- Multi-tenant SaaS architecture — this is a demo-scale build, not a business yet

## Context

- Greenfield project in an empty directory; no existing code
- Inspiration: Crayon Intelligence (crayon.co) — enterprise competitive intelligence platform. The user's differentiation thesis: Crayon-class tools are broad and feed-heavy; an AI-native tool should do the analysis, not just the collection
- The user is building this to learn and to have an impressive, deployed, demonstrably-working artifact — "seeded fake data" is not acceptable; it must track real companies and detect real changes
- Monitoring targets are public web pages (changelogs, release-notes pages, pricing pages), which change infrequently (days/weeks), so polling can be low-frequency and cheap
- AI analysis will use an LLM API; cost control matters (see Constraints)

## Constraints

- **Budget**: Free/near-free tiers, target under ~$10/mo all-in — drives hosting, database, scheduler, and LLM model choices
- **Tech stack**: No preference; research phase should recommend the standard 2026 stack for this shape of app (web app + scheduled scraping + LLM pipeline)
- **Deployment**: Must be deployable to a public URL as a live demo — local-only is not "done"
- **Scale**: 3–5 competitors, single user — architecture should be simple; no premature scaling work

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Automated monitoring over manual curation | AI-native automation is the core differentiator vs. manual-entry tools | — Pending |
| Feed-first UX (profiles and digest build on the feed) | The "money screen" is the chronological insight feed | — Pending |
| Single user, no auth in v1 | Portfolio demo; auth adds work without demonstrating the core value | — Pending |
| Product signals only (features + pricing) | Narrow scope beats shallow breadth; explicitly not rebuilding all of Crayon | — Pending |
| Free-tier infrastructure | Hobby budget; also demonstrates cost-conscious engineering | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-02 after initialization*
