# Mobile sync with PowerSync

This file is part of the [FieldMaps production plan](README.md) and defines the `SYNC-*` tasks. It is the design for decision D2 (PowerSync now). The implementation is spread across components, and this file lists those tasks in order.

| Order | Task | Where | What |
|---|---|---|---|
| 1 | SYNC-01 | here | Spike: prove the risky assumptions (a gate) |
| 2 | DB-10, DB-12 | [supabase/PLAN.md](../../supabase/PLAN.md) | Collection columns, `upload_rejections`, zones, packages moved to Storage |
| 3 | DB-11 | [supabase/PLAN.md](../../supabase/PLAN.md) | `powersync_role` and the `powersync` publication |
| 4 | OPS-08 | [operations.md](operations.md) | PowerSync Cloud instance for staging |
| 5 | SYNC-02 | here | Stream definitions in the repository, deployed to staging |
| 6 | BE-12 | [backend/PLAN.md](../../backend/PLAN.md) | `POST /v1/sync/upload` |
| 7 | MOB-09 → MOB-12 | [mobile/PLAN.md](../../mobile/PLAN.md) | Client database, connector, one-time migration, drafts |
| 8 | QA-02, QA-03 | [verification.md](verification.md) | Stream isolation and sync correctness |

Research basis: PowerSync docs verified on 2026-09-22 (links inline). Treat anything marked **unverified** as a spike question.

## Why PowerSync, and what it does not do

- **What it does.** Postgres rows reach devices through scoped streams: projects, sites, zones, form versions, package metadata, the user's own observations and rejections. Local writes are queued in `ps_crud` and handed to our `uploadData()` connector.
- **What it does not do.** PowerSync does not authorize uploads. FastAPI still validates every write under RLS ([architecture.md](architecture.md#security-rules)), and it does not move files. Package archives are downloaded from Storage separately (MOB-14).
- **A caveat.** A write the server discards is reverted on the device at the next checkpoint. That is why rejections must be written server-side to `upload_rejections` and synced back (BE-12, MOB-10). Otherwise a rejected observation would silently vanish.

## Source database

- **Replication role:** `powersync_role WITH REPLICATION BYPASSRLS LOGIN`.
  - It needs `USAGE` on `fieldmaps` and `extensions`, plus `SELECT` on the published tables.
  - `BYPASSRLS` is required because every `fieldmaps` policy targets `fieldmaps_api`.
  - The password is set out-of-band (DB-11).
- **Publication.** It must be named `powersync` and must list the tables explicitly; never use `FOR ALL TABLES`. PowerSync reads every change in the publication.
- **What never goes in the publication:**
  - `site_packages.archive`. The bytea column exceeds the 15 MB row cap, so DB-12 moves it to Storage first.
  - Audit tables.
  - Anything in `fieldmaps_private`.
- **Connection.** Use the direct connection `db.<ref>.supabase.co:5432`, not the pooler. It is IPv6, which PowerSync Cloud supports.
- **Replication slots.**
  - Supabase allows about 4 logical slots, and each PowerSync instance holds one, plus a second one during a config deploy.
  - Keep staging and production on separate Supabase projects.
  - Set `max_slot_wal_keep_size` (for example 1GB). A deprovisioned instance leaves a slot that holds WAL, and the Free plan deprovisions after 7 idle days.
- **No generated columns for sync on Postgres 17.** Stored generated columns only replicate from PG18. Compute lon/lat in the stream query with `ST_X`/`ST_Y`.

## Streams (edition 3)

This is the planned content of `powersync/sync-config.yaml` (SYNC-02 creates it). Sync Rules are deprecated in 2027, so use Sync Streams only.

```yaml
config: { edition: 3 }
streams:
  me:
    auto_subscribe: true
    queries:
      - SELECT * FROM "fieldmaps"."profiles" WHERE user_id = auth.user_id()
      - SELECT *, user_id || '.' || project_id AS id FROM "fieldmaps"."project_memberships" WHERE user_id = auth.user_id()
      - SELECT *, user_id || '.' || organization_id AS id FROM "fieldmaps"."organization_members" WHERE user_id = auth.user_id()
  workspace:
    auto_subscribe: true
    with:
      my_projects: SELECT project_id FROM "fieldmaps"."project_memberships" WHERE user_id = auth.user_id()
    queries:
      - SELECT * FROM "fieldmaps"."projects" WHERE id IN my_projects
      - SELECT * FROM "fieldmaps"."sites" WHERE project_id IN my_projects
      - SELECT id, organization_id, project_id, site_id, code, name, ST_AsGeoJSON(geom) AS geometry FROM "fieldmaps"."zones" WHERE project_id IN my_projects
      - SELECT * FROM "fieldmaps"."form_versions" WHERE project_id IN my_projects AND state = 'published'
      # sites.* carries current_package_id (DB-12); site_packages rows stay immutable
      - SELECT id, organization_id, project_id, site_id, form_version_id, version, state, manifest, archive_bytes, archive_sha256, prepared_at FROM "fieldmaps"."site_packages" WHERE project_id IN my_projects AND state = 'ready'
      - SELECT * FROM "fieldmaps"."assignments" WHERE project_id IN my_projects
  my_observations:
    auto_subscribe: true
    query: |
      SELECT id, organization_id, project_id, site_id, form_version_id, zone_code, package_version,
             observer_code, observed_at, received_at, revision, answers,
             ST_X(geom) AS longitude, ST_Y(geom) AS latitude
      FROM "fieldmaps"."observations"
      WHERE created_by = auth.user_id() AND deleted_at IS NULL
        AND project_id IN (SELECT project_id FROM "fieldmaps"."project_memberships" WHERE user_id = auth.user_id())
  my_rejections:
    auto_subscribe: true
    query: SELECT * FROM "fieldmaps"."upload_rejections" WHERE user_id = auth.user_id()
```

**Rules for editing the streams:**
- Every query filters on `auth.user_id()`, directly or through `my_projects`.
- `subscription.parameter()` and `connection.parameter()` are set by the client. They may only narrow data that is already scoped by `auth.user_id()`.
- Adding a stream or a column means updating QA-02's expected-row fixtures in the same change.
- Per-user caps are 1,000 buckets and 1,000 parameter results. Avoid `OR` combined with subqueries.
- **Unverified.** `ST_X`, `ST_Y` and `ST_AsGeoJSON` on `extensions.geometry` (not `public.geometry`) is spike criterion 2.
- **Training privacy.** An observer only ever syncs their **own** observations, so trainees never see each other's records. Other observers' records are a post-pilot, on-demand stream, and only if Janet asks for it ([decisions.md](decisions.md#open-questions), Q3).

## Client design (implemented by MOB-09 to MOB-12)

- **Packages:**
  - `@powersync/react-native` 2.3.x with the built-in op-sqlite factory, and `@op-engineering/op-sqlite` (peer range ≥17.1 <19).
  - **Remove `expo-sqlite`.** op-sqlite conflicts with it.
  - Set `expo.updates.useThirdPartySQLitePod: true` through a config plugin, because `expo-updates` is installed.
- **Database file.** One per user: `fieldmaps-{userId}.db`. Signing out keeps the file, so pending work waits for that user. "Remove account from this device" deletes it.
- **Local-only tables:**
  - `drafts` (ports `observation_drafts` and the ownership rules in `mobile/src/session/ownership.ts`);
  - `package_files` (download state, path, sha256);
  - `migration_state`.
- **Connector:**
  - `fetchCredentials()` returns `{ endpoint, token: session.access_token }` from supabase-js.
  - `uploadData()` sends `getCrudBatch()` to `POST /v1/sync/upload`.
  - It throws only on 401, 408, 429 or 5xx, and calls `.complete()` after every other response.
- **Record state shown to users:**

| State | Meaning |
|---|---|
| on device | in the crud queue, not yet sent |
| uploading | the queue is uploading |
| uploaded | the row came back through `my_observations` with a `received_at` |
| needs attention | a row exists in `my_rejections` for the id |

- **Sign-out.** Check `getUploadQueueStats()`. If the queue is not empty, warn the user, and never run `disconnectAndClear()` while work is pending.

## Tasks

### SYNC-01: PowerSync spike on staging (the gate for Phase 2)
Status: todo · Phase 2 (days 1–4) · Size L · Depends: DB-01, DB-02, OPS-04 · Blocks: DB-11, OPS-08, SYNC-02, MOB-09
Needs user: create the PowerSync account and staging instance, and approve a temporary role on the staging database.
Read first: this file; `mobile/package.json`; `mobile/app/_layout.tsx`; `supabase/migrations/*`.
Do: on a throwaway branch with staging data only, prove each criterion and record the evidence:
1. `powersync_role` (REPLICATION, BYPASSRLS, USAGE on `fieldmaps` and `extensions`) replicates over the IPv6 direct connection from an explicit-list `powersync` publication.
2. `ST_X`, `ST_Y` and `ST_AsGeoJSON` on `extensions.geometry` work inside a stream query.
3. The "Use Supabase Auth" option accepts the project's ES256 tokens, with audience `authenticated`.
4. `@powersync/react-native` plus `@op-engineering/op-sqlite` build and run on Expo 57 / RN 0.86 in an iOS simulator and an Android emulator, with `expo-sqlite` removed and `useThirdPartySQLitePod` set.
5. With two users in different organizations, user B's client receives zero of user A's rows.
6. An `uploadData()` sent to a stub endpoint that returns 200 with a rejection keeps the queue moving.

Done when:
- `docs/decisions/0002-powersync.md` records pass or fail for each criterion, with evidence;
- the spike branch is not merged.

If any criterion fails, **stop**. The user re-decides D2; the fallback is the existing outbox plus ETag pulls.

Verify: the decision record exists, and the user has read it.

### SYNC-02: Stream definitions in the repository, deployed to staging
Status: todo · Phase 2 · Size M · Depends: SYNC-01, DB-10, DB-11, DB-12, OPS-08 · Blocks: MOB-09, QA-02
Read first: the Streams section above; [supabase/PLAN.md](../../supabase/PLAN.md) (DB-10, DB-12 column names).
Do:
1. Create `powersync/README.md`, covering what this is, how to deploy it (dashboard or CLI) and the edit rules above.
2. Create `powersync/sync-config.yaml` with the streams above, adjusted to the final column names.
3. Add the `powersync/` row to the routing table in the root `AGENTS.md`.
4. Deploy to the staging instance (**Needs user** to approve), then confirm it in the PowerSync diagnostics app with a staging user.

Done when:
- the YAML in the repo matches what is deployed;
- a staging user syncs their memberships, projects and own observations.

Verify: diagnostics app screenshots or logs are attached to the task notes, and QA-02 passes.
