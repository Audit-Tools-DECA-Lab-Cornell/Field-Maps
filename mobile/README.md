# FieldMaps mobile collector

A native iOS/Android collector for observational play research: a researcher on a playground
marks a child on a site map and answers a conditional questionnaire, usually offline, often
one-handed, often in sun. This app is independent of the Next.js prototype in `../web/`. The
[product workspace](../docs/Workspace.md) provides root command aliases while preserving this
app's dependencies and lockfile.

The interface follows `../designs/Riverside Collector v2.dc.html` and the Nocturne design
system in `../designs/_ds/nocturne-0f5393a7-e60a-4d31-be24-f93ea06f52be/`. On the field map,
tablet landscape (1024×768) is the primary target, then phone landscape (844×390); in portrait the
map stacks over the panel. Every screen, the field map included, runs in portrait or landscape on
both, and its content spans the full window width — a deliberate departure from the design file's
600px reading column.

## What is implemented

- **Navigating and marking are separate map modes.** Panning and zooming stay live until
  "Place a point" is armed; a single tap then places the point, disarms the mode and opens the
  first question. Map chrome sits on its own translucent glass and takes its own touches, so no
  control can drop an observation.
- **One question per screen.** A single choice moves on by itself after a beat; multi-select and
  text wait for Continue. The questionnaire is never scrolled as a whole, and the map never
  disappears — side by side in landscape, stacked in portrait, with a collapsible panel.
- **A reusable form engine** (`src/forms/`) built from versioned definitions: stable question and
  option identifiers, a restricted declarative condition format, dynamic option sets, and
  validation of duplicate export columns, dangling references and dependency cycles. Workbook
  rule text is carried as provenance and never executed.
- **Shared JSON contracts** in [`../contracts/`](../contracts/README.md). The fixture modules import the canonical definitions; `pnpm contracts:forms` generates their input JSON Schema. Python and mobile tests share cases for visibility, hidden-answer pruning, types, duplicate selections, options, numeric ranges, text limits and Unicode whitespace. Numeric answers remain numbers in session state, drafts, exports and stored observations. BE-10's local database upload/readback acceptance passed on 2026-10-03.
- **Generated API types and typed errors.** `pnpm api:types` reads the backend OpenAPI contract. The uploader validates receipts at runtime and maps coded failures through `src/data/api/errors.ts`. Unknown or malformed errors remain retryable with the local record preserved.
- **Two form versions side by side.** The original practice form is now the `shell-v1`
  definition, unchanged in record shape and upload payload. `janet-test-v1` implements the
  candidate subset in [the Janet scope](../docs/Janet-Test-Form-Scope.md) — timestamp and
  initials, play event summary, child age range, both play type slots with their subtypes, CARS
  intensity, and the wildlife branch — excluding all 16 hidden workbook rows.
- **Hidden answers are dropped and reported.** Changing a parent answer removes the answers below
  it, names them and says why, so nothing is saved that the observer can no longer see.
- **Drafts survive a force quit.** Every answer is written to its own SQLite table as it is
  tapped. A draft left behind is offered back as Resume or Discard above the assignments list.
  Drafts are account-scoped and never enter the upload queue.
- **Validation only at review.** The review sheet is act-ordered, jumps back to any question, and
  blocks the save while naming how many required answers are still empty.
- **Map work**: subdued plan and aerial bases from the bundled fixture, markers with a dark halo
  and a light ring that hold on both, zoom-aware clustering into counts with labels at high zoom,
  a grouped layer control with active indicators, edge-anchored callouts on a prior observation,
  grouped zoom/recentre/scale chrome, and a placed point that can be nudged half a metre at a
  time after it lands.
- **Real sync, relabelled.** Records show the existing queue states — held, on device only,
  synced, needs attention — with no send button. There is no contested state, because the API has
  no revisions and no download sync.
- Supabase email/password sign-in, secure session storage, and automatic foreground uploads on
  save, reconnect, startup, and resume. Only a matching server receipt marks a record uploaded.

### What is deliberately not done

- `janet-test-v1` is a **draft** version. `backend/src/fieldmaps_api/schemas.py` accepts only
  `shell-v1`, so records collected against the instrument are held on the device and are never
  queued against a contract the server would reject. Publishing needs a matching API schema, an
  immutable `form_versions` row and a GIS view; that is a follow-up, not this change.
- The wildlife branch has **no supplied export columns**, and the interaction type list is not in
  the workbook. Nothing is invented: the columns are empty, the option list is marked as pending
  and the gaps are shown in the app. The same applies to presenting gender (no export column),
  manufactured loose parts (Test E168 and E169 collide on `Nat_LP_Intn_Binary`) and the natural
  materials checklist (Test G171 says "list to be provided") — all three are carried as protocol
  notes on the form and are read from the site brief rather than shipped as if they were settled.
- Option codes are provisional implementation identifiers, distinct from export column names.
- Site package delivery is **stubbed** behind `PackageProvider`. The three packages on the device
  are bundled with the app; the other rows are fixtures. No download, cellular policy or hosted
  package format is implied.
- GPS accuracy has a place in the record and is stored as `null`: this build asks for no location
  permission, so there is no accuracy to record beside the hand-placed coordinates. Hand
  placement is authoritative and is never overwritten. MapLibre declares the Android location
  permissions in its own manifest; `app.config.ts` blocks both, so the published app declares none.

## Run

Use **Node 24 LTS** and **pnpm 10.17.1**. `.nvmrc` selects Node 24 when using nvm. Node 22.13 or newer is required for the test runner’s real SQLite integration test.

```bash
cd mobile
pnpm install
pnpm ios
```

`pnpm ios` generates the native project, builds a development app, and starts the development server. It needs Xcode and CocoaPods. For Android, use `pnpm android` with an emulator or USB-connected device and the Android SDK configured.

After the first native build, `pnpm start` starts the development server. For an iOS simulator using this computer only, use `pnpm start:simulator` and connect the development client to `http://127.0.0.1:8081`. This pins IPv4 localhost so the server address matches Expo's bundle URL. **Expo Go is not supported** because MapLibre is a native module. A QR code only works with our installed development build.

If the previous server still displays the React Navigation compatibility error, stop it and run `pnpm start --clear`. SDK 56 and newer require Router navigation hooks such as `usePreventRemove` to come from `expo-router/react-navigation`; do not import them from an external `@react-navigation/*` package or disable the compatibility check. See [Expo's migration guide](https://docs.expo.dev/router/migrate/sdk-55-to-56/).

To produce a simulator build with its JavaScript bundled, use:

```bash
pnpm ios --configuration Release
```

This is the appropriate build for testing launch with the development server stopped. A development app normally needs the server to load JavaScript; that is separate from whether map and observation data are local.

This redesign adds native modules — `expo-screen-orientation` for the orientation locks and
`expo-blur` for the map's glass chrome — and loads Inter through `expo-font`. **An existing
development build must be regenerated and rebuilt** before it can open this version:

```bash
EXPO_NO_DOTENV=1 pnpm exec expo prebuild
pnpm ios     # or pnpm android
```

Orientation is one observer choice for the whole app — **Follow the device** (the default),
**Portrait** or **Landscape** — set under "Screen orientation" on the Account and synchronisation
screen. No screen locks or releases orientation on its own, so choosing a round, placing a point,
answering and saving never turn the screen; the field map lays out side by side in landscape and
stacked in portrait. The choice is applied at the root on launch and kept on the device in
`documentDirectory/preferences/orientation.json`, beside the other on-device JSON; it is not tied to
an account and signing out leaves it. A missing or unreadable file means Follow the device; a choice
that cannot be written still applies until the app closes, and the screen says so
(`src/layout/orientation.ts`, rule, storage format and ordering in `orientation-policy.ts`). An iPad
may also turn upside down when following the device or held in portrait. A screen size change, such
as a foldable opening, is re-evaluated. On iPad a lock needs `ios.requireFullScreen`. The app
launches in the device's orientation (`initialOrientation: "DEFAULT"`, an iOS-only setting) and the
root applies the stored choice as soon as JavaScript loads. If the orientation module is missing from
the build, orientation is left free rather than the app refusing to open.

Rotating never resets work in progress: the answers, the open observation, the package, zone and
round live in the session provider above every screen, and the field screen keeps the same component
tree in both layouts, so the map's camera, layers and selection and a half-typed answer stay put.

Android 16 ignores orientation locks on large screens (smallest width 600dp or more) for apps
targeting API 36, which this build does. `plugins/with-large-screen-orientation.js` declares
Google's documented opt-out, `android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY`, so
an observer's Portrait or Landscape choice still holds on a tablet; it takes effect after
`expo prebuild` and a rebuild. The opt-out stops applying once the app targets API 37, and then an
Android tablet follows the device whatever is chosen; every screen still works in either
orientation. iPadOS windowed multitasking (Stage Manager) does not rotate a locked app either.

`eas.json` also provides `development`, `simulator`, and `preview` profiles. Cloud builds have not been created; account/project configuration and physical-iOS signing remain setup tasks. The identifier `com.fieldmaps.collector.dev` is a development placeholder.

## Verify

CON-01/02 verification, September 29, 2026: **137 Vitest tests** pass, including 39 shared contract cases and schema drift checking. TypeScript, full mobile Biome checks and both iOS/Android Metro exports pass. Numeric answers survive SQLite draft close/reopen and observation serialization; practice upload tests remain green. Metro watches `../contracts/` so the native bundles include the canonical JSON. No device run or hosted form publication is claimed.

```bash
pnpm typecheck
pnpm lint
pnpm test
```

The SQLite integration tests use a real temporary database through Node’s SQLite driver and the
same repository functions as the app. They check persistence across connection close/reopen,
duplicate-ID protection, refusal to downgrade a newer schema, and the version 2 to version 3
migration that adds the draft table without touching existing records. They do not substitute for
device testing of Expo’s native SQLite adapter.

Current automated verification, September 22, 2026: **94 Vitest cases** across thirteen files —
the previous 28 for storage, sync and account identity, plus form-definition validation, engine
visibility and pruning, the question-stack reducer, draft persistence and recovery, queueing by
form version, the account and study an observation is bound to, the account a recovered
draft may be resumed under, the atomic save that retires its draft, map clustering, nudging and scale, and
which screens may rotate on which device. TypeScript, Biome on `src/` and the changed routes, and
iOS and Android Metro exports pass.

Orientation change verification, October 7, 2026: the field map no longer holds a tablet in
landscape; one observer choice applies to every screen and is kept on the device. **227 Vitest
cases** pass, including the choice-to-lock mapping on each device, a choice held unchanged across
the workflow's screens, racing choices, restore after relaunch, unreadable storage and a failed
write. TypeScript, Biome and iOS and Android Metro exports pass. Rotation, the locks themselves and
the relocated portrait form toggle have not been run on a device or simulator; step 8 of the
scenario below covers them.

Standing build note, carried forward from the shell: a local Release build previously failed on
Finder metadata attached to a generated `ExpoModulesJSI.framework` in the Desktop workspace. No
successful standalone Release build has been verified.

**The redesigned screens, maps and gestures have not been verified on a device or simulator.**
Native authentication storage was verified separately on October 4, 2026, as described below. The new native modules need a
prebuild and a rebuild first, so the checks above establish types, logic and bundling only — not
rendering, gestures, orientation behaviour, MapLibre markers, native auth, or synchronization
timing. The native acceptance scenario below has not been executed against this version.

Native acceptance scenario for this version:

1. Open the Riverside package, tap the map before arming — confirm nothing is placed and the
   status line does not change. Tap the layer, base, zoom and recentre controls and confirm the
   same.
2. Arm "Place a point" and tap once: confirm one point lands, the mode disarms, and the first
   question opens. Nudge the point and confirm it moves without a new record.
3. Answer a single-choice question and confirm it advances on its own; press Back and confirm it
   returns to the previous **visible** question.
4. Answer the wildlife branch Yes, fill a follow-up, then change it to No: confirm the count of
   dropped answers is reported and the answers are gone.
5. Open Review with a required answer empty: confirm the save is blocked and the missing count is
   named on its row.
6. Force-quit mid-observation and relaunch: confirm the Resume/Discard prompt appears above the
   assignments list with the answers intact.
7. Save a practice (`shell-v1`) record while signed in and connected: confirm it drains with no
   send button. Confirm an instrument record stays on the device and says why.
8. On a tablet held upright with Follow the device chosen, choose a round, open the field map,
   place a point, answer, review and save: confirm the screen stays portrait throughout, every
   screen fills the width, and the map's style and Layers controls are not covered by the form
   toggle. Choose Landscape on the Account screen and repeat the workflow holding the tablet
   upright: confirm every screen stays landscape, and that the choice survives a force quit. Rotate
   mid-answer with Follow the device and confirm the typed answer, the placed point and the map view
   are unchanged. Check phone landscape and portrait on every screen, and confirm 844×390 has no
   horizontal scroll.

## Boundaries

The authenticated upload API and account-scoped queue are implemented. Hosted native sign-in and
two test uploads were exercised before this redesign; the user tested offline save/reconnect, and
both records were independently verified in hosted PostGIS and QGIS Desktop. See
[current acceptance evidence](../docs/Supabase-Setup.md). Those records are `shell-v1`; their
stored shape and upload payload are unchanged here, and they keep listing and uploading.

There is no PowerSync integration, QGIS project importer, edit/download sync, contested-record
resolution, closed-app background upload, or production variable library. The design's "contested"
state is not implemented and is not shown, because the API has no revisions to contest.

Unfinished observations now persist in their own `observation_drafts` table, separate from the
upload queue, and are offered back after a force quit. Uninstalling the app still removes all
local data.

The sample map is hand-authored training geometry and is not a real QGIS export or survey. The
aerial base is a fixture style, not imagery. The Fall Creek Elementary package is the exception:
its bases and layers are the QGIS drawings and drone orthomosaic, generated into
`src/maps/sites/fall-creek/` by `qgis/fall-creek/build.sh` (regenerate, don't edit). It has one
whole-playground zone and collects the practice form under site id `sample-garden`, the only pair
the API accepts today, so its records upload as practice records. A real site package requires its geometry/imagery,
georeferencing, supported formats, and offline-use rights. Package delivery is stubbed behind
`PackageProvider` in `src/packages/`, so ingestion can replace the fixtures without rebuilding the
field flow. Nothing on the field screen touches the network.

The current `expo-sqlite` store implements an append-only upload queue, not a full bidirectional
sync protocol. If PowerSync is selected later, migrate the queue rather than adding a second
writer. Session JSON uses AES-256-GCM in `documentDirectory/auth/<storageKey>`; only its random
256-bit encryption key is in SecureStore (`fieldmaps-auth-key`). The cipher dependency is pinned
to `@noble/ciphers` 2.2.0 ([audit history](https://github.com/paulmillr/noble-ciphers#security)).
Each write gets a fresh nonce and authenticates its storage key. Missing or corrupt session/key
data counts as signed out; a fresh sign-in replaces an unusable key, while native keychain errors
abort writes. The adapter serializes operations and never deletes `auth/last-account.json`.
That file stores only `{userId, email, issuer}` and restores account identity for the matching
issuer after session loss. Deliberate sign-out removes it; account deletion first retains the
separate deleted-account marker so local records remain accessible. Staging upgrades alone
migrate the exact old SecureStore entry, after encrypting it and retaining account identity.
Observation data is not encrypted by an app-level SQLite encryption configuration. Use test data for this development slice.

MOB-02 native verification, October 4, 2026: a real 24,404-byte session from the local Supabase
Auth API persisted across app process termination and relaunch on the iPad Pro 11-inch (M5),
iOS 26.3 simulator, using the fresh `com.fieldmaps.collector.local` development build. The
restored plaintext digest and cached account both matched. The temporary verification entry
was removed afterward; this does not establish the rest of the product acceptance flows.

## Structure

| Path | Responsibility |
| --- | --- |
| `app/` | Routes: assignments, site brief, field, review, saved, records, account |
| `src/forms/` | Form definitions, validation, the visibility engine, and the question-stack reducer |
| `src/forms/fixtures/` | Thin imports of the canonical JSON definitions in `../contracts/forms/` |
| `scripts/contracts-forms.mts` | Generates the shared input JSON Schema from the mobile Zod definition |
| `src/packages/` | The site package interface and the bundled fixture provider |
| `src/session/` | The observation period: package, zone, round, draft persistence, and saving |
| `src/maps/` | Native map, bundled training geometry, the generated Fall Creek site, base styles, and clustering maths |
| `src/domain/` | Observation contracts and the record builder for each form version |
| `src/storage/` | SQLite schema, observation repository, draft store, and focused-screen reads |
| `src/auth/` | Secure session persistence and offline account identity |
| `src/sync/` | Upload protocol, scheduling, and verified receipts |
| `src/layout/` | The observer's orientation choice, its storage, and the tablet/phone layout decisions |
| `src/components/` | Nocturne chrome primitives, the question panel, and screen frames |
| `src/theme.ts` | Nocturne tokens, copied from the design system's own stylesheet |
| `assets/` | App icon, Android adaptive and themed layers, Play Store icon; sources in `assets/icon-source/` |
| `plugins/` | Local config plugins: the Android 16 large-screen orientation opt-out |

The SQLite schema is at version 3: version 1 created the observation table, version 2 added the
account-scoped queue columns, and version 3 adds `observation_drafts`. Migrations run forward
only and refuse to open a newer database.

Native `ios/` and `android/` directories are generated and ignored. Use `app.config.ts` and config plugins for repeatable native configuration. The mobile package has its own dependency lockfile, TypeScript checks, and Biome checks; Next.js tooling is scoped to the separate `web/` directory.

References: [MapLibre Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/), [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).

## Enable the connected development slice

`app.config.ts` selects public `config/development.json`, `config/staging.json` or
`config/production.json` through `APP_ENV` (development by default). EAS profiles set it explicitly
and disable dotenv loading. Local development uses the local Supabase stack and
`com.fieldmaps.collector.local`; staging keeps the lezmq Auth issuer and
`com.fieldmaps.collector.dev` so existing test installs retain SQLite and their session.
Production values are placeholders, not a deployable configuration. `powersyncUrl` stays null.

```bash
EXPO_NO_DOTENV=1 APP_ENV=staging pnpm exec expo config --type public
APP_ENV=staging pnpm ios
```

The loopback API URL is for the iOS simulator. Physical devices need a reachable HTTPS API set
in the appropriate public JSON config. Never include database passwords or service-role keys.
The validator accepts publishable keys and public anon JWTs, including the local stack's anon key.
Expo exposes these values through `extra.connection`.

Legacy SQLite `owner_scope` keys remain frozen at their original localhost URL, lezmq issuer,
account UUID and seeded project UUID until MOB-11. Uploads use the configured API URL separately,
and receipts must match the destination project, account and record. Changing the active project
never changes this legacy key or claims prior local practice records.

`MeProvider` fetches the typed `/v1/me` response on sign-in and foreground resume. `useMe()` exposes
profile, project memberships, active project and refresh errors. The last verified response and
project selection live in an issuer/account-scoped file for offline starts. The default project is
the first non-Training membership, falling back to Training. Removed memberships reset selection.
A deleted-account response stops authenticated uploads, signs out locally, and retains account
identity and SQLite records for later cleanup/export. Ordinary sign-out still hides account records.

Failed refresh or unexpected session loss retains the cached account and its scoped SQLite
records, including after restart. Uploads pause without a session. The shared screen banner says
"Sign in to resume uploads" and opens the existing Account sign-in form with the cached email
prefilled. Deleted accounts keep their deletion notice rather than offering sign-in recovery.
Deliberate sign-out removes the cached identity and hides its records until that account signs in
again. MOB-08's local tests exercise the provider's auth-event boundary and real SQLite/file
close/reopen with two accounts, token refresh during deliberate sign-out, account switching, and
an identity-cache filesystem failure. A cache-write warning remains visible after session loss
until a successful durable identity write or deliberate sign-out. This recovery screen flow has
not been verified natively.

iOS UI check (2026-10-04): the normal iOS entry bundled, but the simulator UI check did not reach
the Account screen; recovery-banner and email-prefill UI acceptance remains unverified.

Local verification (2026-10-04): mobile TypeScript, Biome and 193 Vitest cases pass. Tests cover
old owner-scope read visibility, a configured upload host distinct from the frozen key, receipt
identity mismatches, typed API errors, cached/missing/stale project selections, deleted-account restart with lingering
credentials, and failed marker writes/sign-out attempts. Staging public
Expo config and an iOS Metro export both pass. No simulator, device, hosted write or release build was tested.

Records move from pending to uploaded only after a matching observation/account/project receipt. Connection/server failures retry with persisted backoff. Rejections preserve the record and show “needs attention”; the Account screen provides an explicit retry. Uploads run while the app is foregrounded; closing the app pauses work until it opens again. Uninstalling removes pending local records.

Connected acceptance scenario:

1. Sign in online to an assigned test account, then disconnect and save a point.
2. Close/reopen the app offline and verify the point remains pending under that account.
3. Reconnect with the app open; verify its status becomes uploaded and the UUID appears once in PostGIS.
4. Interrupt a response and retry; verify no duplicate, then sign out/in and verify account separation.
5. Open the [configured QGIS project](../qgis/README.md) using its scoped read-only database account and refresh its layer; verify the same location and answers. This connection was verified with both test observations on September 18, 2026.

The next slice is publishing `janet-test-v1`: a matching API schema accepting both versions during
transition, an immutable `form_versions` row, and a typed GIS view for its answers. The open
protocol decisions listed in [the Janet scope](../docs/Janet-Test-Form-Scope.md) — the missing
export columns, the loose-parts collision, the natural materials list, and which answers carry
forward — must be settled first; the collector surfaces every one of them on the site brief.
