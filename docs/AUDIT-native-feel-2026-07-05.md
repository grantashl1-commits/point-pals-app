# PointPals — native app-feel audit (5 Jul 2026)

Does the app *feel* native on a phone? PASS/FAIL per item with the file, then
the fix applied in the same pass.

## Touch target sizing
- **FAIL → fixed** — Bottom-nav links were `px-4 py-2` + `w-4 h-4` icons (~36–40 px
  tall). `AppShell.tsx` — bumped to `px-4 py-2.5`, `w-5 h-5` icons, `min-h`
  ≥ 44 px.
- **FAIL → fixed** — Settings gear was `h-10 w-10` (40 px). `AppShell.tsx` → `h-11 w-11`.
- **FAIL → fixed** — Library tab pills were `py-1.5` (~32 px). `library.tsx` → `py-2.5`
  with `min-h-[44px]`. Same for the award-modal tabs (`AwardModal.tsx`).
- **PASS** — Award-modal tiles are `w-24` (96 px) squares.
- **PASS** — Adjacent gaps: grids use `gap-x-2 gap-y-5/6`; nav uses `gap-1` inside
  pill padding. Comfortable.

## Avatar and icon sizing
- **FAIL → fixed** — Home kid avatars were `lg` = 80 px; reference scale is ~90–100.
  `KidBadge.tsx` — `lg` bumped 80 → 92 px.
- **PASS** — Award-modal tile icons fill 86 % of a 96 px tile (~82 px).

## Typography scale
- **PASS** — Section headers use the Zain display font at `text-3xl`
  (Library/Rewards/Memories/Reports).
- **PASS (with note)** — Core-flow body/label text is ≥ 14 px, except icon-tile
  captions (`text-xs`/12 px). Those are labels *under* an icon — the iOS
  home-screen convention is ~11–12 px, and widening them breaks the tile grid,
  so they're deliberately kept. The "Tap a kid to give points" helper was
  bumped to `text-sm`.

## Spacing and density
- **PASS** — `card-soft` sections use `p-4`/`p-5` (16–20 px).
- **PASS** — `main` is `max-w-4xl mx-auto px-5`: full width minus a 20 px gutter
  on a phone, not a narrow centred column.

## PWA standalone behaviour
- **PASS** — `manifest.webmanifest` has `"display": "standalone"`.
- **FAIL → fixed** — `theme-color` meta was `#F472B6` (a saturated pink) while the
  app header is the cream page background and the manifest theme was butter
  `#F3E1A0` — three different colours. Set the meta and the manifest theme to
  the page background `#FBF7EC` so the OS status bar blends into the header.
- **PASS** — `apple-mobile-web-app-capable` = yes.
- **PASS** — `apple-mobile-web-app-status-bar-style` = default.
- **FAIL → fixed** — No tap-highlight suppression. Added
  `-webkit-tap-highlight-color: transparent` globally (`styles.css`).
- **FAIL → fixed** — No pull-to-refresh containment. Added
  `overscroll-behavior-y: contain` on `html, body`.
- **PASS (intentional)** — Double-tap-to-zoom is removed via
  `touch-action: manipulation` on interactive controls (the `.tap` utility +
  buttons/links/inputs), which kills the double-tap zoom **without** the
  accessibility harm of `user-scalable=no`. We deliberately keep pinch-zoom
  enabled: the viewport meta is global and disabling zoom would break the
  text-heavy About/Privacy/Terms pages and violate WCAG 1.4.4.
- **PASS (partial)** — Manifest `background_color` + maskable icon give a branded
  splash on Android/Chrome. A full iOS `apple-touch-startup-image` set (one per
  device size) is optional polish, left out of this feel pass.

## Bottom nav specifics
- **PASS** — Fixed, `z-50`, sits above `env(safe-area-inset-bottom)` via
  `.pp-bottom-nav`.
- **PASS** — Active tab is high-contrast (`bg-foreground text-background`).
- **FAIL → fixed** — Labels were `hidden sm:inline` → icon-only on phones.
  Now always shown alongside the icon.

## Subjective pass (Chrome DevTools, iPhone 12 Pro viewport)
Home → tap a kid → award modal → close now reads as **chunky and immediate**:
44 px+ targets, no grey tap-flash, no accidental page-zoom on double-tap, and
the status bar blends into the cream header. It feels like an app, not a
scrolled website.
