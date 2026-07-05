# Beta Readiness Audit — Phase 2: Interactive Playthrough

**Blocker:** `LOVABLE_BROWSER_AUTH_STATUS=signed_out`. Sign into the preview once and the session injects automatically for the next turn.

## Playthrough coverage (Playwright, headless, screenshots at each step)

1. **Auth**: sign-in, sign-out, forgot-password → reset flow, invalid credentials, session persistence on refresh.
2. **Onboarding**: first-run flow, required fields, skip paths, resumability.
3. **Dashboard (`/dash`)**: XP display, streak counter, widgets load, no console errors, no failed network calls.
4. **Workouts**: create, log sets, edit (flag if missing), delete (verify new confirm+toast), history.
5. **Nutrition**: log meal, macro totals, reward-meal milestone trigger, duplicate-prevention check on `reward_meals`.
6. **Journal**: create entry, tab navigation (verify JournalWidgets fix), insights view.
7. **Photos**: upload, gallery, delete, storage RLS.
8. **Metrics/Measurements**: add entry, chart render.
9. **Rewards & XP**: milestone unlocks, XP log integrity, streak edge cases.
10. **Ethan AI chat**: send message, streaming render, error path, memory persistence.
11. **GymBros + Messaging**: friend request, accept, open DM (regression check on prior fix), send/receive, reactions, typing, read receipts, block.
12. **Community / Squads / Challenges**: post, react, join, participate.
13. **Profile**: edit fields, avatar upload, sign-out.
14. **Navigation**: every route from AppShell, back/forward, 404 boundary, error boundary.

At each step: capture screenshot, console errors, failed network requests, and note UX issues.

## Fix autonomy (per prior selection)
- **Auto-fix**: bugs, console errors, missing toasts/confirms, broken links, RLS gaps with obvious owner-scoped policies, minor UI regressions.
- **Flag only** (no changes without approval): schema migrations, data deletions, refactors, Ethan chat migration to TanStack server route, adding missing "Edit workout" feature.

## Deliverable
Complete **Beta Readiness Report**:
- Bugs found / fixed / remaining
- Risk level per area
- Performance, security, database, UI observations
- Suggested improvements (not implemented)
- Overall Beta Readiness Score (0–100%)

## What I need from you
Sign in to the preview, then reply "go" (or anything). I'll take it from there.
