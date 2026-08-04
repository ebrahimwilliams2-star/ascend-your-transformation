# Dashboard Tap Repair — Diagnose, Harden, Verify

## What I found so far

I ran an automated browser pass against the dashboard (mobile 420px touch emulation and your 956x855 window) and, in the running app:

- Every dashboard link hit-tested clean — no overlay sits above any button, and no element has `pointer-events` disabled.
- Tapping each shortcut navigated to the right route: Journal, Ascendant, Ethan, Challenges, Community, Squads, Rewards, Photos, Workouts, Bros/Social, Profile, Nutrition, Metrics.
- A Daily Discipline habit tap fired its request and flipped to "Claimed".
- Zero console errors, zero runtime errors, no full-screen overlays present.

So the cause is **not reproducible in the sandbox build** — which means it is most likely one of: a stale published bundle on your phone, a cached/offline bundle in the phone browser, or a device-specific touch condition the emulator does not reproduce. I will not guess; step 1 confirms which.

## Step 1 — Confirm which build is broken

- Compare the live published bundle against the current source (published site may predate the motion work).
- Load the published dashboard in a real browser session and repeat the same hit-test/tap sweep used above, capturing console and network output.
- Report back exactly which build fails and with what signal.

## Step 2 — Fix the confirmed cause

Whatever step 1 shows, plus a hardening pass on the known-risky spots in the motion layer (all visual-only, no logic changes):

- `.animate-reveal-up` currently starts at `opacity: 0` and relies on the animation running. If animations are dropped or delayed on a device, sections stay invisible and feel dead. Add a safe fallback so content is always visible and interactive even when the animation never fires.
- Ensure every fixed overlay (`Celebration`, `ShareCardModal`, `LocationSheet`, modal scrims) is fully unmounted or `pointer-events-none` when closed.
- Confirm the bottom nav's fixed container never extends an invisible hit area over page content (the one overlap found is expected page-under-nav scroll behaviour, not a bug).
- Keep `touch-action: manipulation` and press-scale effects intact.

## Step 3 — Full verification

Re-run the automated sweep on both preview and published, mobile touch and desktop mouse:

- Every dashboard button: receives the event, plays its animation, opens the correct route.
- Regression pass on Ethan AI, Dashboard, Bros/Community, Progress/Photos, Ascendant, Challenges, Profile, Journal, Nutrition, Metrics.
- Zero console errors, zero runtime errors, no navigation loops.

Then republish so your phone gets the verified build, and hand back a report: root cause, files changed, what changed, per-button test results.

## Technical notes

- Files likely touched: `src/styles.css` (reveal/entrance fallbacks), `src/components/motion/Celebration.tsx`, `src/components/Modal.tsx`, `src/components/AppShell.tsx`, `src/routes/dash.tsx`.
- No backend, data, or routing logic changes — presentation layer only.
