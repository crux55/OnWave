# OnWave Mobile — Build Plan (Android first, iOS second)

> Handoff document for whichever agent/session builds this. Written assuming
> no context from the conversation that produced it — read it standalone.

## What OnWave is, and why this project exists

OnWave is an internet radio platform: station discovery (genre + mood-based),
live DJ shows with chat, accounts, liked stations, an external radio
schedule, profiles. Today it's a Next.js/TypeScript web app on a Go backend
(`project_r`) + MySQL, live at `https://onwave.andruquinn.com`. **This is a
new client for that existing, live backend — not a new product or backend.**

This project exists because of a real, hard-hit limitation: casting a live
radio stream to a Chromecast with an audio-reactive WebGL visualizer failed
on real devices — older embedded Chromium on Cast hardware routes
hardware-decoded audio straight to the speakers, bypassing the browser's
WebAudio graph entirely, so no JS-side tap ever sees real samples. Confirmed
via extensive live diagnostics and a second AI opinion; full writeup at
GitHub issue `project_r/OnWave #54`. **Android's native
`android.media.audiofx.Visualizer` API doesn't have this problem** — it taps
real PCM from any playing audio session at the OS level. This project is the
actual fix.

## Reference material (read before writing anything)

- Backend (Go), local path `C:\Users\games\Code\Go\project_r` — ground truth
  for every API contract, auth flow, LiveKit integration, data model.
- Web frontend, local path `C:\Users\games\Code\React\OnWave`:
  - `src/lib/api.ts` — every API call, real request/response shapes.
  - `src/lib/types.ts` — shared types.
  - `src/lib/moods.ts` — mood-matching logic for discovery (port this).
  - `src/components/discover/SwipeableStationBrowser.tsx` — the swipeable
    "Tinder/TikTok-style" station browsing UI. **Reuse this interaction
    design** (wanted specifically on the phone app) — reimplement with
    native gestures, don't just port the web component.
  - `src/app/globals.css` — the "Nightwave" dark theme (colors, Sora/Manrope
    fonts). Match this branding across both apps.
- Production API base: `https://onwave.andruquinn.com/api`, JWT bearer auth
  (check `internal/auth` in the backend for the exact flow).

## Locked product decisions

- **Two separate apps, two separate Play Store listings** — e.g. "OnWave"
  (phone/tablet) and "OnWave for TV" (Android TV). Not a single
  form-factor-adaptive bundle. The UI shells are genuinely different builds
  regardless (D-pad vs touch), so one listing wouldn't save real engineering
  effort — it would just merge two products into one store page. Separate
  listings give **risk isolation** (Play Console tracks crash rate/ANRs per
  listing — don't let early TV-hardware flakiness drag down the phone app's
  standing, or vice versa) and **independent release cadence** (ship and
  iterate on the TV app, the actual original motivator, without gating it on
  the phone app being ready).
- **One monorepo**, not separate repos per app. The things "two apps" is
  actually about — separate listings, independent release cadence, crash
  isolation — live at the Play Console/CI level, not the repo level: one
  repo can have two app targets with two independently-triggered release
  pipelines shipping on completely different schedules. Splitting into
  separate repos would mean turning the shared core into its own
  published/versioned package pulled in as a dependency by two app repos —
  real extra plumbing and a classic source of version-skew bugs, for no
  real benefit at this stage. Structure: a shared `core` package (API
  client, types, business logic, theme tokens) plus two app
  projects/modules, one per app.
- **Visualizer on every device, not just TV.** Android's native Visualizer
  API works on phones too. Build it as one shared component, used by both
  apps.
- **No live DJ / Go-Live features in v1.** Explicit instruction: "I don't
  want DJs going live till legal things are sorted." Matches the web app's
  own `GO_LIVE_ENABLED` flag, currently off in production for the same
  reason. Don't build any broadcast-from-the-app functionality in either
  app.
- **Port the swipeable discovery flow to the phone app** (see reference
  material above) — a named, specific UX requirement, not a nice-to-have.
- **Real Play Store distribution is the target** for both apps, not
  personal sideloading. Budget for: a Google Play Developer account ($25
  one-time, covers both listings), Android TV listing/quality requirements
  for the TV app, and app review for each.
- **Framework is the build agent's call**, after real due diligence — not
  pre-decided. See below.

## Framework decision — do this first, as its own short deliverable

Evaluate against these criteria, in rough priority order, and write up a
short decision doc before scaffolding anything:

1. **Path to the native Visualizer API.** Kotlin gets this for free via the
   standard SDK. Any cross-platform framework needs either an existing
   well-maintained native module or a custom native bridge you write
   yourself — check what actually exists and its quality/maintenance status
   before assuming it's trivial.
2. **Android TV UI maturity.** If considering React Native, specifically
   verify `react-native-tvos`'s current state for Android TV (not just
   tvOS) — Leanback-style focus/navigation support, how actively it's
   maintained. If considering Flutter, check its current Android TV story
   too. Don't take either on faith.
3. **Code reuse between the two apps, and toward iOS Phase 2.** Since these
   are two separate app projects (sharing one repo), this is about a shared
   core package, not a shared UI — but it still matters, especially for iOS
   later. React Native (and to a lesser extent Flutter) could make both of
   those meaningfully cheaper if the TV story checks out.
4. **Play Store quality/polish bar** — the goal is a real, good app on both
   listings, not a janky wrapper.

Kotlin + Jetpack Compose (with Compose for TV for the TV app) is the safest
default if the cross-platform options don't hold up under scrutiny —
Google's own current, actively-developed toolkit for exactly this, at the
cost of no code sharing with the web app and fully separate Swift/SwiftUI
builds for iOS later.

## Core v1 feature set (both apps, unless noted)

- Browse/discover: genre tiles, mood-based discovery (free text + presets,
  ported matching logic), search.
- **Swipeable station discovery** — phone app only.
- Play a station with **real background playback** surviving screen lock /
  app backgrounding — first-class requirement, both apps.
- Liked stations (requires auth).
- External schedule/shows guide (PBS FM, KEXP, NTS, etc.) — the web app
  just fixed real timezone bugs here (station-local vs viewer-local time);
  read `src/lib/timezone.ts` and `src/app/shows/page.tsx` for the corrected
  logic before reimplementing from scratch.
- Account: login/signup, profile view.
- **Audio-reactive visualizer** (native `Visualizer` API) — both apps, the
  core payoff feature.
- TV app: D-pad/remote-navigable browse rows and detail views throughout
  (leanback-style), not a touch UI squeezed onto a big screen.

## Explicitly out of scope for v1

- Live DJ shows / Go-Live broadcasting (legal, not technical — see locked
  decisions).
- Admin tooling, badges/loadout system, deep profile editing.
- Casting *to* other devices from within either app (these apps replace the
  need to cast).

## Phasing

**Android first (both apps), iOS second.** Within Android, the TV and phone
apps are independently releasable — given the TV app is the original
motivator, it's reasonable to prioritize and ship it first, but that's not
mandatory; sequence however makes sense once building starts. iOS gets no
benefit from TV-specific work, so it stays a clean Phase 2 regardless of
which Android app ships first.

## Before scaffolding

1. Write the framework decision doc (above) and get it in front of the user
   before committing.
2. Set up the monorepo: a shared `core` package plus two app
   projects/modules. Confirm the exact layout with the user once the
   framework is chosen (the right structure differs meaningfully between,
   say, a Gradle multi-module Kotlin project and a React Native + Yarn/PNPM
   workspace setup).
3. Check whether push notifications are wanted for v1; if so, a new backend
   endpoint for device token registration is likely needed (the existing
   reminder system is in-app only) — confirm with the user and check the
   backend before assuming it exists.

---

*A separate, smaller recommendation, not part of this project: upgrade the
**web app's** Chromecast casting from Google's bare Default Media Receiver
to a registered "Styled Media Receiver" — Cast Developer Console
branding/background config only, zero custom code, so none of the bugs that
led to this project apply — to show OnWave branding and a "get the TV app"
message while casting. Low-risk web-app task, independent of this mobile
build, whenever wanted.*
