# Mobile sync with PowerSync

This file is part of the [FieldMaps production plan](README.md) and defines the `SYNC-*` tasks. It is the design for decision D2 (PowerSync now). The implementation is spread across components, and this file lists those tasks in order.

| Order | Task | Where | What |
|---|---|---|---|
| 1 | SYNC-01 | here | Spike: prove the risky assumptions (a gate) |
| 2 | DB-09, DB-10, DB-12 | [supabase/PLAN.md](../../supabase/PLAN.md) | Form lifecycle (`state`), collection columns, `upload_rejections`, zones, packages moved to Storage |
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
- **A caveat.** A write the server discards is reverted on the device at the next checkpoint.
  - That is why rejections are written server-side to `upload_rejections` and synced back (BE-12).
  - It is also why the client completes a batch **only** after a well-formed per-operation answer (MOB-10). Otherwise a rejected observation would silently vanish.

## Source database

- **Replication role:** `powersync_role WITH REPLICATION BYPASSRLS LOGIN`.
  - It needs `USAGE` on `fieldmaps` and `extensions`, plus `SELECT` on the published tables.
  - `BYPASSRLS` is required because every `fieldmaps` policy targets `fieldmaps_api`.
  - The password is set out-of-band (DB-11).
- **Publication.** It must be named `powersync` and must list the tables explicitly; never use `FOR ALL TABLES`. PowerSync reads every change in the publication.
- **Grants and large rows.**
  - `powersync_role` gets **whole-table** SELECT. PowerSync's snapshots run `SELECT * FROM <table>`, which fails with 42501 under a column-limited grant.
  - Server-only columns such as `site_packages.storage_path` are kept off devices by the stream queries' explicit column lists.
  - `site_packages.archive` (bytea, up to 16 MiB; PowerSync's row cap is 15 MB) must be gone before the table is published: DB-14 drops it, and DB-11 depends on DB-14.
- **What never goes in the publication:**
  - audit tables;
  - `gis_reader_grants` and `gis_views`;
  - anything in `fieldmaps_private` or `fieldmaps_auth_hooks`.
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
      - SELECT *, user_id AS id FROM "fieldmaps"."profiles" WHERE user_id = auth.user_id()
      - SELECT *, user_id || '.' || project_id AS id FROM "fieldmaps"."project_memberships" WHERE user_id = auth.user_id()
      - SELECT *, user_id || '.' || organization_id AS id FROM "fieldmaps"."organization_members" WHERE user_id = auth.user_id()
  workspace:
    auto_subscribe: true
    with:
      my_projects: SELECT project_id FROM "fieldmaps"."project_memberships" WHERE user_id = auth.user_id()
    queries:
      - SELECT * FROM "fieldmaps"."projects" WHERE id IN my_projects
      - SELECT * FROM "fieldmaps"."sites" WHERE project_id IN my_projects
      # package_id tells the zones of each package version apart (unique per site, package, code)
      - SELECT id, organization_id, project_id, site_id, package_id, code, name, ST_AsGeoJSON(geom) AS geometry FROM "fieldmaps"."zones" WHERE project_id IN my_projects
      # retired versions stay on devices: drafts and records collected on them must keep rendering
      - SELECT * FROM "fieldmaps"."form_versions" WHERE project_id IN my_projects AND state IN ('published', 'retired')
      # sites.* carries current_package_id (DB-12); site_packages rows stay immutable
      - SELECT id, organization_id, project_id, site_id, form_version_id, version, state, manifest, archive_bytes, archive_sha256, prepared_at FROM "fieldmaps"."site_packages" WHERE project_id IN my_projects AND state = 'ready'
      - SELECT * FROM "fieldmaps"."assignments" WHERE project_id IN my_projects
  my_observations:
    auto_subscribe: true
    query: |
      SELECT id, organization_id, project_id, site_id, form_version_id, zone_code, package_version,
             round, context, gps_accuracy_m,
             observer_code, observed_at, received_at, revision, answers,
             ST_X(geom) AS longitude, ST_Y(geom) AS latitude
      FROM "fieldmaps"."observations"
      WHERE created_by = auth.user_id() AND deleted_at IS NULL
        AND project_id IN (SELECT project_id FROM "fieldmaps"."project_memberships" WHERE user_id = auth.user_id())
  my_rejections:
    auto_subscribe: true
    query: SELECT * FROM "fieldmaps"."upload_rejections" WHERE user_id = auth.user_id() AND resolved_at IS NULL
```

**Rules for editing the streams:**
- Every query returns an `id` column. Alias the primary key when it is not called `id`, as `profiles` and the membership tables do.
- Every query filters on `auth.user_id()`, directly or through `my_projects`.
- `subscription.parameter()` and `connection.parameter()` are set by the client. They may only narrow data that is already scoped by `auth.user_id()`.
- Adding a stream or a column means updating QA-02's expected-row fixtures in the same change.
- Per-user caps are 1,000 buckets and 1,000 parameter results. Avoid `OR` combined with subqueries.
- **Unverified.** `ST_X`, `ST_Y` and `ST_AsGeoJSON` on `extensions.geometry` (not `public.geometry`) is spike criterion 2.
- **Training privacy.**
  - An observer only ever syncs their **own** observations, so trainees never see each other's records.
  - `my_projects` includes Training, but only `projects`, `sites`, `zones`, `form_versions`, `site_packages` and `assignments` rows are synced through it. None of those are per-person.
  - Other observers' records are a post-pilot, on-demand stream, and only if Janet asks for it ([decisions.md](decisions.md#open-questions), Q3).

## Client design (implemented by MOB-09 to MOB-12)

- **Packages:**
  - `@powersync/react-native` 2.3.x with the built-in op-sqlite factory, and `@op-engineering/op-sqlite` (peer range ≥17.1 <19).
  - **Remove `expo-sqlite`.** op-sqlite conflicts with it. MOB-11 reads the old file with op-sqlite.
  - Set `expo.updates.useThirdPartySQLitePod: true` through a config plugin, because `expo-updates` is installed.
- **Database file.** One per user: `fieldmaps-{userId}.db`.
  - Signing out keeps the file, so pending work waits for that user.
  - "Remove account from this device" and account deletion delete it.
- **Local-only tables:**
  - `drafts`: ports `observation_drafts` and the ownership rules in `mobile/src/session/ownership.ts`. Unparseable drafts are quarantined, never deleted.
  - `package_files`: download state, path and sha256. The package directories themselves are device-level and reference-counted across accounts (MOB-14).
  - `migration_state`: per user. The device-level ledger lives in the old file (MOB-11).
  - `held_observations`: records that must stay on the device, for example ones collected on a form version that is not yet published.
- **Connector.**
  - It is bound to the database's owner. `fetchCredentials()` returns `{ endpoint, token: session.access_token }` only when the session's user is that owner; otherwise it returns `null`.
  - `uploadData()` sends `getCrudBatch(n)` to `POST /v1/sync/upload`. `n` is sized to stay under 4 MB and halved on 413.
  - It calls `.complete()` **only** after a 200 whose JSON parses, has one result per operation id, and carries the owner's `user_id`. It throws on every other response, including 4xx and an HTML 200 from a captive portal.
- **Record state shown to users:**

| State | Meaning |
|---|---|
| on device | in the crud queue, not yet sent |
| uploading | the queue is uploading |
| uploaded | the row came back through `my_observations` with a `received_at` |
| needs attention | an unresolved row exists in `my_rejections` for the id; the record is rendered from its `operation`, and "Send again" re-queues it |
| held | a row in `held_observations`, kept on the device until it is queued, exported or discarded (MOB-13) |

The Records list shows **one entry per observation id**, with this precedence: in the local queue, then an unresolved rejection, then held, then uploaded.

- **Sign-out.**
  - Warn when the upload queue, `held_observations` or `drafts` are not empty.
  - Sign-out calls `disconnect()` and `close()`, never `disconnectAndClear()`, which by default also empties the local-only tables.
- **Before PowerSync.** The pre-PowerSync `fieldmaps-shell.db` is shared by every account on the device. MOB-11 moves each account into its own file when that account signs in. It deletes the old file only after every account with unsent work or drafts has uploaded, or been removed.

## Tasks

### SYNC-01: PowerSync spike on staging (the gate for PowerSync work)
Status: todo · Phase 2 · Size L · Depends: DB-01, DB-02, OPS-04 · Blocks: DB-11, MOB-09, OPS-08, SYNC-02
Needs user: create the PowerSync account and the spike instance, and approve a temporary role and publication on the staging database.
Read first: this file; `mobile/package.json`; `mobile/app/_layout.tsx`; `supabase/migrations/*`.
Do: on a throwaway branch with staging data only, prove each criterion and record the evidence.
1. `powersync_role` (REPLICATION, BYPASSRLS, USAGE on `fieldmaps` and `extensions`) replicates over the IPv6 direct connection from an explicit-list `powersync` publication.
2. `ST_X`, `ST_Y` and `ST_AsGeoJSON` on `extensions.geometry` work inside a stream query.
3. The "Use Supabase Auth" option accepts the project's ES256 tokens, with audience `authenticated`.
4. `@powersync/react-native` plus `@op-engineering/op-sqlite` build and run on Expo 57 / RN 0.86, in an iOS simulator and an Android emulator, with `expo-sqlite` removed and `useThirdPartySQLitePod` set.
5. With two users in different organizations, user B's client receives zero of user A's rows.
6. An `uploadData()` sent to a stub endpoint that returns 200 with a rejection keeps the queue moving.
7. **The initial snapshot works with DB-11's exact grants.** Replicate a `site_packages`-shaped spike table that has no bytea column, with whole-table SELECT for `powersync_role`, and confirm that the snapshot and a later insert both arrive.
   - Also confirm that a column-limited grant makes the snapshot fail. That failure is why DB-11 grants whole tables and drops `archive` first (DB-14).
8. **Teardown (Needs user).** Leave nothing behind for DB-11 or OPS-08 to collide with:
   - deprovision the spike instance, or record that OPS-08 reuses it;
   - `SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots WHERE NOT active AND slot_name LIKE 'powersync%';`
   - `DROP PUBLICATION IF EXISTS powersync;`
   - `REVOKE ALL ON ALL TABLES IN SCHEMA fieldmaps FROM powersync_role; REVOKE ALL ON SCHEMA fieldmaps, extensions FROM powersync_role;`
   - `DROP ROLE IF EXISTS powersync_role;`

   A role that still holds privileges cannot be dropped (2BP01), which is why the REVOKEs come first.

   DB-11 is idempotent anyway.

Done when:
- `docs/decisions/0002-powersync.md` records pass or fail for each criterion, with evidence, and the teardown;
- the spike branch is not merged.

If any of criteria 1–7 fails, **stop**. The user re-decides D2; the fallback is the existing outbox plus ETag pulls.

Only the PowerSync-specific tasks wait for this gate: DB-11, OPS-08, SYNC-02 and MOB-09 onwards. DB-09, DB-10, DB-12 and BE-10 to BE-13 are needed by either sync design, so they proceed in parallel.

Verify: the decision record exists, and the user has read it.

### SYNC-02: Stream definitions in the repository, deployed to staging
Status: todo · Phase 2 · Size M · Depends: DB-09, DB-10, DB-11, DB-12, OPS-08, SYNC-01 · Blocks: MOB-09, QA-02
Read first: the Streams section above; [supabase/PLAN.md](../../supabase/PLAN.md) (DB-10, DB-12 column names).
Do:
1. Create `powersync/README.md`, covering what this is, how to deploy it (dashboard or CLI) and the edit rules above.
2. Create `powersync/sync-config.yaml` with the streams above, adjusted to the final column names.
3. Add the `powersync/` row to the routing table in the root `AGENTS.md`.
4. Deploy to the staging instance (**Needs user** to approve), then confirm it in the PowerSync diagnostics app with a staging user.

Done when:
- the YAML in the repo matches what is deployed;
- a staging user syncs their memberships, projects and own observations.

Verify: diagnostics-app screenshots or logs are attached to the task notes. QA-02 then checks isolation.
