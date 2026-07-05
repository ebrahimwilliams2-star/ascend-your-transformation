# Beta Readiness Audit — Phase 2: Interactive Playthrough

Preview session is now injected. Approving this plan starts the full authenticated Playwright run.

## Playthrough coverage (headless Chromium, screenshots + console + network at each step)

1. **Auth**: sign-out, sign-in, forgot-password → `/reset-password`, invalid credentials, session persistence on refresh.
2. **Onboarding**: first-run flow, required fields, skip/resume.
3. **Dashboard (`/dash`)**: XP, streak, widgets, console/network cleanliness.
4. **Workouts**: create, log sets, delete (verify new confirm+toast), history; flag missing "edit".
5. **Nutrition**: log meal, macro totals, reward-meal milestone, duplicate check on `reward_meals`.
6. **Journal**: create entry, tab navigation (verify JournalWidgets fix), insights.
7. **Photos**: upload, gallery, delete, storage RLS.
8. **Metrics/Measurements**: add entry, chart render.
9. **Rewards & XP**: milestone unlocks, xp_logs integrity, streak edges.
10. **Ethan AI chat**: send, stream render, error path, memory persistence.
11. **GymBros + Messaging**: friend request, accept, open DM (regression from prior fix — currently on `/messages/b770bd75…`), send/receive, reactions, typing, read receipts, block.
12. **Community / Squads / Challenges**: post, react, join, participate, claim.
13. **Profile**: edit, avatar upload, sign-out hygiene (cache clear, back-button).
14. **Navigation**: every AppShell route, back/forward, 404 + error boundaries.

## Fix autonomy (per prior selection)
- **Auto-fix**: bugs, console errors, missing toasts/confirms, broken links, obvious owner-scoped RLS gaps, minor UI regressions.
- **Flag only**: schema migrations, data deletions, refactors, Ethan chat migration to TanStack server route, adding missing "Edit workout" feature.

## Deliverable
**Beta Readiness Report** — bugs found / fixed / remaining, risk level, performance, security, database, UI observations, suggested improvements (not implemented), overall Beta Readiness Score (0–100%).
