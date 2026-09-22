# Supabase development connection

Verified September 18, 2026. Project: `wbnvnewslhigxwawcdji`.

The iOS simulator uses `http://127.0.0.1:8000`. That API now connects to **hosted Supabase PostgreSQL 17.6 / PostGIS 3.3.7**, through the IPv4 session pooler on port 5432. Supabase supplies both Auth and the observation database. The API process still runs on this computer; it has not been deployed publicly.

## Start or stop the connected API

From the repository root, with Docker Desktop running:

```sh
docker compose --env-file /dev/null -f database/compose.yaml stop api
docker compose --env-file /dev/null -f database/compose.hosted.yaml up -d --build
curl http://127.0.0.1:8000/health
```

Stop it with:

```sh
docker compose --env-file /dev/null -f database/compose.hosted.yaml stop
```

The local database and test databases remain available. To switch back, stop the hosted API before `make -C database api-up`; both configurations bind localhost port 8000. They use separate observation stores. Switching servers does not transfer their data or reset mobile upload receipts.

For Metro, use `pnpm start:simulator` in `mobile/`; its IPv4 setting matches the simulator bundle URL. The development app already includes SecureStore and NetInfo. Physical devices need a reachable HTTPS API.

## Account access for the first mobile upload

The supplied test account is confirmed and has observer access to the practice project. The running API's restricted database connection returned that project for the account and no projects for an unrelated identity on the same connection pool. The user completed native sign-in and reported an uploaded observation; the API returned HTTP 200 and hosted readback confirmed the record. The following provisioning steps are for additional test accounts.

1. In [Supabase Authentication → Users](https://supabase.com/dashboard/project/wbnvnewslhigxwawcdji/auth/users), create an email/password test user with Auto Confirm enabled.
2. Give the project administrator its User UID. Keep its password private and enter it only in the mobile Account screen.
3. The administrator assigns that existing user to the practice project with this SQL, replacing `AUTH_USER_UUID`:

```sql
INSERT INTO fieldops.project_memberships (user_id, organization_id, project_id, role)
SELECT u.id, p.organization_id, p.id, 'observer'
FROM auth.users u CROSS JOIN fieldops.projects p
WHERE u.id = 'AUTH_USER_UUID'::uuid
  AND u.email_confirmed_at IS NOT NULL
  AND p.id = '10000000-0000-4000-8000-000000000002'
ON CONFLICT (user_id, project_id) DO NOTHING;
```

Signing in alone grants no project access. Existing standalone practice observations remain practice records. Create a new observation after signing in and receiving project access; disconnect, save, then reconnect with the app open to check automatic upload.

## Database and credential setup

The applied migrations in `supabase/migrations/` match hosted migration history. The initial migration installs PostGIS in `extensions`, creates private `fieldops`, `fieldops_meta`, and `gis` schemas, and seeds only the fictional practice project/site/form. The second migration removes browser API execution grants from the dashboard's RLS event-trigger function. The third adds the scoped QGIS training login. No app user or membership is seeded.

`backend/config.hosted.json` contains public connection settings. The restricted `fieldops_api` login has no ownership or RLS bypass; it can insert observations and read rows permitted by the verified account's project memberships. The API uses a generated password stored only in the external Docker volume `fieldops_hosted_api_secrets`, at `/run/fieldops-secrets/database-password`, mode 0600, mounted read-only. The supplied administrator password was used transiently for provisioning and is not the API credential.

This volume is local secret storage for development, not a production secret manager. A new computer needs a separately provisioned API credential and volume. Do not delete the volume as a troubleshooting step; replacing it requires coordinated password rotation and an API restart. Production deployment must inject a runtime secret through its hosting platform.

TLS verifies the Supabase CA chain and pooler hostname. See [certificate provenance and compatibility](../backend/certs/README.md). This client configuration does not change the project's server-wide SSL enforcement setting.

The CLI configuration in `supabase/config.toml` describes an optional local Supabase stack. It does not replace `database/compose.yaml` and must not be pushed to overwrite hosted Auth settings. The migrations were applied through the authenticated Supabase connector; no local CLI login/link is required to run the API.

## Verified and pending

- **Passed:** 24 backend tests against real local PostGIS, 19 database assertions, Ruff and BasedPyright.
- **Passed on Supabase:** seven rollback-only assertions for membership isolation, restricted writes, spatial readback, and the project-scoped GIS view. Test rows and temporary role grants were removed by rollback.
- **Passed in the running hosted configuration:** restricted pooler login, database query through SQLAlchemy, no projects for an unassigned identity, public Auth signing-key retrieval, HTTP health and rejection of missing/invalid tokens. The first real mobile upload, labeled "First sync test", received HTTP 200 on September 18, 2026 at 19:20:08 UTC. The stored record has revision 1 and appears in `gis.sample_observations` with matching coordinates, count, and notes; the user reported UPLOADED in the app.
- **Advisor results:** the latest check flags [disabled leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection); address this Auth setting during deployment hardening. Two [RLS-without-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) are intentional: organizations and migration metadata are administrator-only. [Unused-index notices](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) are expected before traffic; retain the spatial and foreign-key indexes.
- **Offline acceptance:** the user followed the disconnect/save/reconnect test and reported automatic upload. Hosted readback confirmed "Offline sync test", captured September 18, 2026 at 19:24:03.807 UTC and received at 19:24:10.399461 UTC, with revision 1 and matching coordinates, count, and notes in `gis.sample_observations`. Offline interaction was user-tested; database persistence and GIS-view readback were independently verified.

**QGIS connection:** a separate `fieldops_qgis_training` login now inherits the scoped reader role. Its actual pooler login returns the two uploaded points with verified TLS; permission checks deny access to private application/Auth tables and observation edits. QGIS Desktop 4.2.2 is now installed: its native PostgreSQL layer returned both records, its attribute table displayed their answers, and its exported map canvas rendered both labeled points. The reusable project is `qgis/fieldops-training.qgs`; see [connection and reopening instructions](../qgis/README.md). No password is embedded in its layer sources. A fresh QGIS session may prompt for the scoped GIS credential.

The mobile queue currently uploads new points while the app is active. General form publishing, attachments, edit/delete synchronization, server-to-device downloads, and closed-app background synchronization remain outside this slice. The development mobile-to-database-to-QGIS path is verified for the two test observations; a production rollout and physical-device field trial remain unverified.

References: [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres), [PostGIS extension placement](https://supabase.com/docs/guides/database/extensions/postgis), [TLS verification](https://supabase.com/docs/guides/platform/ssl-enforcement).
