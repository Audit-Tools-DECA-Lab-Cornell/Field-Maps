# QGIS plan: site packages in, typed layers out (`qgis/`)

This file is part of the [FieldMaps production plan](../docs/plan/README.md) and defines the `GIS-*` tasks. It covers both directions between QGIS and FieldMaps. Several steps change code elsewhere, and those tasks are defined in other files:

| Direction | What | Tasks |
|---|---|---|
| QGIS → FieldMaps | A manager exports site layers from a QGIS project and uploads them as a site package | BE-13 (Storage, zones, current pointer), WEB-08 (upload on the site page), MOB-14 (device download) |
| FieldMaps → QGIS | Analysts read accepted observations as typed layers | **GIS-01 to GIS-04** (here), BE-15, WEB-12 |
| Later | Self-serve access with keys, richer formats, a publishing plugin | GIS-06 to GIS-08 (post-pilot) |

Decision D10 in [decisions.md](../docs/plan/decisions.md) sets the pilot's access model: per-project read-only database logins, with OGC API Features plus keys after the pilot.

## Context (verified 2026-09-22)

**Inbound: QGIS packages today**
- The API accepts GeoJSON layers `ground` and `zones` (required) and `paths` and `trees` (optional), plus an optional `.qgz` or `.qgs`. Five checks run: source project, layer sources, coordinate reference, imagery licence, and archive (`backend/src/fieldmaps_api/packages.py`, `qgis_project.py`).
- Zones are reduced to bounding boxes (`packages.py:469-478`).
- The imagery allow-list is an empty constant (`packages.py:31`).
- There is no GDAL, GeoPackage or raster support.
- The hosted database lacked the package tables until DB-01.

**Outbound: reading observations today**
- `gis.sample_observations` is owner-executed with `security_barrier`. Its WHERE clause hard-codes the org, project and `shell-v1` (`database/sample-gis.sql:32-34`), so RLS does not apply to it.
- The only reader is the login `fieldmaps_qgis_training`: INHERIT from `fieldmaps_sample_reader`, read-only, with 30 s timeouts.
- `qgis/pg_service.conf` has one service, `fieldmaps_training`. `fieldmaps-training.qgs` is kept outside git, next to its attachments archive.

**Why this is not multi-tenant.** Every new project would need a hand-written view, role and grant, and nothing maps a reader to a project.

## Target (pilot)

```
gis.observations                         generic view, security_invoker, answers as jsonb
gis.<project_code>__<form_code>_v<n>     typed view per published form version, columns from exportColumn
fieldmaps.gis_reader_grants              role_name → project_id (+ expires_at, revoked_at)
RLS on base tables TO each reader role   USING project_id IN (grants for current_user)
per-project login role                   fieldmaps_gis_<project_code>, created by a runbook, password out-of-band
qgis/pg_service.conf                     one service per project (public settings only)
```

Training projects never appear in any `gis` view (DB-07).

## Tasks

### GIS-01: Generic and typed GIS views, generated when a form is published
Status: todo · Phase 3 · Size L · Depends: DB-09, CON-02 · Blocks: WEB-12, QA-05
Read first: `database/sample-gis.sql`; `supabase/migrations/20260918185806_fieldops_initial.sql:232-269`; `contracts/form-definition.schema.json`; the migration conventions in [supabase/PLAN.md](../supabase/PLAN.md).
Do: add migration `0012_gis_views`.
1. Create a shared base role, `fieldmaps_gis_reader` (NOLOGIN), and the table `fieldmaps.gis_reader_grants(role_name text, project_id uuid, created_at, expires_at, revoked_at)`.
2. Add RLS policies `TO fieldmaps_gis_reader` on `observations`, `sites`, `form_versions` and `projects`. The pattern is `project_id IN (SELECT project_id FROM fieldmaps.gis_reader_grants WHERE role_name = current_user AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()))`. Grant SELECT on the grants table to `fieldmaps_gis_reader`, with a policy restricted to `current_user`.
3. Create `gis.observations WITH (security_invoker = true)`, with these columns:
   - `fid` (`qgis_id`), `observation_id`, `project_code`, `site_code`, `zone_code`, `form_code`, `form_version`
   - `observer_code`, `observed_at`, `received_at`, `revision`
   - `answers` (jsonb)
   - `geom geometry(Point,4326)`
   - Exclude training projects and tombstoned rows.
4. Create `fieldmaps_private.publish_gis_view(form_version_id uuid)`:
   - SECURITY DEFINER, `search_path = ''`, EXECUTE only for `fieldmaps_api`;
   - replace `publish_form_version` (DB-09) so it calls this function, and backfill views for versions that are already published;
   - it builds `gis.<project_code>__<form_code>_v<n>` with `security_invoker = true`;
   - each question with an `exportColumn` becomes a typed column. `one` and `text` become text, `number` becomes numeric, and `many` becomes `text[]` or a joined text column;
   - use `format('%I', …)` for every identifier, and accept only identifiers matching `^[A-Za-z][A-Za-z0-9_]{0,62}$`;
   - grant SELECT on the new view to `fieldmaps_gis_reader`.
5. Add SQL tests for the items below.
   - Two projects: a reader granted project A sees only A.
   - A revoked grant sees nothing.
   - The typed columns match the definition.
   - An identifier-injection attempt in `exportColumn` is refused.

Done when:
- the tests pass;
- publishing Janet's form locally creates its typed view;
- `supabase db advisors` adds no new warnings.

### GIS-02: Per-project reader logins (runbook)
Status: todo · Phase 3 · Size M · Depends: GIS-01 · Blocks: BE-15, GIS-04
Needs user: runs the script on staging and production, and sets passwords out-of-band.
Do:
1. Create `database/hosted/grant-gis-reader.sql`, a psql script with variables `:project_code` and `:role_name`. It:
   - creates `LOGIN INHERIT NOSUPERUSER NOBYPASSRLS` with `default_transaction_read_only = on`, 30 s timeouts, and `search_path = pg_catalog, extensions, gis`;
   - grants `fieldmaps_gis_reader`;
   - inserts into `gis_reader_grants`.
   There is **no password in the file**; it is set with `\password` in the same session.
2. Create `database/hosted/revoke-gis-reader.sql`. It sets `revoked_at` and runs `ALTER ROLE … NOLOGIN`.
3. Document both in `qgis/README.md`, including how to hand over a password safely (never in a project file).

Done when: on staging, a reader login for project A opens A's typed layer in QGIS and cannot read B. Record the steps and the screenshot in the task notes.

### GIS-03: Retire the fixed-ID sample view
Status: todo · Phase 3 · Size S · Depends: GIS-01, GIS-02 · Blocks: none
Do:
1. Migration steps:
   - drop `gis.sample_observations`;
   - move `fieldmaps_qgis_training` onto the new model with a grant for the Training project, or drop it and document that;
   - drop `fieldmaps_sample_reader` if nothing uses it.
2. Remove `database/sample-gis.sql` (together with DB-03) and update `qgis/README.md`.
3. `fieldmaps-training.qgs` is untracked. Tell the user which layer source to repoint; do not edit files outside the repository.

Done when: no object or doc references `sample_observations` except as history.

### GIS-04: QGIS connection templates
Status: todo · Phase 3 · Size S · Depends: GIS-02 · Blocks: WEB-12
Do:
1. Turn `qgis/pg_service.conf` into a documented template: one `[fieldmaps_<project_code>]` block per project, with public settings only and a checkout-relative certificate path.
2. Add `qgis/templates/fieldmaps-project.qgs`, a small project with the generic layer through `service=` and no credentials, plus the instructions for adding a typed layer.
3. Update `qgis/README.md` for the new model and the launcher (`open-training.command`).

Done when: following the README on a clean QGIS 4.2 install opens a project's typed layer.

### GIS-05: Retired number
Status: dropped (package pipeline improvements are defined in BE-13 so the API owns them) · Size S · Depends: none · Blocks: none

### GIS-06: OGC API Features endpoint with project keys (post-pilot)
Status: todo · Post-pilot · Size L · Depends: GIS-01, BE-03 · Blocks: none
Do:
1. Serve `/ogc/projects/{p}/collections`, `/collections/{form}/items` (GeoJSON, `bbox`, `datetime`, `limit`, `next` links) and `/conformance` from FastAPI, reading the `gis` views as `fieldmaps_api` under RLS.
2. Authenticate with a revocable, hashed project-scoped key, sent in the `Authorization: ApiKey …` header. QGIS's **"API Header"** authentication method sends it. OAuth2 token refresh in QGIS is unreliable, so do not rely on it.
3. Web: a manager creates and revokes keys on the GIS page.

Done when: QGIS adds an OAPIF layer for a project using a key, and a revoked key fails.

### GIS-07: GeoPackage uploads and offline raster base maps (post-pilot)
Status: todo · Post-pilot · Size L · Depends: BE-13 · Blocks: none
Do:
1. Add a GDAL worker container, which is the first background job; see [architecture.md](../docs/plan/architecture.md#what-is-deliberately-not-in-the-architecture-yet). It accepts a `.gpkg` directly and reprojects it to EPSG:4326 with pyproj/GDAL.
2. Produce PMTiles raster or vector base maps for a site's extent, with the licence check. The device opens them through MapLibre `pmtiles://file://`.

Done when: a GeoPackage in a local CRS becomes a ready package, and the device shows an imagery base offline.

### GIS-08: "Publish to FieldMaps" QGIS plugin (post-pilot)
Status: todo · Post-pilot · Size L · Depends: GIS-07 · Blocks: none
Do: build a QGIS Python plugin that exports the required layers from the open project and calls the package API with the manager's session (device-code or token paste). It shows the server's checks inside QGIS.

Done when: a manager publishes a package from QGIS without the web upload.
