# Database plan: immutable zone boundaries

[Master plan](../docs/plan/zone-boundaries/README.md) · [Wire contract](../docs/plan/zone-boundaries/contract.md) · Status: see DB-15 and DB-16 in [PLAN.md](PLAN.md).

## Read first and ownership

Read `database/README.md`, canonical migrations `20260918185806_fieldops_initial.sql`, `20260923120000_site_packages.sql`, `20260926210845_identity_tenancy.sql`, and `20261007120000_sites_forms_collection.sql`. Review `database/tests/lifecycle.sql`, isolation/default-privilege tests and package test fixtures. There is no `supabase/README.md`; the database README and owning plan supply the context.

The database agent owns all new migrations and SQL tests, including GIS views requested by GIS-09. Do not amend old migrations, introduce Alembic or write to hosted databases. Existing site packages remain immutable. Existing observations use non-null Point geometry and nullable `zone_code`; no current package/zone FK exists.

## Proposed schema

Names are proposed until CON-05 freezes them; tenant keys below always mean `(organization_id, project_id, site_id)` where relevant.

| Object | Columns / keys | Invariant |
| --- | --- | --- |
| `zone_identities` | `id uuid`, tenant/site keys, `code`, creator/time; unique tenant/site/id and tenant/site/code | Stable identity/code never reassigned; no mutable geometry or historical label here |
| `package_zones` | tenant/site keys, `package_id`, `zone_id`, `label`, `geom geometry(MultiPolygon,4326)`, `display_anchor geometry(Point,4326)`, canonical geometry digest; PK package+zone | Exact immutable snapshot; composite FKs to same-site package and zone; label/geometry not updated |
| `site_zone_state` | site PK plus tenant keys, `current_package_id`, `revision`, `enabled_at` | Explicit current pointer for adopted sites; composite FK to same-site package; pointer references a finalized ready package |
| Legacy selection on `site_zone_state` | nullable `legacy_package_id` with same-site FK | Frozen format-1 package for v1 site-list compatibility; never points at a format-2 package |
| `zone_drafts` | UUID, tenant/site keys, base package, revision, state, bounded `zones jsonb`, change note, actor/time, published package reference | Whole draft CAS, manager-only; state draft/published/discarded; published draft frozen |
| `zone_publications` | request UUID, caller/project/site, draft/revision, request hash, result package, actor/time | Durable idempotency and audit evidence; same request cannot publish twice or move current on replay |
| Observations additions | nullable `package_id`, nullable `zone_id`, `upload_protocol` with legacy default | Both binding IDs present for v2 and absent for historical v1; composite FK to exact package-zone snapshot |

Add nullable new-only metadata to `site_packages`: `zone_contract_version`, `site_boundary geometry(MultiPolygon,4326)` and `inventory_form_version_id` with same-project composite FK. Existing `form_version_id` remains the play form. New managed publications require a valid site boundary and contract version; inventory form may be null only when Inventory is explicitly unavailable. Old rows retain null new fields. These columns supply authoritative DB containment/form validation without querying a ZIP inside SQL. Manifest/layers and DB columns are derived from the same canonical publication input and tested for equality. The finalizer checks declared zone count/digest against inserted snapshots before activation.

Draft-creation idempotency can use a unique `(created_by, project_id, create_request_id)` on the draft and stored request fingerprint rather than a general-purpose idempotency framework. Publication uses a distinct operation/request identity. Published package metadata/manifest declares geometry contract/version and both play/inventory form bindings. Add a same-site composite unique key to `site_packages` where required for composite FKs; its existing PK alone does not express tenancy consistency.

Store historic `zone_code` for old API compatibility. For bound writes, derive it from the validated zone identity, never independently trust client input. Read historical labels by joining `package_zones`; a separate label string on each observation is unnecessary. Set `assignment_basis` from protocol/binding rather than a writable claim. `upload_protocol = 1` is the backfilled default only because all existing server observations used v1; do not fabricate package IDs.

Keep existing `observations.geom NOT NULL` for this release. Point events store the measured/manual event point. Bound inventories store the server-derived package zone anchor and retain `placement_source = zone`. New v2 and GIS projections must distinguish these semantics. Changing the column to nullable would break existing Point-returning v1 consumers and is not required to bind inventories correctly.

## Constraints and geometry enforcement

Require non-empty 2D valid MultiPolygon, SRID 4326, finite in-range coordinates and bounded complexity on every published snapshot. Explicitly reject null geometry: `ST_IsValid(NULL)` does not return false. Anchor must lie in its snapshot. Geometry normalization, overlap and site-containment checks are repeated inside the trusted publication boundary; application-only validation is insufficient for restricted-role SQL callers.

Ordinary CHECK constraints cannot safely enforce cross-row non-overlap or relationships to mutable tables. Run those checks while holding the site publication lock, then insert the full immutable snapshot set in the same transaction. Allow edge/vertex touching; reject positive-area interior intersections including containment and duplicate polygons. The actual site polygon comes from the retained canonical package ground layer, not its bounding box. Implement publication's geometry input representation consistently with backend package construction; never derive one side from a lossy preview.

For v2 observations enforce coherent combinations: bound IDs both required, standard/reliability implies hand placement and non-null first_round, inventory implies zone placement and null first_round. Validate package-zone membership and point coverage in a restricted insert function or narrowly scoped BEFORE INSERT trigger. Do not merely add a FK and skip spatial verification. The current `database/tests/lifecycle.sql` inventory fixture uses `first_round=false` while the API rejects it: retain legacy compatibility, change new v2 fixtures to the coherent contract, and explicitly test legacy rows remain readable.

## Publication transaction and immutability

1. Authenticate caller and current manager role; resolve an existing idempotency result first. Acquire locks in documented order: site state/site row, draft row, referenced immutable resources. Lock a site row even on first adoption so absent state rows cannot race.
2. Compare draft revision/ETag and expected current package. Check draft state, base package, published form bindings, zone identity continuity and limits. All shape validation runs against this exact revision.
3. Allocate next package version under site lock, build/validate the package's normalized zone set, insert package/checks/new identities/snapshots/publication event atomically. A service may prepare archive bytes outside the lock using the draft digest, but finalization must recheck digest/revision/current under lock.
4. Update current pointer/revision and mark draft published in the same transaction. A failure leaves no activated incomplete version. Return only after commit; persist enough result metadata to replay after response loss.
5. Same request replay returns its original publication; a distinct stale request conflicts. Rollback to old boundaries creates a new version. Never update the original archive or snapshots.

For managed sites, restricted runtime roles must not bypass finalization with direct `site_packages`, `package_checks` or `package_zones` writes. Revoke or scope old insert grants/policies so the legacy path only operates on unmanaged sites; trusted finalization is the sole writer of managed artifacts. Do not use a user-settable session flag as authorization. New SECURITY DEFINER helpers use a fixed empty search path, schema-qualified names, explicit caller lookup and narrowly granted EXECUTE. They validate all relationships themselves. Coordinate changes with existing project-member and inherited org-admin helpers.

Reject INSERT/UPDATE/DELETE into an already published zone snapshot set, not just UPDATE/DELETE. Preventing late appends is essential: current package-check policies attempt this for checks using preparation time; new snapshots should be inaccessible for direct insert and created solely during atomic finalization. Published identities cannot be moved between sites. Blocked legacy package checks and archives remain immutable/readable under their old contract.

## RLS and indexes

Enable RLS on every new table; explicitly revoke PUBLIC/anon/authenticated/service_role access according to this repository's policy. Drafts and publication audit details are manager-only; project members can read permitted finalized snapshots and historical packages. Observations retain observer-own versus manager/viewer access and Training creator-only isolation. Draft error responses cannot disclose another tenant's IDs/shapes.

Indexes: `(project_id, site_id)` for identities/state/drafts; unique package+zone and scoped code; GiST on published zone geometry; observation B-tree indexes aligned with `(project_id, site_id, zone_id, observed_at DESC, id)` and package filters, measured with EXPLAIN rather than adding every combination. Support legacy code lookup separately where needed. RLS must remain active in list, summary and export query plans. Validate index cost on representative synthetic volume; this plan does not require bulk indexing all history before a first pilot fixture works.

## Migration and adoption

Add forward migrations with nullable binding fields and protocol defaults, retaining old hashes, answers, IDs, receipts and archives byte-for-byte. Test on a disposable database containing v1 points, inventories, duplicate codes across sites, blocked packages and historical revisions. No data reset or user-device storage clearing is acceptable.

Adoption is explicit per site. Inspect existing ready package geometry and report invalid/missing/ambiguous features before enabling editing. Create a first **new** format-2 package cloned from the selected current format-1 package after validation and manager identity mapping. Existing packages need not be rewritten or backfilled into snapshots for this first implementation. Snapshot rows begin with the new package. Old packages continue supporting legacy uploads/readback. If a future migration indexes historic geometry, it must be a separate auditable operation and must not infer observation bindings.

The first successful draft publication performs adoption atomically: create site state under the site lock, freeze the base format-1 package as legacy selection, create new identities/snapshots and activate the format-2 result. Draft creation alone does not adopt a site. Existing ready imports published before that commit make expected-current stale and cause conflict. No separate undocumented activation endpoint or SQL toggle is required.

New UUID identities for adoption do not prove continuity with earlier unversioned zone codes. Codes already used historically should be reserved or explicitly mapped by the manager with an audit note; never reuse a code to imply the same sampled area automatically. Ambiguous code history is surfaced in the adoption report; the safest action is a new code. Existing observations remain legacy regardless of this mapping.

Separate schema installation from optional site adoption and hosted activation. Migration application is a destructive/privileged operation requiring the applicable user approval. An operational rollback disables new publication; do not drop new columns/tables once bound observations exist. Backups/restores must include both archive bytes and snapshot tables and preserve their identity/digest associations.

## Relationship to existing roadmap

DB-12 planned a mutable `zones`/Storage shape before this feature. DB-15/DB-16 own the revised versioned-zone schema and activation subset; DB-12 retains remaining site/Storage work and must reuse this model rather than create a second zones table. DB-14 archive retirement is not a prerequisite. DB-10's remaining device/assignment/rejection work is not required for this bound v2 PUT protocol. DB-13's eventual general audit log may consume publication events; this feature does not depend on that larger task.

## Acceptance

Run the new SQL tests through the existing local suite and preserve old lifecycle/isolation/GIS tests. Assert composite cross-tenant FKs, manager-only mutation, observer history reads, inherited admins, Training isolation, full transaction rollback, double publication, late append refusal, point coverage/hole/edge cases, old-row preservation and v2 inventory semantics. BE-18/BE-19 must additionally test these paths through the actual restricted API role. Hosted SQL execution and QGIS desktop evidence remain separate from local SQL success.
