# FieldOps mobile collector

A native iOS/Android collector for observational play research: a researcher on a playground
marks a child on a site map and answers a conditional questionnaire, usually offline, often
one-handed, often in sun. This app is independent of the Next.js prototype in `../web/`. The
[product workspace](../docs/Workspace.md) provides root command aliases while preserving this
app's dependencies and lockfile.

The interface follows `../designs/Riverside Collector v2.dc.html` and the Nocturne design
system in `../designs/_ds/nocturne-0f5393a7-e60a-4d31-be24-f93ea06f52be/`. Tablet landscape
(1024×768) is the primary target, then phone landscape (844×390); phone portrait stacks the map
over the panel.

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

- `janet-test-v1` is a **draft** version. `backend/src/fieldops_api/schemas.py` accepts only
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
- Site package delivery is **stubbed** behind `PackageProvider`. The two packages on the device
  are bundled with the app; the other rows are fixtures. No download, cellular policy or hosted
  package format is implied.
- GPS accuracy has a place in the record and is stored as `null`: this build asks for no location
  permission, so there is no accuracy to record beside the hand-placed coordinates. Hand
  placement is authoritative and is never overwritten.

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

Tablets are locked to landscape, which on iPad also requires `ios.requireFullScreen`. Phones open
in landscape and may be turned upright. If the orientation module is missing, orientation is left
free rather than the app refusing to open.

`eas.json` also provides `development`, `simulator`, and `preview` profiles. Cloud builds have not been created; account/project configuration and physical-iOS signing remain setup tasks. The identifier `com.fieldops.collector.dev` is a development placeholder.

## Verify

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

Current automated verification, September 22, 2026: **80 Vitest cases** across twelve files —
the previous 28 for storage, sync and account identity, plus form-definition validation, engine
visibility and pruning, the question-stack reducer, draft persistence and recovery, queueing by
form version, the account and study an observation is bound to, the atomic save that
retires its draft, and map clustering, nudging and scale. TypeScript, Biome, and iOS and Android Metro
exports all pass.

Standing build note, carried forward from the shell: a local Release build previously failed on
Finder metadata attached to a generated `ExpoModulesJSI.framework` in the Desktop workspace. No
successful standalone Release build has been verified.

**No part of this redesign has been run on a device or simulator.** The new native modules need a
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
8. Check tablet landscape-only, phone landscape and portrait, and confirm 844×390 has no
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
aerial base is a fixture style, not imagery. A real site package requires its geometry/imagery,
georeferencing, supported formats, and offline-use rights. Package delivery is stubbed behind
`PackageProvider` in `src/packages/`, so ingestion can replace the fixtures without rebuilding the
field flow. Nothing on the field screen touches the network.

The current `expo-sqlite` store implements an append-only upload queue, not a full bidirectional
sync protocol. If PowerSync is selected later, migrate the queue rather than adding a second
writer. Session tokens use SecureStore; observation data is not encrypted by an app-level SQLite
encryption configuration. Use test data for this development slice.

## Structure

| Path | Responsibility |
| --- | --- |
| `app/` | Routes: assignments, site brief, field, review, saved, records, account |
| `src/forms/` | Form definitions, validation, the visibility engine, and the question-stack reducer |
| `src/forms/fixtures/` | The versioned `shell-v1` and `janet-test-v1` definitions |
| `src/packages/` | The site package interface and the bundled fixture provider |
| `src/session/` | The observation period: package, zone, round, draft persistence, and saving |
| `src/maps/` | Native map, bundled training geometry, base styles, and clustering maths |
| `src/domain/` | Observation contracts and the record builder for each form version |
| `src/storage/` | SQLite schema, observation repository, draft store, and focused-screen reads |
| `src/auth/` | Secure session persistence and offline account identity |
| `src/sync/` | Upload protocol, scheduling, and verified receipts |
| `src/layout/` | Orientation preference and the tablet/phone layout decisions |
| `src/components/` | Nocturne chrome primitives, the question panel, and screen frames |
| `src/theme.ts` | Nocturne tokens, copied from the design system's own stylesheet |

The SQLite schema is at version 3: version 1 created the observation table, version 2 added the
account-scoped queue columns, and version 3 adds `observation_drafts`. Migrations run forward
only and refuse to open a newer database.

Native `ios/` and `android/` directories are generated and ignored. Use `app.json` and config plugins for repeatable native configuration. The mobile package has its own dependency lockfile, TypeScript checks, and Biome checks; Next.js tooling is scoped to the separate `web/` directory.

References: [MapLibre Expo setup](https://maplibre.org/maplibre-react-native/docs/setup/expo/), [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/).

## Enable the connected development slice

`connection.config.json` is now configured for the FieldOps Supabase development project. See [current setup status](../docs/Supabase-Setup.md). Setting it to `{ "connection": null }` restores standalone practice mode without accounts or a server. The new native modules load only for a configured connection. Regenerate the native configuration with `EXPO_NO_DOTENV=1 pnpm exec expo prebuild`, then rebuild with `pnpm ios` or `pnpm android` before enabling sign-in. The SecureStore plugin configures its native storage settings.

Set these public values when the development auth project is ready:

```json
{
  "connection": {
    "apiUrl": "http://127.0.0.1:8000",
    "supabaseUrl": "https://YOUR_PROJECT.supabase.co",
    "publishableKey": "sb_publishable_REPLACE_WITH_PUBLIC_KEY",
    "projectId": "10000000-0000-4000-8000-000000000002"
  }
}
```

The loopback URL is for the iOS simulator. Physical devices need a reachable HTTPS API; the current Docker port is intentionally bound to the development computer only. Android can use an emulator port reverse or a reachable HTTPS development endpoint. Never put a database password or Supabase secret/service-role key in this file. Configure the matching issuer/JWKS and test membership in the [backend setup](../backend/README.md).

The queue is scoped by API URL, auth issuer, account UUID, and project UUID. Signing in does not claim previous practice records. Signing out hides the account's records; signing back into the same connection restores them. Cached account identity supports offline collection even after a token expires; only a fresh, server-verified token authorizes an upload. The API remains the authority for access.

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
