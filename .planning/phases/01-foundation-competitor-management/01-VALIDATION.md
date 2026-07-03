---
phase: 1
slug: foundation-competitor-management
status: planned
nyquist_compliant: true
wave_0_complete: false
created: 2026-07-03
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.9 |
| **Config file** | vitest.config.ts — created in Plan 02 Task 1 (Wave 0) |
| **Quick run command** | `npx vitest run --reporter=dot` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=dot`
- **After every plan wave:** Run `npx vitest run` + `npx next build` (catches prerender/type errors that break Vercel deploys)
- **Before `/gsd:verify-work`:** Full suite green + `npx next build` green + manual checklist on the deployed URL
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01/T2 | 01 | 1 | COMP-01, COMP-02 | T-01-SC, T-01-01 | Pinned versions, no @rc, no untracked secrets | CLI assertion | node package.json version-guard (in plan) | n/a | ⬜ pending |
| 01-01/T3 | 01 | 1 | COMP-01, COMP-02 | T-01-06 | No dangerouslySetInnerHTML | build + grep | `npx next build` + grep gates | n/a | ⬜ pending |
| 01-02/T1 | 02 | 2 | COMP-01, COMP-02 | T-01-02 | SSRF denylist spec written first (RED) | unit (failing) | `! npx vitest run` | ❌ Wave 0 creates | ⬜ pending |
| 01-02/T2 | 02 | 2 | COMP-01, COMP-02 | T-01-02, T-01-03 | Scheme allowlist + host denylist enforced; 5 tables/3 enums/cascade/unique index | unit | `npx vitest run` (tests/validation.test.ts, tests/schema.test.ts) | created in T1 | ⬜ pending |
| 01-03/T2 | 03 | 3 | COMP-01 | T-01-04 | Live schema verified via information_schema; .env untracked | CLI (live DB) | node information_schema verification script (in plan) | n/a | ⬜ pending |
| 01-03/T3 | 03 | 3 | COMP-01 | T-01-02, T-01-05, T-01-06 | All input through createCompetitorSchema | unit + build + manual | `npx vitest run && npx next build` | exists | ⬜ pending |
| 01-04/T1 | 04 | 4 | COMP-02 | T-01-08 | Reconcile-by-id scoped by competitorId (no IDOR) | unit + typecheck | `npx vitest run && npx tsc --noEmit` | exists | ⬜ pending |
| 01-04/T2 | 04 | 4 | COMP-02 | T-01-06, T-01-09 | Destructive confirm dialog; React escaping | build + grep + manual | `npx vitest run && npx next build` + copy greps | exists | ⬜ pending |
| 01-05/T2 | 05 | 5 | COMP-01, COMP-02 | T-01-04 | .env never pushed; risks documented in README | CLI | `git ls-remote` + `git ls-files` gates | n/a | ⬜ pending |
| 01-05/T3 | 05 | 5 | COMP-01, COMP-02 | T-01-05, T-01-10 | SSRF copy blocks internal host on production | manual (checkpoint) | human checklist on public URL | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] vitest 4.1.9 installed (Plan 01 Task 2) and configured with `@` → `./src` alias (Plan 02 Task 1)
- [ ] tests/validation.test.ts — COMP-01 input rules incl. SSRF denylist (Plan 02 Task 1, written RED-first)
- [ ] tests/schema.test.ts — enum values, cascade, unique index for COMP-02 delete semantics (Plan 02 Task 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| App reachable at public URL | DEPL (Phase 1 SC1) | Requires deployed environment | Open the Vercel URL in a browser; page renders without error (Plan 05 Task 3, steps 4–5) |
| Add competitor persists end-to-end | COMP-01 (SC2) | Requires live Neon + deployed app (per 01-RESEARCH.md test map) | Plan 05 Task 3 steps 6–7 (incl. SSRF block copy) |
| Edit/remove competitor and URLs | COMP-02 (SC3) | Requires live deployed flow | Plan 05 Task 3 steps 8 and 10 |
| Data persists across redeploys | Phase 1 SC4 | Requires redeploy cycle | Plan 05 Task 3 step 9: add competitor → Redeploy → still listed |
