# Mobile collector plan (`mobile/`)

This file is part of the [FieldMaps production plan](../docs/plan/README.md) and defines the `MOB-*` tasks. Related plan files:
- The sync design is in [sync-powersync.md](../docs/plan/sync-powersync.md). Its tasks here are MOB-09 to MOB-12.
- The API shapes are in [contracts.md](../docs/plan/contracts.md).
- The user journeys are J2 and J4 in [product.md](../docs/plan/product.md#journeys-the-pilot-must-support).
- The API side of each flow is in [backend/PLAN.md](../backend/PLAN.md).
- The hosted setup (SMTP, templates, EAS, stores) is in [operations.md](../docs/plan/operations.md).

**Skills to load** when working here: `mobile-design`, `react-native-architecture`, `expo-best-practices`, `offline-sync-designer`, and `mobile-version-bump` at the end of a task that changes the app.

## Context (verified 2026-09-22)

**Stack**
- Expo SDK 57.0.23, expo-router 57, RN 0.86.3, React 19.2.3, supabase-js 2.116, MapLibre RN 11.3.10, expo-sqlite, zod 4.
- 94 Vitest cases. Nothing in the current redesign has run on a device yet (`mobile/README.md:152`).

**Shell**
- One flat `Stack` (`app/_layout.tsx:43-49`), with no auth gate.
- Routes: `index` (assignments), `brief`, `field`, `review`, `saved`, `records`, `account`.

**Auth**
- The only call is `signInWithPassword` in `app/account.tsx:43`. Every error shows the same message.
- The whole session is kept in SecureStore (`src/auth/client.ts:14-18`), which risks the 2048-byte limit.
- On `SIGNED_OUT`, records disappear from view (`src/auth/provider.tsx:56` plus `src/storage/use-observations.ts:49`).
- Sign-up, verification, password reset, deep links and account deletion do not exist.

**Configuration** (`connection.config.json`)
- `apiUrl` is `http://127.0.0.1:8000`, and the fixed `projectId` is the seeded practice project.
- The scope key includes `apiUrl` (`src/sync/contracts.ts:12-14`), so changing hosts orphans records.

**Fixtures**
- `src/packages/bundled.ts` holds 4 studies, 2 of them fake.
- `src/maps/sample-site.ts` holds hand-drawn geometry.
- `src/forms/fixtures/*` holds `shell-v1` and `janet-test-v1` (draft).
- The site ID is hard-coded as `"sample-garden"` (`src/domain/observation.ts:30`).
- The queue only accepts `shell-v1` (`src/storage/sync-store.ts:29`).

**Worth keeping.** Reuse these as they are:
- the form engine (`src/forms/engine.ts`, `definition.ts`);
- the draft ownership rules (`src/session/ownership.ts`);
- `PackageProvider` (`src/packages/site-package.ts:60-63`);
- the Nocturne chrome (`src/components/chrome.tsx`);
- clustering and orientation policy;
- the idempotent upload-receipt ideas.

## Target structure

```
mobile/
  app.config.ts                 reads config/<APP_ENV>.json (MOB-01)
  config/{development,staging,production}.json   public values only
  app/
    _layout.tsx                 providers + Stack.Protected gates (MOB-03)
    (auth)/  welcome, sign-in, create-account, verify, forgot-password, reset
    (onboarding)/  profile, join
    (app)/(tabs)/  studies, records, account        tablet: side rail (MOB-16)
    (app)/study/[siteId]/  brief, collect, review   collect hides tabs
    (app)/records/[id]
  src/
    features/<area>/            screens' logic and components
    domain/                     forms engine, record builder (pure)
    data/                       powersync/{schema,connector,db}.ts, api/{client,schema.d.ts,errors}.ts, files/
    platform/                   auth-storage (LargeSecureStore), network, location (later)
```

## Tasks

### MOB-01: Environment configuration per build profile
Status: todo · Phase 0 · Size S · Depends: none (the staging URL comes later from OPS-04) · Blocks: MOB-04, MOB-09, MOB-20
Read first: `connection.config.json`, `src/sync/config.ts`, `app.json`, `eas.json`, `package.json` scripts (`EXPO_NO_DOTENV=1`).
Do:
1. Convert `app.json` to `app.config.ts`, with the same values. It reads `APP_ENV` (`development`, `staging` or `production`; default `development`) and loads `config/<APP_ENV>.json`.
2. Each config file holds public values only:
   - `apiUrl`
   - `supabaseUrl`
   - `publishableKey`
   - `powersyncUrl` (null until OPS-08)
   - `bundleIdSuffix`
3. Drop `projectId`. The project now comes from `/v1/me` (MOB-04).
4. Expose the config through `expo-constants` `extra`, and keep the zod validation now in `src/sync/config.ts`, moved to `src/platform/config.ts`. Keep the rule that plain HTTP is allowed only for localhost.
5. Set `APP_ENV` per profile in `eas.json` `env`. Keep `EXPO_NO_DOTENV=1`.
6. Bundle identifiers:
   - development keeps `com.fieldmaps.collector.dev`;
   - staging and production use placeholders until Q1 is answered ([decisions.md](../docs/plan/decisions.md#open-questions)).

Done when: `APP_ENV=staging pnpm exec expo config --type public` shows the staging values; typecheck and tests pass.

### MOB-02: Session storage that fits (LargeSecureStore)
Status: todo · Phase 1 · Size M · Depends: MOB-01 · Blocks: MOB-05, MOB-09
Read first: `src/auth/client.ts`, `src/auth/cached-account.ts`; <https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native>.
Do:
1. Add `src/platform/auth-storage.ts`, which implements supabase-js `storage` like this:
   - a random 256-bit key, kept in SecureStore under `fieldmaps-auth-key`;
   - the AES-encrypted session JSON, written to `documentDirectory/auth/<storageKey>` with `expo-file-system`.
   - Use `expo-crypto` for random bytes and a small audited AES library, and pin its version.
2. **Migration:** on first run, if the old SecureStore value exists, move it into the new store and delete the old entry.
3. Keep `cachedAccount` working: it now reads from the new store.
4. Add unit tests with mocked SecureStore and file system: round trip, migration, a missing key, and a corrupt file (which counts as signed out, not a crash).

Done when: the tests pass, and a real session larger than 2 KB persists across restarts on the simulator.

### MOB-03: Route groups and auth gates
Status: todo · Phase 1 · Size M · Depends: MOB-01 · Blocks: MOB-05, MOB-06, MOB-16
Read first: `app/_layout.tsx`, every file in `app/`, `src/auth/provider.tsx`, `src/session/provider.tsx`.
Do:
1. Create the groups `(auth)`, `(onboarding)` and `(app)`. Move the existing screens under `(app)`, unchanged in behaviour.
2. In `_layout.tsx`, use `Stack.Protected guard={…}`:
   - `(auth)` when there is neither a session nor a cached account;
   - `(onboarding)` when the profile has no display name or initials (from MOB-04's cached `/v1/me`);
   - `(app)` otherwise.
3. **Offline rule:** a cached account with an expired session still reaches `(app)`. It never falls back to `(auth)` while local records exist.
4. Add a `+not-found` route.

Done when:
- a fresh install lands on the welcome screen;
- a signed-in user with a profile lands on Studies;
- the tests for the gate-selection function pass.

### MOB-04: API client and the current user (`/v1/me`)
Status: todo · Phase 1 · Size M · Depends: MOB-01, BE-06, CON-03, CON-04 · Blocks: MOB-03 (profile gate), MOB-06, MOB-07
Do:
1. Create `src/data/api/client.ts`: ky with the base URL from config, a Bearer token from the current session, typed with the generated `schema.d.ts`, and errors mapped by `errors.ts` (CON-04).
2. Create a `useMe()` hook:
   - fetch `/v1/me` on sign-in and on resume;
   - cache the last response in the file store for offline starts;
   - expose `profile`, `projects` and `activeProjectId`. The active project is persisted, and defaults to the first project that is not Training, otherwise Training.
3. Replace every use of `connection.projectId` and the old `SyncScope` project with `activeProjectId`.

Done when: an offline start shows the last known projects; the tests cover cache hit, cache miss and a stale-cache refresh.

### MOB-05: Authentication screens
Status: todo · Phase 1 · Size L · Depends: MOB-02, MOB-03, OPS-02, OPS-03 (real email; locally, Mailpit from DB-02) · Blocks: MOB-06, MOB-21
Read first: [product.md](../docs/plan/product.md) J2; `app/account.tsx` (current form styles); `src/components/chrome.tsx`; `designs/_ds/nocturne-*/readme.md`. There is **no design** for auth screens yet. Follow the Nocturne primitives, and keep each screen to a single primary action at the bottom (thumb zone).
Do:
1. `(auth)/welcome`: app name, "Create account", "Sign in".
2. `(auth)/sign-in`:
   - email and password, with autofill hints;
   - a distinct message for each case: wrong credentials, email not confirmed (with a button that resends the code and goes to verify), rate limited, offline;
   - a "Forgot password" link.
3. `(auth)/create-account`:
   - email, password (at least 8 characters, with a show/hide toggle);
   - `supabase.auth.signUp`, then go to verify.
4. `(auth)/verify`:
   - 6 digits, using a one-time-code autofill input;
   - `verifyOtp({email, token, type: 'email'})`;
   - "Resend code" with a 60-second cooldown (`auth.resend`);
   - a clear error for an expired code.
5. `(auth)/forgot-password`, then `(auth)/reset`:
   - `resetPasswordForEmail`, then `verifyOtp({type: 'recovery'})`, then `updateUser({password})`.
6. Every screen:
   - `KeyboardAvoidingView`;
   - a heading with `accessibilityRole="header"`;
   - errors announced to screen readers;
   - tap targets of at least 44 pt.

Done when: every flow works against the local stack, with codes read from Mailpit. Unit tests cover the mapping from errors to messages.

Verify: `pnpm --dir mobile typecheck && pnpm --dir mobile test`, plus a manual simulator run recorded in the task notes.

### MOB-06: Onboarding: profile and join
Status: todo · Phase 1 · Size M · Depends: MOB-04, MOB-05, BE-06, BE-07, DB-07 · Blocks: MOB-21
Do:
1. `(onboarding)/profile`:
   - display name and initials (uppercase, at most 10 characters), saved with `PATCH /v1/me`;
   - the initials become the observer code on every record. Remove the initials question from the form flow once MOB-13 lands.
2. `(onboarding)/join`:
   - an 8-character code input (auto-uppercase, dashes ignored), sent to `POST /v1/invitations/redeem`;
   - the explanation "You're already in Training — you can practise now";
   - "Skip for now".
3. Deep link `fieldmaps://join?code=XXXX` opens join with the code filled in (use `expo-linking`), and needs no session exchange.
4. After a join succeeds, refresh `/v1/me` and set the active project to the one joined.

Done when: a newly signed-up user reaches Studies with Training, and after entering a valid code they also see the joined project.

### MOB-07: Account tab: profile, sync status, sign out, delete account
Status: todo · Phase 1 · Size M · Depends: MOB-04, BE-08 · Blocks: OPS-11, MOB-21
Do:
1. The Account screen shows:
   - profile editing;
   - the active project switcher;
   - sync status (pending count, last successful sync).
2. **Sign out:**
   - if unsent records exist (the pending count; after MOB-10, `getUploadQueueStats()`), show a confirm dialog naming the count, and explain they upload when this account signs in again on this device;
   - use `signOut({scope: 'local'})`, and clear the local session **even when offline**.
3. **Delete account:**
   - a two-step confirm that names the consequences;
   - call `DELETE /v1/me` and handle `sole_owner` with a message pointing to the web;
   - on success, sign out and delete this user's local database and files.
4. Remove the developer copy from this screen (`app/account.tsx:142-146`).

Done when: the flows work on the simulator against the local stack, and deleting an account removes the user's local files.

### MOB-08: Never hide records on session loss
Status: todo · Phase 1 · Size S · Depends: MOB-04 · Blocks: none
Read first: `src/auth/provider.tsx:48-58`; `src/storage/use-observations.ts:49`.
Do:
1. Distinguish a user-initiated sign-out from a failed refresh. On a failed refresh, keep the cached account and show the banner "Sign in to resume uploads", with a button that opens sign-in pre-filled with the email.
2. Records stay visible under the cached account in every case except a deliberate sign-out.

Done when: tests simulate `SIGNED_OUT` from a failed refresh and confirm the records stay visible.

### MOB-09: PowerSync foundation (database, schema, provider)
Status: todo · Phase 2 · Size L · Depends: SYNC-01 (passed), SYNC-02, OPS-08, MOB-01 · Blocks: MOB-10, MOB-11, MOB-12, MOB-13, MOB-14
Read first: [sync-powersync.md](../docs/plan/sync-powersync.md) (client design); `src/storage/*`; `app/_layout.tsx`.
Do:
1. Install `@powersync/react-native` 2.3.x and `@op-engineering/op-sqlite` (≥17.1, <19) with `pnpm expo install`.
2. Remove `expo-sqlite` and its plugin.
3. Add a config plugin that sets `expo.updates.useThirdPartySQLitePod: true`.
4. Create `src/data/powersync/schema.ts`:
   - synced tables that mirror the SYNC-02 streams;
   - local-only tables `drafts`, `package_files` and `migration_state`.
5. Create `src/data/powersync/db.ts`: one database per user (`fieldmaps-{userId}.db`), opened after the account is known, and closed on account change.
6. Add the provider to `_layout.tsx`, replacing `SQLiteProvider` and `SyncProvider`. Read data with `useQuery` and state with `useStatus`.
7. Connector `fetchCredentials` returns `{endpoint: config.powersyncUrl, token: session.access_token}`.
8. Keep the `LocalDatabase` port only if the tests still need it; otherwise delete `src/storage/*` once MOB-11 and MOB-12 are done.
9. **Prebuild and native rebuild are required.** Record the commands in `mobile/README.md`.

Done when: signed in on staging, the simulator shows the user's memberships and projects coming from PowerSync.

### MOB-10: Upload connector and record states
Status: todo · Phase 2 · Size M · Depends: MOB-09, BE-12 · Blocks: MOB-11, QA-03
Do:
1. `uploadData()`:
   - take `getCrudBatch(50)` and map each operation to the observation envelope;
   - `POST /v1/sync/upload`;
   - throw only on 401, 408, 429, 5xx or a network error; otherwise call `.complete()`.
2. Record states for the Records tab, as defined in sync-powersync.md: on device, uploading, uploaded, needs attention. Show a rejection's `code` and `message` on the record.
3. Remove the old coordinator and upload code (`src/sync/*`) once the tests are ported.

Done when: the tests with a fake database and fake HTTP cover the accepted, replayed, rejected and transient cases, and a rejected record stays visible.

### MOB-11: One-time migration from the old database
Status: todo · Phase 2 · Size M · Depends: MOB-09, MOB-10 · Blocks: QA-03
Read first: `src/storage/observation-store.ts` (schema v3); [sync-powersync.md](../docs/plan/sync-powersync.md).
Do:
1. On the first launch of the new build, if `SQLite/fieldmaps-shell.db` exists and `migration_state` has no entry:
   1. open it read-only with op-sqlite;
   2. copy the `pending` and `needs-attention` rows for the current account's scope into `observations`, keeping each UUID and mapping `shell-v1` to its server form version;
   3. copy `local-only` rows and drafts into local-only tables, labelled as practice;
   4. write `migration_state`.
2. Delete the old file only after `getUploadQueueStats().count == 0` **and** a completed sync.
3. Every step must be safe to repeat after a force-quit.

Done when: tests run with a real v3 fixture database, built with the existing node:sqlite helpers from `observation-store.test.ts`, and a simulator upgrade test is recorded in QA-03.

### MOB-12: Drafts on PowerSync local-only tables
Status: todo · Phase 2 · Size M · Depends: MOB-09 · Blocks: MOB-13
Do:
1. Port `src/storage/draft-store.ts` and the ownership rules (`src/session/ownership.ts`) to the local-only `drafts` table.
2. Key drafts by `(user, project, id)`, so more than one project can have an open draft.
3. Keep every existing draft test, adapted.

Done when: the draft tests pass, and a force-quit mid-observation offers Resume or Discard.

### MOB-13: Forms from the server, and a generic observation record
Status: todo · Phase 2 · Size L · Depends: MOB-09, MOB-12, CON-02, DB-09 · Blocks: MOB-15
Read first: `src/forms/registry.ts`, `src/domain/observation.ts`, `src/domain/build-observation.ts`, `src/session/provider.tsx:340-360`; the envelope in [contracts.md](../docs/plan/contracts.md#observation-envelope-sync-upload-and-storage).
Do:
1. The registry becomes an async repository over synced `form_versions` with `state = 'published'`. Every definition passes `parseFormDefinition` before use; one that fails is shown as "form unavailable", never crashes.
2. Replace the version-literal union in `observation.ts` with the generic envelope:
   - answers keyed by question `id`;
   - numbers as numbers;
   - `observer_code` taken from the profile.
3. Move the summary question and carried-forward answers into definition properties, since `janet-test-v1` currently hard-codes them in TS.
4. Delete `src/forms/fixtures/*`. The tests load `contracts/forms/*.json` instead.

Done when: the brief, field and review screens work against a synced published form. The shared cases pass, and no TypeScript branches on a form version string.

### MOB-14: Hosted site packages
Status: todo · Phase 2 · Size L · Depends: MOB-09, BE-13 · Blocks: MOB-15
Read first: `src/packages/site-package.ts`, `src/packages/bundled.ts`, `src/maps/field-map.tsx`; the manifest format in `backend/src/fieldmaps_api/packages.py:127-137`.
Do:
1. Studies list:
   - sites from sync, with `current_package_id`;
   - status "On device", "Download (12 MB)", or "Update available (v4 → v5)".
2. Download:
   - `GET …/packages/{id}/download` returns a signed URL;
   - download to `documentDirectory/packages/{id}/archive.zip.partial` with expo-file-system;
   - verify the sha256 (expo-crypto);
   - unzip with `fflate`;
   - verify each layer's sha256 against the manifest;
   - atomically rename, and record it in `package_files`.
3. **Cellular policy.** When NetInfo reports `isConnectionExpensive`, ask first and show the size. Wi-Fi downloads start without asking.
4. `HostedPackageProvider` implements `PackageProvider` and maps the manifest to `SitePackage`. Bases are built from `ground` as `sample-site.ts` does today; zones come from polygons with their centroids; the style is a client preset.
5. **Retention.** Keep older versions while a draft or pending record references them.
6. Delete `src/packages/bundled.ts`. The Training site comes from the server (BE-13 step 6).

Done when: a staging package downloads, verifies and opens in the field map. Tests cover sha256 mismatch, a partial download that resumes cleanly, and retention.

### MOB-15: Remove the remaining fixtures and developer copy
Status: todo · Phase 2 · Size M · Depends: MOB-13, MOB-14 · Blocks: QA-05
Do:
1. Walk the mobile rows of the [fixture inventory](../docs/plan/architecture.md#fixture-inventory). Delete `src/maps/sample-site.ts` if it is unused, and the `"sample-garden"` literal.
2. Replace developer copy aimed at builders with copy for field users:
   - `app/index.tsx:134-152`
   - `brief.tsx:144`
   - `review.tsx:180-183`
   - `saved.tsx:32-55`
   - `records.tsx:153-157`
   - `src/session/provider.tsx:136,271-273`
   - `src/auth/provider.tsx:99-100`
   - `src/sync/provider.tsx:87`
3. Show protocol notes for Janet only to managers.

Done when: `grep -rn "fixture\|stub\|not built\|sample-garden\|Protocol question" mobile/app mobile/src` finds no hits outside tests.

### MOB-16: Navigation and information architecture overhaul
Status: todo · Phase 4 · Size L · Depends: MOB-03, MOB-15 · Blocks: MOB-17
Read first: `designs/Riverside Collector v2.dc.html` (grep the screen names); `designs/Handoff.dc.html` (behaviour spec only; its tokens conflict with Nocturne); `src/layout/*`.
Do:
1. Tabs: Studies, Records (with a badge for pending and needs-attention counts), Account. On tablets (smallest width 600 dp or more), use a side rail.
2. The field screen is `study/[siteId]/collect`: full screen, tabs hidden. The tablet landscape lock is kept (`src/layout/orientation.ts`).
3. Review is a sheet over the field screen. "Saved" is a banner on the field screen, not a separate route. Use no transition between repeated observations, as Handoff specifies.
4. Primary actions ("Start observing", "Save observation") sit in a pinned bottom bar. Remove the top-left back links in favour of system back and tabs.
5. Records rows open `records/[id]`, which shows the state, the answers and any rejection.

Done when: every route from the target structure exists, and the orientation tests still pass.

### MOB-17: A state for every screen
Status: todo · Phase 4 · Size M · Depends: MOB-16 · Blocks: QA-05
Do:
1. Give each screen these states: loading, empty, error with retry, offline, signed-out, no membership (only Training), and expired session (the banner from MOB-08).
2. Add a connectivity indicator in the chrome.
3. Studies must not show "No studies waiting" while it is still loading (`app/index.tsx:36,109`).

Done when: every screen has a snapshot or unit test for each state, or a documented manual check.

### MOB-18: Accessibility
Status: todo · Phase 4 · Size M · Depends: MOB-16 · Blocks: none
Do:
1. Placing a point: add "crosshair + Place here", so a screen-reader or motor-impaired user can place without tapping an arbitrary map position.
2. Tap targets of at least 44 pt. Today these are smaller:
   - the panel toggle (22×54), `app/field.tsx:201-203`;
   - the cluster marker (36), `src/maps/field-map.tsx:173`;
   - the callout close button (36);
   - the layer rows (42).
3. Headings get `accessibilityRole="header"`.
4. Announce status-line messages with `AccessibilityInfo.announceForAccessibility`.
5. Raise neutral-600 text and placeholders to at least 4.5:1 contrast, and set `maxFontSizeMultiplier` sensibly.

Done when: a VoiceOver pass through J2 is recorded in the task notes.

### MOB-19: Design-system cleanup (Nocturne), together with web
Status: todo · Phase 4 · Size M · Depends: none · Blocks: none
Do:
1. Remove the hard-coded hex values (`src/components/chrome.tsx:229,231`, `src/maps/field-map.tsx:317,453,471,481`).
2. Align chips, ghost buttons, pressed states and input focus with `designs/_ds/nocturne-*/styles.css`.
3. Adopt Phosphor icons (`phosphor-react-native`).
4. Make any token change in `web/src/app/globals.css` in the same change (the `web/AGENTS.md` rule).

Done when: no hex literal remains outside `src/theme.ts`.

### MOB-20: Release engineering
Status: todo · Phase 4 · Size M · Depends: MOB-01, Q1 (app name and bundle ID) · Blocks: OPS-11
Do:
1. EAS profiles `development`, `preview` (staging) and `production`, each with `APP_ENV`.
2. `runtimeVersion: {policy: "fingerprint"}` and `updates.url`, with channels per profile.
3. An iOS submit config. Set the final bundle IDs. Add the Sentry SDK for React Native with the DSN from the environment (OPS-07).
4. Document the release checklist in `mobile/README.md`: version bump through the `mobile-version-bump` skill, then `eas build`, then internal track, then `eas update` rules.

Done when: `eas build --profile preview` succeeds (**Needs user** for credentials), and the app reports to Sentry.

### MOB-21: End-to-end flows with Maestro
Status: todo · Phase 4 · Size M · Depends: MOB-05, MOB-06, MOB-07, DB-02 · Blocks: QA-04
Do: create `mobile/maestro/` with these flows, run against the local stack. OTP codes are read from the Mailpit API through a helper script.
- sign-up, verify, profile, join
- sign in with a wrong password, then the correct one
- reset password
- collect offline, reconnect, uploaded
- sign out with unsent work (the warning appears)
- delete account

Done when: every flow passes on the iOS simulator, and the run command is in `mobile/README.md`.
