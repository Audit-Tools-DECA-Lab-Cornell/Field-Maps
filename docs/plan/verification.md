# Verification: cross-cutting suites and acceptance runs

This file is part of the [FieldMaps production plan](README.md) and defines the `QA-*` tasks. Component-level tests belong to their own tasks (every task has a `Verify:` line). This file owns the suites that cross components, and the manual acceptance runs.

"Pilot-ready" is defined in [product.md](product.md#pilot-ready-means). Each item there is proved by one task below.

## Baseline checks: every change, every task

- `pnpm check`, which covers web and mobile types and lint, plus Ruff and BasedPyright for Python.
- `pnpm test`, which runs mobile Vitest plus the API and SQL suites. After DB-02 these run against the local Supabase stack.
- `node docs/plan/check-plan.mjs` whenever a plan file changes.
- `supabase db advisors` after every migration (DB-*).
- `pnpm contracts:generate && git diff --exit-code` after any API or schema change (CON-03).

Never report a device, hosted or production check as passed unless it was actually run. The standing rule is in `AGENTS.md`.

## Tasks

### QA-01: API tenant-isolation suite
Status: todo · Phase 1 (grows every phase) · Size M · Depends: DB-05, BE-06, BE-07 · Blocks: OPS-09
Read first: `backend/tests/test_project_access.py`; `backend/tests/conftest.py`; the endpoint catalog in [contracts.md](contracts.md#api-endpoint-catalog-v1).
Do:
1. Create `backend/tests/test_tenant_isolation.py`. Fixtures:
   - two orgs (A and B), each with a project and a site;
   - users with every role in each org;
   - a Training observation from two different trainees.
2. For every endpoint in the catalog, B gets 404 or 403 on everything of A's. Cover read, write, list, export, invitation redemption across orgs, and member edits across orgs.
3. A trainee cannot read another trainee's observation.
4. A SQL test (DB-04) fails if any `fieldmaps` table lacks RLS or has an `anon` or `authenticated` grant.
5. Each new endpoint task adds its rows here; this is part of that task's `Done when`.

Done when: the suite covers every catalog row that exists, and runs in CI (OPS-06).

Verify: `pnpm backend:test`.

### QA-02: PowerSync stream isolation check
Status: todo · Phase 2 · Size M · Depends: SYNC-02 · Blocks: OPS-09
Read first: [sync-powersync.md](sync-powersync.md#streams-edition-3).
Do:
1. Write `powersync/tests/isolation.ts` (or a documented manual script, if no headless client is practical). It:
   - signs in as staging users A, B and a trainee;
   - connects a PowerSync client for each;
   - asserts the exact set of row ids each receives against a seeded fixture.
2. Seed the fixture with `database/hosted/seed-isolation.sql`: synthetic users and rows, with a matching cleanup script.
3. Any stream change must update the expected sets (the editing rule in sync-powersync.md).

Done when: A, B and the trainee each receive only their expected rows on staging.

Verify: run the script and attach its output to the task notes.

### QA-03: Sync correctness scenarios
Status: todo · Phase 2 · Size M · Depends: MOB-10, MOB-11, BE-12 · Blocks: QA-05
Do: automate what is possible in Vitest and pytest, and run the rest on the simulator or emulator with results written down:
1. Save offline, force-quit, relaunch, reconnect: exactly one row in PostGIS.
2. The response is lost and retried: no duplicate. Covered by the existing fingerprint tests plus a batch test.
3. The server rejects with 422: an `upload_rejections` row is created, and the device shows "needs attention" with the payload intact.
4. The token expires while offline: collection continues; after signing in again the upload resumes.
5. Upgrading from a v3 `fieldmaps-shell.db` with pending and needs-attention records: every one uploads once (MOB-11).
6. Account switch: data stays separate, and signing out with pending work warns first.
7. A missing package asset shows a clear state and never crashes.

Done when: each scenario is recorded as pass or fail, with how it was run (automated or simulator).

### QA-04: Auth end-to-end suites
Status: todo · Phase 4 · Size S · Depends: MOB-21, WEB-15 · Blocks: QA-05
Do: make sure the Maestro (MOB-21) and Playwright (WEB-15) suites together cover sign-up, a wrong code, resend, sign-in, reset, join by code or invite link, sign-out with unsent work, and account deletion. Run both against the local stack in CI where possible; otherwise record a manual run.

Done when: coverage is listed in this task's notes, and both suites pass.

### QA-05: Device acceptance and pilot walkthrough
Status: todo · Phase 5 · Size M · Depends: QA-03, QA-04, OPS-11, GIS-01 · Blocks: none
Needs user: the devices, and Janet's time.
Do: on a real iPad and a real Android tablet, using production internal builds:
1. Fresh install, sign-up, code, profile, join.
2. Download a real QGIS package on Wi-Fi.
3. Airplane mode: collect at least 10 observations of Janet's form, including branch changes.
4. Force-quit, reboot, reconnect: all upload.
5. Check the rows in PostGIS and in a refreshed QGIS typed layer.
6. Walk every mobile and web screen: no fixture data, no developer copy.
7. Force one permanent rejection, and check it is visible and preserved.

Done when: a dated report exists at `docs/Pilot-Acceptance-<date>.md`.

### QA-06: Operational readiness
Status: todo · Phase 5 · Size S · Depends: OPS-07, OPS-10, OPS-12 · Blocks: none
Do:
1. Confirm a Sentry test event from mobile, web and API.
2. Confirm `/ready` fails when the database is unreachable (in staging).
3. Confirm the restore drill (OPS-10) is recorded.
4. Confirm the alerts (OPS-12) fire on a test.

Done when: each item is checked, with its date.
