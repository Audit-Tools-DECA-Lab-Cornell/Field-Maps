# FieldMaps database foundation

Local PostgreSQL 18 with PostGIS 3.6, independent of the existing research-product databases. The Docker image is pinned by digest. The official PostGIS image currently targets amd64, so Docker uses emulation on Apple Silicon. This setup is for development with fictional data, not a hosted deployment.

## Run

Start Docker Desktop, then run from the repository root:

```sh
make -C database up
make -C database migrate
make -C database seed
make -C database test
make -C database status
```

`up` creates the `fieldmaps`, `fieldmaps_test`, and `fieldmaps_api_test` databases only if absent. `migrate` applies the numbered migration transactionally under a database advisory lock; rerunning skips applied versions. Keep applied migrations unchanged and add a new version plus its ordered entry in `migrate.sql` for future changes. These are psql scripts, including relative-file directives, not scripts to paste wholesale into a browser SQL editor.

`seed` installs the fictional sample organization, project, site, practice form, and GIS view. It does **not** insert observations or copy records from the phone. The sample site code `sample-garden` and form code `shell-v1` match the mobile shell. Repeating the seed preserves existing rows.

The persistent volume is `fieldmaps-local_fieldmaps_data`. Stop with `make -C database stop`; restart with `make -C database up`. Stopping preserves data. Do not remove the volume if you need its data. Database backups and recovery automation are not implemented yet.

## Access and isolation

The container has **no network interface or published port**. PostgreSQL listens only on its internal Unix socket, with local trust authentication for the isolated development workflow. Commands execute inside the container as `fieldmaps_owner`, the migration administrator. Anyone with Docker control can administer this local database. This role must never be used as the application or customer GIS login.

The optional API container shares the PostgreSQL socket and publishes only its HTTP port on `127.0.0.1:8000`. Local socket trust is a development convenience, not production authentication. No account, API key, password file, or connection URL is required for database tests. Commands explicitly suppress Compose's automatic `.env` loading. Do not enable TCP access or deploy this local authentication configuration to a shared server. The phone and QGIS Desktop do not connect to this container yet.

Migration 0002 adds authenticated user UUIDs, project memberships, and the restricted `fieldmaps_api` role. Its row policies use transaction-local identity set by the API after JWT verification. Members can read their assigned projects; observers and managers can insert observations. The runtime role cannot update/delete records or manage membership. It is not a client database login. A missing identity has no access. See [API setup](../backend/README.md).

`fieldmaps_sample_reader` is a non-login role that can select only `gis.sample_observations`. That owner-executed, security-barrier view intentionally restricts results to the fixed fictional sample organization/project and `shell-v1` form. Its owner can read the base tables despite RLS; the view's fixed filter is therefore part of the security boundary. It is a local demonstration, not a general customer-access mechanism. Do not grant broad access to an unfiltered owner-executed view. New GIS accounts will need project-specific grants and tested isolation.

## Data model

| Table | Purpose |
| --- | --- |
| `fieldmaps.organizations` | Owning research organization |
| `fieldmaps.projects` | Study within one organization |
| `fieldmaps.sites` | Named site and stable project-scoped code |
| `fieldmaps.form_versions` | Immutable published form definition and code |
| `fieldmaps.project_memberships` | User UUID, project, and observer/manager/viewer access |
| `fieldmaps.observations` | Device-generated UUID, location, observer code, answers, timestamps, revision, and deletion marker |

Composite foreign keys prevent references to a site or form outside the observation's organization/project. Locations are non-empty 2D PostGIS points in EPSG:4326, with longitude first and latitude second. Constraints reject out-of-range coordinates and incorrect geometry types/CRSs; a GiST index supports spatial queries.

`observed_at` preserves the device's capture time; `received_at` is assigned at server insertion. Accepted updates increment `revision` and assign `updated_at`. A deletion marker keeps a tombstone while hiding the record from the sample GIS view. Create-upload acknowledgement and retry handling are implemented. Runtime edits/deletions, revision-checked updates, audit history, and download cursors remain future work. A revision counter alone is not a complete sync protocol; timestamps must not be used as a lossless replication cursor.

The upload API fingerprints normalized content and stores its authenticated creator. An identical replay returns the original receipt after commit; changed content or a different creator cannot overwrite the UUID. These guarantees are covered by concurrent API tests.

Answers are JSON objects associated with a specific form version. The database currently checks their container shape, **not each answer against the instrument**. The API validates the three practice fields before insertion; a general versioned instrument validator is still required. The sample GIS view safely projects the practice count and notes to typed columns and includes a stable integer `fid` and a typed `geom` column for GIS consumers. It excludes malformed practice values rather than failing the entire view. Do not infer that malformed values are acceptable uploads.

Observer initials are a research label, not an authenticated identity. Project memberships map account UUIDs to access. Observation rounds, zone context, task assignments, attachments, map packages, and Janet's full variable library still require their own contracts and migrations.

## Verification and next integration

The SQL suite runs in `fieldmaps_test`, creates fictional fixtures inside a transaction, and rolls them back. It exercises real PostgreSQL/PostGIS behavior, including geometry readback, duplicate prevention, foreign-key boundaries, form immutability, revision/tombstone behavior, and the restricted GIS role. It also reapplies the migration to check replay behavior. No device-to-server or QGIS Desktop connection is claimed by these tests.

Verified September 17, 2026: all 19 database assertions pass on PostgreSQL 18 / PostGIS 3.6.4. The migration record and sample project survived stopping and restarting the container; the restarted service has no network access or published ports. The API suite additionally verifies that a committed upload is readable through the restricted GIS view. It runs in the separate `fieldmaps_api_test` database with synthetic identities.

Next: configure the sign-in provider and a test membership, then verify one physical-device observation from offline creation through server commit and QGIS Desktop layer refresh. Do not give a mobile or browser app administrator database credentials.

## Hosted setup, when needed

The Supabase development project is now configured with PostgreSQL 17.6 / PostGIS 3.3.7. The API can use either the local socket database or the hosted session pooler; see [hosted setup and current verification](../docs/Supabase-Setup.md). These are separate data stores, and no local observations were migrated.

The local baseline uses PostGIS in `public`; the hosted baseline in `supabase/migrations/` installs it in `extensions` and restricts Supabase browser roles. Migration 0003 adds a schema-qualified spatial interface so the API works with both placements. Keep the local migration sequence and hosted migration history distinct; future schema changes must support both targets.

`hosted/verify.sql` runs seven assertions in one transaction and rolls back its synthetic membership, observation, and temporary administrator role grants. It checks database behavior, not a real Auth session or QGIS Desktop. Run it only as the authorized hosted administrator with stop-on-error enabled.

References: [PostGIS getting started](https://postgis.net/documentation/getting_started/), [PostGIS Docker image and supported architectures](https://github.com/postgis/docker-postgis), [longitude/latitude point construction](https://postgis.net/docs/ST_MakePoint.html), [PostgreSQL view security](https://www.postgresql.org/docs/current/sql-createview.html), [Supabase PostGIS setup](https://supabase.com/docs/guides/database/extensions/postgis).
