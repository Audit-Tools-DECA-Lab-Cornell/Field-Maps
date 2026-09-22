# FieldOps mobile shell

A native iOS/Android starting point for offline map observations. This app is independent of the Next.js prototype in `../web/`. The [product workspace](../docs/Workspace.md) provides root command aliases while preserving this app's dependencies and lockfile.

## What is implemented

- A site workspace and bundled fictional garden map, rendered by MapLibre without external tiles, fonts, map accounts, or GPS permission.
- Tap-to-place observations with observer initials, a people count, and optional notes. This is a practice form, not Janet’s finalized instrument.
- Transactional local SQLite saves with UUIDs, coordinates, timestamps, a form version, and account-scoped upload status. Existing practice records remain local-only.
- A saved-observation list, map markers, validation, save-error handling, and confirmation before abandoning an unsaved form.
- Expo Router navigation, safe-area handling, flexible tablet/phone layouts, and development/preview build profiles.
- Supabase email/password sign-in, secure session storage, and automatic foreground uploads on save, reconnect, startup, and resume. Only a matching server receipt marks a record uploaded.

## Run

Use **Node 24 LTS** and **pnpm 10.17.1**. `.nvmrc` selects Node 24 when using nvm. Node 22.13 or newer is required for the test runner’s real SQLite integration test.

```bash
cd /Users/praty/Desktop/StudentJob.nosync/field-ops/mobile
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

`eas.json` also provides `development`, `simulator`, and `preview` profiles. Cloud builds have not been created; account/project configuration and physical-iOS signing remain setup tasks. The identifier `com.fieldops.collector.dev` is a development placeholder.

## Verify

```bash
pnpm typecheck
pnpm lint
pnpm test
```

The SQLite integration tests use a real temporary database through Node’s SQLite driver and the same repository functions as the app. They check persistence across connection close/reopen, duplicate-ID protection, and refusal to downgrade a newer schema. They do not substitute for device testing of Expo’s native SQLite adapter.

The initial shell was verified on September 17, 2026 with TypeScript, Biome, six tests, and iOS/Android Metro exports. The installed development build opens on the iPhone 17 Pro simulator (iOS 26.5) and renders the sample map. A form opened through the app link rejected an empty count, saved a test observation, and retained its initials, count, and coordinates after terminating and relaunching the app. That QA record remains in the simulator. Map tapping, draft-discard interaction, landscape/tablet layouts, Android runtime, and a fully disconnected launch still require the acceptance checks below.

The attempted local Release build encountered Finder metadata on a generated `ExpoModulesJSI.framework` in the Desktop workspace. No successful standalone Release build has been verified; the simulator check above used the existing development build with Metro running.

Native acceptance scenario:

1. Open the sample site, tap the map, and confirm the selected coordinates appear.
2. Try saving without completing required fields; confirm no record is added. Then enter test initials, a count, and a note, and save.
3. Confirm the saved list contains the same values, then return to the map and check its marker.
4. Close and reopen the app; confirm the saved record remains. Repeat in a bundled build without a development server or internet.
5. Open a second observation, type something, then go back; confirm the draft-discard prompt appears. Check portrait and landscape on the target tablets.

## Boundaries

The authenticated upload API and account-scoped queue are implemented. Hosted native sign-in and two test uploads have been exercised; the user tested offline save/reconnect, and both records were independently verified in hosted PostGIS and QGIS Desktop. See [current acceptance evidence](../docs/Supabase-Setup.md). There is no PowerSync integration, QGIS project importer, edit/download sync, or production variable library yet. Only saved observations survive termination; unfinished form drafts are not persisted. Uninstalling the app removes its local data.

The sample map is hand-authored training geometry and is not a real QGIS export or survey. A real site package requires its geometry/imagery, georeferencing, supported formats, and offline-use rights. Keep map rendering in `src/maps` so that package ingestion can replace the sample without rebuilding the form flow.

The current `expo-sqlite` store implements an append-only upload queue, not a full bidirectional sync protocol. If PowerSync is selected later, migrate the queue rather than adding a second writer. Session tokens use SecureStore; observation data is not encrypted by an app-level SQLite encryption configuration. Use test data for this development slice.

## Structure

| Path | Responsibility |
| --- | --- |
| `app/` | Navigation and screens |
| `src/maps/` | Native map and bundled training geometry |
| `src/domain/` | Parsing and observation contracts |
| `src/storage/` | SQLite schema, repository, and focused-screen reads |
| `src/auth/` | Secure session persistence and offline account identity |
| `src/sync/` | Upload protocol, scheduling, and verified receipts |
| `src/components/` | Form and reusable screen controls |

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

Current automated verification: 28 mobile tests cover SQLite v1 migration, account isolation, disk reopen/backoff, concurrent drains, late account responses, missing tokens, receipt validation, HTTP failure classifications, and cached offline identity. TypeScript/Biome and iOS/Android bundle checks pass. The updated practice workspace and Account screen also rendered on the existing iPhone 17 Pro simulator build, with its previous local observation still visible. These checks do not establish native auth, real reconnect timing, or physical-device synchronization.

Connected acceptance scenario:

1. Sign in online to an assigned test account, then disconnect and save a point.
2. Close/reopen the app offline and verify the point remains pending under that account.
3. Reconnect with the app open; verify its status becomes uploaded and the UUID appears once in PostGIS.
4. Interrupt a response and retry; verify no duplicate, then sign out/in and verify account separation.
5. Open the [configured QGIS project](../qgis/README.md) using its scoped read-only database account and refresh its layer; verify the same location and answers. This connection was verified with both test observations on September 18, 2026.

The next implementation slice is the [versioned Janet test form](../docs/Janet-Test-Form-Scope.md), with explicit conditional rules and preserved practice-form compatibility.
