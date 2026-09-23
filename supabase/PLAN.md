# Data model and migrations plan (`supabase/` and `database/`)

This file is part of the [FieldMaps production plan](../docs/plan/README.md) and defines the `DB-*` tasks. It covers the canonical migrations in `supabase/migrations/`, the SQL tests and hosted scripts in `database/`, and every RLS policy and private function.

The design rules it follows are in [architecture.md](../docs/plan/architecture.md#security-rules). The shapes it must serve are in [contracts.md](../docs/plan/contracts.md). The sync-related tables must match [sync-powersync.md](../docs/plan/sync-powersync.md#streams-edition-3). The GIS views are planned in [qgis/PLAN.md](../qgis/PLAN.md) (GIS-01 to GIS-03).

## Context

**Schema today** (Postgres 17, PostGIS 3.3 in `extensions` on hosted):
- Tables: `organizations`, `projects`, `sites`, `form_versions` (immutable by trigger), `observations`, `project_memberships` (roles `observer`, `manager`, `viewer`).
- Local only: `site_packages` and `package_checks` (`database/migrations/0004_site_packages.sql`).

**Identity.** The API sets `fieldmaps.user_id` per transaction, and `fieldmaps.request_user_id()` reads it. Every policy targets the restricted role `fieldmaps_api`, which has NOBYPASSRLS, SELECT, and column-limited INSERT.

**What is missing:**
- There is no `profiles` table, no link to `auth.users`, no invitations, and no organization membership.
- A new public sign-up can authenticate but gets `[]` and 403 everywhere (`backend/src/fieldmaps_api/repository.py:69`).

**Two migration tracks have diverged:**
- `database/migrations/0001-0004` plus the `migrate.sql` ledger (local Docker PostGIS);
- `supabase/migrations/` (hosted: one squashed file for 0001–0003 with seeds, plus two small files).

Decision D7 makes `supabase/migrations/` canonical.

**The GIS view.** `gis.sample_observations` is owner-executed with hard-coded IDs, so its WHERE clause is the only tenant boundary (`database/sample-gis.sql:32-34`). GIS-01 replaces it.

## Conventions for every migration

- **Creating a file.** Use `supabase migration new <name>`. If the CLI is missing, use a `YYYYMMDDHHMMSS_<name>.sql` name that sorts after the last file.
- **Applied files are never edited.** Fix mistakes with a new migration.
- **Ledger row.** End every file with an `INSERT INTO fieldmaps_meta.schema_migrations(version)` line, as the existing hosted files do. Until DB-03 retires the ledger, keep the local numbering in the version text (`0005_identity_tenancy`, …).
- **New tables:**
  - enable RLS;
  - grant only what `fieldmaps_api` needs, column-limited for INSERT and UPDATE;
  - write policies `TO fieldmaps_api`;
  - `REVOKE ALL … FROM PUBLIC, anon, authenticated, service_role`.
- **Functions in `fieldmaps`** are SECURITY INVOKER with `SET search_path = pg_catalog`, or `''` where schema-qualified.
- **SECURITY DEFINER** is allowed only in `fieldmaps_private` (see DB-06).
- **Composite keys.** Keep composite `(organization_id, project_id, …)` foreign keys on every project-scoped table.
- **Recursive RLS.** Policies that need "the projects I belong to" call `fieldmaps_private.my_project_ids()` (DB-06). A policy on `project_memberships` that queries `project_memberships` causes infinite recursion.
- **Tests.** Each migration adds assertions to `database/tests/*.sql`, run on the local stack. It also adds assertions to `database/hosted/verify.sql` when the migration changes an access rule.
- **Hosted application** is a separate step that **needs the user**. It is never part of a task's automated steps.

## Tasks

### DB-01: Port site packages to the hosted migrations
Status: doing (the migration and assertions are written; applying them to staging needs the user) · Phase 0 · Size S · Depends: none · Blocks: WEB-01, SYNC-01, DB-12
Read first: `database/migrations/0004_site_packages.sql`; `supabase/migrations/20260923120000_site_packages.sql`; `database/hosted/verify.sql`.
Done so far (2026-09-23):
- `supabase/migrations/20260923120000_site_packages.sql` holds the same tables, triggers and policies as local `0004`, plus revokes from the browser roles and the ledger row.
- `database/hosted/verify.sql` has 5 new assertions: a manager reads the package it prepared; an observer reads it; an unassigned user sees none; the API cannot update packages; the browser roles cannot read packages.

Remaining:
1. **Needs user:** apply the migration to staging with `supabase db push` or the SQL editor, as the project owner.
2. **Needs user:** run `database/hosted/verify.sql` on staging with stop-on-error. Expect "Twelve hosted assertions passed…".
3. Update `docs/Supabase-Setup.md`:
   - the migration list is now four files;
   - the verification count is 12;
   - the date.

Done when: `POST /v1/projects/{p}/packages` against staging returns 201 for a manager (with WEB-01 or curl), and the doc is updated.

Verify: `curl` with a staging manager token; `verify.sql` output.

### DB-02: Local Supabase stack as the development and test database
Status: todo · Phase 0 · Size L · Depends: none · Blocks: DB-03, DB-05, OPS-06, MOB-21, WEB-15
Read first:
- `supabase/config.toml`
- `database/Makefile`, `database/compose.yaml`, `database/local-bootstrap.sh`
- `backend/tests/conftest.py`, `backend/config.local.json`
- `docs/Workspace.md`

Do:
1. **Pick the approach (half a day).** Prefer `supabase start`, which runs the migrations in order, provides the `auth` schema and Mailpit, and puts PostGIS in `extensions`. Fall back to the current Docker image with a shim (an `extensions` schema, `anon`/`authenticated` roles, an `auth.users` stub) only if the CLI stack cannot run the tests. Record the choice in `docs/decisions/0001-canonical-migrations.md`.
2. Fix `supabase/config.toml`:
   - `major_version = 17`;
   - Auth confirmations on;
   - OTP length 6, expiry 3600;
   - minimum password 8;
   - templates from `supabase/templates/` (OPS-03);
   - `seed.sql_paths` pointing at a new `supabase/seed.sql`.
   The config references a missing `./seed.sql` today (`config.toml:70`).
3. Create `supabase/seed.sql` for **local only**: the sample site and form fixtures the tests need. It must never contain a real account or secret.
4. Add `database/local-supabase.sh`:
   - generate a random password for `fieldmaps_api` on the local stack;
   - write it to a git-ignored file;
   - point `backend/config.local.json` at `postgresql+asyncpg://fieldmaps_api@127.0.0.1:54322/postgres` with `database_password_file` set to that file.
5. Port the backend test harness (`conftest.py`) and `database/tests/run.sql` to the local stack. Keep every existing assertion's meaning; isolate tests with unique UUIDs and roll back where they do today.
6. Add root scripts `pnpm db:start`, `pnpm db:stop` and `pnpm db:reset`, and document them in `docs/Workspace.md`.

Done when:
- a fresh clone plus `pnpm db:start` and `pnpm test` passes all 24+ API tests and 19+ SQL assertions against `supabase/migrations`;
- `database/migrations` is no longer used by any test.

Verify: `pnpm db:reset && pnpm test`.

### DB-03: Retire the second migration track
Status: todo · Phase 0 (end) · Size S · Depends: DB-02, OPS-06 · Blocks: none
Do:
1. Delete `database/migrations/`, `database/migrate.sql`, `database/sample-*.sql` and `database/seed-local.sql`, plus their Makefile, `package.json` and `compose` targets. First check that nothing else references them (`grep -rn "migrate.sql\|sample-gis\|seed-local" .`).
2. Keep `database/tests/`, `database/hosted/` and the README. Rewrite `database/README.md` to describe the tests and hosted scripts only, and to point here for schema changes.
3. Update the routing table in the root `AGENTS.md` for `database/` and `supabase/`.

Done when: CI is green, and no document mentions `database/migrations` except as history.

### DB-04: Default-privilege hardening and an RLS coverage test
Status: todo · Phase 0 · Size S · Depends: DB-02 · Blocks: QA-01
Do:
1. Add a migration: `ALTER DEFAULT PRIVILEGES IN SCHEMA fieldmaps, gis REVOKE ALL ON TABLES FROM anon, authenticated, service_role;`, and the same for sequences and functions.
2. Add `database/tests/rls_coverage.sql`. It fails if either of these is true:
   - any table in `fieldmaps` has `relrowsecurity = false`;
   - any table in `fieldmaps`, `fieldmaps_private` or `gis` has a privilege for `anon` or `authenticated`.
3. Add a check that `fieldmaps_api` is `NOT rolbypassrls` and `NOT rolsuper`.

Done when: the test runs in `pnpm test` and passes.

### DB-05: Identity and tenancy schema
Status: todo · Phase 1 · Size L · Depends: DB-02, DB-04 · Blocks: DB-06, DB-07, BE-06, BE-07, QA-01
Read first: [product.md](../docs/plan/product.md#roles); the tenancy rows of the endpoint catalog in [contracts.md](../docs/plan/contracts.md).
Do: add one migration, `0005_identity_tenancy`, containing the changes below.
1. **`profiles`:**
   - `user_id uuid PK REFERENCES auth.users(id) ON DELETE CASCADE`
   - `display_name text` (1–100)
   - `observer_initials text CHECK (~ '^[A-Z0-9]{1,10}$')`
   - `locale text`
   - `created_at`
   - `deleted_at`
2. **`organizations`:** add the columns below.
   - `slug text UNIQUE CHECK (~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$')`
   - `created_by uuid`
   - `plan text DEFAULT 'pilot'`
   - `data_region text DEFAULT 'us-east-1'`
   - `is_platform bool DEFAULT false`
   - `created_at`
   - `deleted_at`
   - Backfill the slug of existing rows.
3. **`organization_members`:**
   - `(organization_id, user_id REFERENCES profiles ON DELETE CASCADE, role owner|admin|member, granted_by, granted_at)`
   - primary key `(organization_id, user_id)`
4. **`projects`:** add the columns below.
   - `code text` (unique per org, slug pattern)
   - `description`
   - `timezone text DEFAULT 'America/New_York'`
   - `status active|archived`
   - `is_training bool DEFAULT false`
   - `created_at`
   - Backfill.
5. **`project_memberships`:**
   - add `granted_by` and `granted_at`;
   - add a foreign key from `user_id` to `profiles` with ON DELETE CASCADE. **Check existing rows first.** The hosted database has at least one membership for a test user, and that user needs a profile row backfilled.
6. **`invitations`:**
   - `id uuid PK`, `organization_id`, `project_id NULL` (null means org-level)
   - `email citext NULL` (bound invite)
   - `role` (a project or org role)
   - `token_hash text NULL`, `join_code_hash text NULL` (at least one), both sha256 hex
   - `expires_at`, `max_uses int`, `use_count int`, `created_by`, `created_at`, `revoked_at`
7. **RLS** `TO fieldmaps_api`, using the DB-06 helpers:
   - `profiles`: read your own row, plus profiles of people who share one of your projects or orgs. Update your own row (`display_name`, `observer_initials`, `locale`).
   - `organizations`: read orgs you belong to. Today there is no read policy at all.
   - `organization_members`: read within your orgs. An admin or owner may update roles or delete, except the last owner.
   - `project_memberships`: read within your projects. A manager, or an org admin, may update roles or delete, except the last manager.
   - `invitations`: a manager or admin of the target may select, insert and revoke (update `revoked_at` only).
   - **No INSERT** on memberships for the API role. Memberships are created only by the DB-06 functions.
8. **Tests.**
   - Update `database/hosted/verify.sql`: the assertion "API cannot assign memberships" must still hold for INSERT.
   - Add SQL tests for every policy with two orgs.

Done when:
- the migration applies on a fresh local stack;
- the policy tests pass;
- `supabase db advisors` shows no new warnings except those documented in `docs/Supabase-Setup.md`.

### DB-06: Private schema, helpers and tenancy functions
Status: todo · Phase 1 · Size M · Depends: DB-05 · Blocks: BE-06, BE-07, BE-08
Do: add migration `0006_private_functions`. Every function below is SECURITY DEFINER, uses `SET search_path = ''`, is owned by the migration owner, has `REVOKE EXECUTE … FROM PUBLIC` and `GRANT EXECUTE … TO fieldmaps_api`, and starts by asserting `fieldmaps.request_user_id() IS NOT NULL`.
1. Create schema `fieldmaps_private`, with every privilege revoked from PUBLIC and the browser roles.
2. Helpers (STABLE):
   - `my_project_ids()`
   - `my_org_ids()`
   - `has_project_role(project_id uuid, roles text[])`, which also counts org admins as managers
   - `has_org_role(org_id uuid, roles text[])`
3. `ensure_profile(display_name text)`:
   - creates the profile if it is missing;
   - adds `observer` membership in the Training project (the `is_training` project, DB-07) if it is missing;
   - returns the profile.
4. `create_organization(name, slug, project_name, project_code, timezone)`:
   - allows at most 3 orgs where the caller is owner, and raises `limit_reached` otherwise;
   - inserts the org, the owner membership, the project, and a manager membership, in one transaction.
5. `redeem_invitation(token_hash text, join_code_hash text)`:
   - checks the invitation is not revoked or expired, `use_count < max_uses`, and, for bound invites, that the email equals `auth.users.email` for the caller (read here, never from a JWT or `user_metadata`);
   - inserts the membership, increments the count, and returns the project and org;
   - raises `invitation_invalid` or `invitation_expired`.
6. `forget_user()`:
   - refuses (`sole_owner`) when the caller is the only owner of an org that has other members;
   - otherwise deletes the caller's memberships and sets the profile's display name to null and `deleted_at`.
   - Observations keep `created_by` and `observer_code` as pseudonymous research labels.
7. SQL tests for every function, including the negative cases.

Done when: all function tests pass, and DB-04's coverage test still passes.

### DB-07: Training organization and project
Status: todo · Phase 1 · Size M · Depends: DB-05, DB-06, CON-02 · Blocks: BE-06, MOB-06
Read first: the Training rows in [decisions.md](../docs/plan/decisions.md) (D4); `supabase/migrations/20260918185806_fieldops_initial.sql:212-230` (the seeded practice org and project).
Do: add migration `0007_training`.
1. Convert the seeded org `10000000-…-0001` into the platform org ("FieldMaps Training", `is_platform=true`), and project `…-0002` into "Training" (`code='training'`, `is_training=true`). Keep the IDs, because current development builds point at them.
2. Seed a training form version from `contracts/forms/janet-test-v1.json` (code `training-v1`, published once DB-09 exists; before then, insert it under the current immutable model).
3. Change the observation SELECT policy: in an `is_training` project, only rows with `created_by = request_user_id()` are visible.
4. Schedule a `pg_cron` job, `fieldmaps_training_purge`, that deletes training observations older than 30 days. The window depends on open question Q2.
5. Exclude training projects from every `gis` view (GIS-01).
6. Note: the Training site package is uploaded through the normal pipeline once BE-13 exists. That step is in BE-13's `Done when`.

Done when: a new user calling `ensure_profile` is an observer in Training, and a second trainee cannot see the first trainee's rows (SQL test).

### DB-08: Before-User-Created hook
Status: todo · Phase 1 · Size S · Depends: DB-06 · Blocks: OPS-13
Read first: <https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook>.
Do:
1. Create table `fieldmaps_private.blocked_email_domains(domain text PK)`, seeded with a maintained list of disposable-email domains.
2. Create function `fieldmaps_private.before_user_created(event jsonb) RETURNS jsonb`:
   - SECURITY INVOKER, following the Supabase guidance;
   - `GRANT USAGE ON SCHEMA fieldmaps_private` and `EXECUTE` and `SELECT` on the table to `supabase_auth_admin`;
   - revoked from everyone else;
   - returns `{"error":{"http_code":400,"message":"Use a permanent email address."}}` for a blocked domain.
3. Enable it locally in `supabase/config.toml` (`[auth.hook.before_user_created]`).

Done when: a local sign-up with a blocked domain fails with that message, and a normal domain succeeds.

### DB-09: Instrument lifecycle (forms and versions)
Status: todo · Phase 2 · Size M · Depends: DB-05, CON-02 · Blocks: BE-11, GIS-01, SYNC-02
Do: add migration `0008_instrument`.
1. Create table `forms(id, organization_id, project_id, code, name, created_at)`, unique `(org, project, code)`.
2. Add to `form_versions`:
   - `form_id` (backfill `shell-v1` into form `shell`)
   - `version int`
   - `state draft|published|retired` (backfill existing rows as `published`)
   - `schema_version int DEFAULT 1`
   - `published_at`
   - `published_by`
3. Replace the trigger `immutable_form_version`:
   - UPDATE is allowed only when `OLD.state='draft'`; identity columns are always frozen;
   - after that, only the `published → retired` transition, which may set nothing else;
   - DELETE only for drafts.
4. RLS:
   - members read `published` and `retired` versions;
   - managers read drafts, insert drafts, and update drafts.
   - Publishing goes through `fieldmaps_private.publish_form_version(id)`, which sets the state, `published_at` and `published_by`. GIS-01 later adds the call to `publish_gis_view` inside this function, so publishing works in Phase 2 before typed views exist.
5. Tests: edit a draft; freeze on publish; retire; a manager-only draft is not visible to observers.

Done when: the lifecycle tests pass, and the existing upload tests still resolve `shell-v1`.

### DB-10: Collection schema for sync
Status: todo · Phase 2 · Size M · Depends: DB-05 · Blocks: BE-12, DB-11, SYNC-02
Read first: the observation envelope in [contracts.md](../docs/plan/contracts.md#observation-envelope-sync-upload-and-storage).
Do: add migration `0009_collection`.
1. Add to `observations`: `zone_code text NULL`, `package_version int NULL`, `device_id uuid NULL`, `app_version text NULL`. Extend the column-limited INSERT grant to cover them.
2. Create `upload_rejections`:
   - `id uuid PK`, `user_id`, `organization_id NULL`, `project_id NULL`, `observation_id uuid`
   - `operation jsonb`, `code text`, `message text`, `created_at`
   - RLS: users select their own rows; the API inserts with `user_id = request_user_id()`.
3. Create `assignments(id, organization_id, project_id, site_id, user_id, form_version_id, starts_on date, ends_on date, created_by, created_at)`.
   - RLS: members read the assignments in their projects; managers insert, update and delete.
4. Create `devices(id uuid PK, user_id, platform text, app_version text, last_seen_at)`.
   - RLS: users upsert their own rows; managers read the devices of their project members.
5. Tests for each policy.

Done when: the policy tests pass, and the existing `PUT` upload tests still pass.

### DB-11: PowerSync replication role and publication
Status: todo · Phase 2 · Size S · Depends: SYNC-01, DB-10, DB-12 · Blocks: OPS-08, SYNC-02
Read first: [sync-powersync.md](../docs/plan/sync-powersync.md#source-database).
Do: add migration `0010_powersync`.
1. `CREATE ROLE powersync_role WITH REPLICATION BYPASSRLS LOGIN;`, with no password in the file. The password is set out-of-band, as for `fieldmaps_api` (see `docs/Supabase-Setup.md`).
2. `GRANT USAGE ON SCHEMA fieldmaps, extensions TO powersync_role;`, plus `GRANT SELECT` on exactly the published tables.
3. `CREATE PUBLICATION powersync FOR TABLE` with the explicit list:
   - fieldmaps.profiles, fieldmaps.project_memberships, fieldmaps.organization_members
   - fieldmaps.projects, fieldmaps.sites, fieldmaps.zones
   - fieldmaps.form_versions, fieldmaps.site_packages, fieldmaps.assignments
   - fieldmaps.observations, fieldmaps.upload_rejections
4. Local stack: skip it, or guard it so `supabase start` still works. Document which.

Done when: the migration applies on staging (**Needs user**), and OPS-08 replicates.

### DB-12: Sites, zones, and packages in Storage
Status: todo · Phase 2 · Size M · Depends: DB-01, DB-05 · Blocks: BE-13, DB-11, SYNC-02
Do: add migration `0011_spatial_storage`.
1. Add to `sites`: `boundary geometry(MultiPolygon,4326) NULL`, `timezone text NULL`, and `current_package_id uuid NULL REFERENCES site_packages(id)`. The current pointer lives on `sites` so `site_packages` stays immutable.
2. Create `zones`:
   - `id uuid PK`, `organization_id`, `project_id`, `site_id`, `package_id`
   - `code text`, `name text`, `geom geometry(MultiPolygon,4326)`
   - unique `(site_id, package_id, code)`
   - RLS: members read; inserts come through the package pipeline (the API role, manager policy).
3. Change `site_packages`:
   - add `storage_path text NULL` and `archive_bytes bigint NULL`;
   - make `archive` nullable;
   - add `CHECK (archive IS NOT NULL OR storage_path IS NOT NULL)`.
   - Hosted has no package rows yet, so no backfill is needed. A follow-up migration drops `archive` once BE-13 has shipped.
4. Create the private bucket: `INSERT INTO storage.buckets (id, name, public) VALUES ('site-packages', 'site-packages', false)`. Add no `storage.objects` policies for `anon` or `authenticated`: only the API, using a server credential, writes and signs objects.

Done when: the migration applies locally, and a package inserted with `storage_path` but without `archive` passes the policies.

Note: the `workspace` stream in sync-powersync.md must read the current package from `sites.current_package_id`; it must not use a column on `site_packages`.

### DB-13: Audit log
Status: todo · Phase 4 · Size M · Depends: DB-05, DB-09 · Blocks: none
Do:
1. Create table `audit_events(id bigint identity, at, actor_user_id, organization_id, project_id, action text, entity text, entity_id text, before jsonb, after jsonb)`. It is append-only: a trigger blocks UPDATE and DELETE.
2. Add AFTER triggers on:
   - `organization_members` and `project_memberships`;
   - `invitations` (create, revoke, redeem);
   - `form_versions` (state change);
   - `site_packages` (insert);
   - `profiles` (forget).
3. RLS: org admins read their org's events.

Done when: each audited action writes one row (SQL tests).
