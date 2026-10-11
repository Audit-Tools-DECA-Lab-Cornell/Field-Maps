# FieldMaps screenshot capture: phase 1

## Research carried over from COPA and YEE

- COPA/YEE web: `tests/visual/catalog.spec.ts` and the `capture-local-screenshots.mjs` wrapper use Playwright, role-aware routes, curated interaction states, scroll frames, and a manifest. Their 1728 × 1117 / 2× desktop frames are useful as marketing source material.
- COPA/YEE mobile: `scripts/capture-screenshots.mjs` uses Expo Router deep links, `xcrun simctl` and `adb`, different iPhone/iPad/Android targets, device screenshots and manifests; it also includes app-specific deep-link auth/reset and backend ID discovery.
- FieldMaps differs: its existing `web/e2e/support/{auth,manifest,routes,scan}.ts`, `web/playwright.config.ts` and `scripts/e2e-local.sh` already provide a local-only seeded workspace and role storage states, with Day/Dusk and four viewport projects. Reuse these, do not duplicate auth or talk to hosted services.
- FieldMaps Expo Router has **protected route groups**. It does **not** implement COPA/YEE screenshot bootstrap query parameters. The capture script must not try to transplant their reset/login/deep-link contract.

## Install without pushing to GitHub

Unpack the kit, then from the **kit** directory run:

```bash
node install.mjs --repo /path/to/Field-Maps --dry-run
node install.mjs --repo /path/to/Field-Maps
```

The installer adds scripts and the assets placeholder, updates existing `web/playwright.config.ts` tablet project test-matches, and adds root package aliases. It does not branch, commit, push, rewrite other files, or read secret `.env` files.

## Web: first batch

Prerequisites: Node 24, pnpm 10.17.1, Docker, uv, and the existing FieldMaps `web/` dependencies / Playwright Chromium. The existing `scripts/e2e-local.sh` brings up local Supabase, API, synthetic workspace, and web app.

```bash
pnpm screenshots:web
pnpm screenshots:web --skip-seed
# or, without aliases:
sh scripts/screenshots-web.sh --skip-seed
```

`--skip-seed` reuses the prior seeded workspace if its manifest still exists. Use only after a successful first run. To capture an individual state or to debug:

```bash
sh scripts/e2e-local.sh --skip-seed --project=screenshots-retina-1728 e2e/screenshots.spec.ts --grep 'export-dialog'
```

Outputs (gitignored) are in `assets/screenshots/web/raw/...`, with an independent manifest per viewport. The initial batch includes public pages, manager workspace routes, owner pages, viewer/observer views, and Invite / Export / Create site dialogs, each in Day and Dusk on Retina desktop (1728 × 1117 at 2×), tablet (1024 and 768 at 2×), and phone (390 at 2×).

**Capture guardrails:** The script refuses non-loopback web URLs. Tests use the existing seeded accounts only, are single-worker by default and make no intentional mutations beyond clicking *open* on non-destructive dialogs. Tests fail on an unexpected HTTP status, absent `main`, unavailable interaction, or unexpected theme. They never capture hosted data. First captures will still need visual review, including typography, map tiles, PII, layout clipping, and repeated sticky chrome. Scrolled screenshots are viewport-sized, not one excessively tall image.

## Mobile: first batch

Prerequisites: a locally installed **development build** of FieldMaps, Metro if the build requires it, and either a booted iPhone/iPad simulator (`xcrun simctl`) or a connected Android device/emulator (`adb`). Only capture accounts and data that are safe to publish.

The script **does not sign in, seed, reset, or edit storage**. This is intentional: FieldMaps uses actual Auth gating, unlike the screenshot bootstrap hooks in COPA/YEE. For each run choose the account state and app theme yourself. The recorded `--theme` is metadata, not a theme switch; FieldMaps saves `fm.pref.screen` inside SQLite rather than following the OS theme toggle. Use the in-app Day/Dusk preference before the run.

```bash
pnpm screenshots:mobile --list
pnpm screenshots:mobile --platform ios --mode public --theme day
pnpm screenshots:mobile --platform ios --mode protected --theme day
pnpm screenshots:mobile --platform ios --mode manual --theme day
pnpm screenshots:mobile --platform android --mode protected --theme dusk
```

By default, the script pauses at each target. Confirm the screen is correct, then press Enter to capture. Use `--yes` for unattended captures only after deep-link navigation has been verified on that build; output is marked unverified. Pass `--device <UDID-or-serial>` when more than one emulator/device is online. Use `--only 03-account` to capture an individual entry. Use `--dry-run` to see the plan without a device.

Public mode covers Welcome / Sign in / Create account / Password recovery. Protected covers Projects / Observations / Account / Field guide / Join project. Manual mode covers Site map / Before you begin / Place / Answer / Review / Saved; prepare each stage in the app first, without disrupting a real research session. Android route resolution and native screen IDs must be reviewed on a running device.

## Initial review checklist

1. Confirm all files show the intended route and role, the proper theme and the correct map layers, with no sign-in redirects or loading spinners.
2. Inspect key frames for map tiles still loading, cut-off navigation, scrolling duplicates, or stale/frozen native screenshots. The mobile CLI warns when adjacent frames have identical hashes.
3. Redact any real people, addresses, site coordinates, token-bearing URLs, account emails, or unpublished study data before assets become public. Use synthetic data for marketing shots.
4. Select a smaller curated subset. Keep `raw` immutable; derivative/export steps should work from selected source hashes and preserve attribution.

## Phase 2: asset-library design (not yet implemented)

Choose a metadata catalog (stable ID, source repo/ref and commit, device, viewport, theme, role, route, workflow state, dimensions, SHA-256, review status, intended use, sensitivity), local Git LFS pattern, and Cloudinary `fieldmaps/` namespace before uploading.

Prefer content-hash-based upload idempotency and Cloudinary delivery transformations (`f_auto`, `q_auto`, responsive sizing, and format) to blindly AI-upscaling UI text. Store originals and reviews in Git LFS; use Cloudinary for CDN delivery. Generate framed store mockups separately from screenshots and validate store sizing requirements at release time.

## Limitations of this delivery

Source code and CLI behavior are statically inspected and locally syntax-checked where possible. No booted devices, full E2E stack, or actual screenshot PNGs were available in this execution environment. Screenshot route fidelity and finished image quality therefore remain to be verified on the developer machine.
