# Zone boundary contract proposal

[Master plan](README.md). CON-05 owns freezing this proposal into authored shared cases and backend-generated OpenAPI. Paths and schemas below are proposed, not available endpoints. Any incompatible deviation requires lead review and coordinated consumer changes.

## Identity vocabulary

| Field | Meaning |
| --- | --- |
| `site_id` | Actual site UUID in new APIs; v1 observation `site_id` remains a site code |
| `package_id` | Immutable server package UUID; this is the boundary-set version identity |
| `package_version` | Human-readable monotonically increasing integer within one site |
| `zone_id` | Stable zone UUID, unique to one tenant/project/site |
| `zone_code` | Immutable human code; legacy `zone`/mobile `context.zoneId` remain code fields |
| `zone_label` | Label frozen in the referenced package, never obtained from the latest package |
| `draft_id`, `revision` | Mutable manager draft identity and monotonic concurrency revision |
| `assignment_basis` | Read-side `recorded_package` or `legacy_unversioned`; not client-asserted truth |

Do not trust redundant submitted labels, versions or project/organization identifiers. Derive them from authorized package/zone rows. UUIDs identify; foreign keys and RLS authorize.

## Geometry contract

New published geometry uses GeoJSON Polygon/MultiPolygon, 2D `[longitude, latitude]`, EPSG:4326. Reject NaN/infinity, out-of-range coordinates, extra dimensions, empty components, unclosed rings, rings with fewer than three distinct vertices, zero-area rings, invalid holes, self-intersections and invalid multipart topology. Normalize Polygon to MultiPolygon server-side without changing its area. Normalize ring orientation/order deterministically before publication; return the canonical geometry to the client. Keep full accepted precision in storage and archives; round only UI text.

Publication requires every zone to be covered by the package's actual site polygon (the `ground` feature whose `kind` is `site`). Positive-area interior intersections between zones are forbidden; boundary-only touching is valid. Test containment as well as ordinary crossing: `ST_Overlaps` alone misses one zone completely inside another. Use a tested interior-intersection predicate such as the relevant DE-9IM relation. No silent buffer, `ST_MakeValid`, simplification or clipping. A preview may offer a correction only as an explicit manager edit followed by validation.

Gaps in site coverage and very small zones are warnings; do not declare an unsampled gap “complete.” Allow holes and MultiPolygon through all readers even if Claude's initial drawing UI does not author every geometry operation. Reject antimeridian-spanning and polar/global shapes with a clear unsupported-extent issue in this playground-scale release. Set a supported latitude/extent envelope in CON-05 using actual site fixtures; do not accidentally reject legitimate existing packages during migration.

Initial configurable input bounds to prove in CON-05: 250 zones/package, 2,000 coordinate positions/zone, 20,000 positions/package, 4 MiB draft body. Counts include every ring/part. If real fixture measurements require other limits, update contract, body limiter, API tests and client guidance together. Bound CPU time for pairwise topology checks and use spatial index/bbox candidate reduction. The editor does not upload raster data. Existing ZIP/package limits still apply.

**Point attribution:** use `ST_Covers(selected_zone.geom, point)` on valid geometry. This includes outer and hole boundary edges, but not hole interiors. On a shared edge, accept the explicitly selected covering zone; no implicit “first match.” Client membership math must agree through shared authored cases. Near-edge points are not snapped/toleranced by validation; optional editor snapping changes the submitted geometry explicitly.

**Inventory:** references the complete zone snapshot. v2 returns `geometry: null` for the event and a `display_anchor` from the package's canonical interior point. The database may keep that anchor in the existing non-null `geom` column for v1 compatibility, with `placement_source = zone`. New v2 upload sends no coordinate for inventory; the server derives the anchor. GIS/export uses zone geometry or null event geometry, never a fabricated observation point. The chosen form version must match the package's frozen play/inventory binding and round type.

## Manager authoring endpoints

All paths below start with `/v1/projects/{project_id}/sites/{site_id}`. All mutations require manager ability including inherited organization-admin ability. No Supabase browser-table access is introduced.

The existing base site detail/update paths use `{site_code}`, not UUID. Keep those shipped routes unchanged; the new nested zone resources use an explicitly documented UUID parameter. Generated operation IDs and client adapters must distinguish these identities. If implementation prefers an unambiguous v2 site prefix, coordinate that change through CON-05 before clients are built; do not infer whether an arbitrary string is a UUID or code dynamically.

| Method and path | Request | Result |
| --- | --- | --- |
| `POST /zone-drafts` | `{request_id, base_package_id}` | `201` draft cloned from a permitted ready package; preserve ground/forms/other layers; replay returns same draft |
| `GET /zone-drafts/{draft_id}` | None | Full draft, `revision`, base and current package IDs, ETag |
| `PUT /zone-drafts/{draft_id}` | Full zones array and change note, `If-Match` | Updated draft/revision/ETag; whole-draft compare-and-swap, not last-writer-wins |
| `POST /zone-drafts/{draft_id}/validate` | `If-Match` | Validation issues, area/extent summaries and readiness against that revision; does not publish |
| `POST /zone-drafts/{draft_id}/publish` | `{request_id, expected_current_package_id}`, `If-Match` | `201` immutable package result; identical retry returns original `200` result |

Add manager list `GET /zone-drafts?state=draft|published|discarded` and conditional discard `DELETE /zone-drafts/{draft_id}` (soft state transition, `204`). Published drafts cannot be edited/discarded. Store the published result pointer so response loss is recoverable. Draft reads never appear in observer site lists.

Draft zone entry: `{zone_id, zone_code, zone_label, geometry}`. New entries use a client-generated UUID as an idempotent provisional identity; server checks it is either new or already belongs to the same site. Only publication creates a durable stable identity. Labels 1–200 trimmed characters; codes follow a frozen ASCII code pattern and maximum length selected in CON-05, never user-visible labels as keys. Existing same-site UUID requires its original code. Duplicate UUID/code fails. Existing identity omitted from a draft is removed from that next snapshot only.

Save structurally valid but topologically invalid draft shapes so work is not lost; validation/publish must reject them. Missing/unfinished drawing gestures stay client-local until a structurally complete ring can be sent. A draft response includes `base_package_id`, `base_package_version`, `revision`, `state`, `zones`, `change_note`, `updated_at`, `updated_by`, and `published_package_id` when applicable. `ETag` is a strong quoted draft revision token. Missing required precondition returns `428`; stale ETag returns `412`; stale current package at publication returns `409 publication_conflict` with authorized current identity. Preserve unsaved work; no automatic geometry merge/rebase.

All mutation request IDs are scoped to caller/project/operation and persist with normalized request identity. Reuse with a different request returns `409 idempotency_conflict`. Publication replay resolves the stored result before checking whether its old ETag/current pointer is now stale. It must not update the site's current pointer again. Every replay still checks current authorization. ETag compare/update runs atomically; two drafts based on the same package cannot both activate unnoticed.

### Historical reads and capabilities

`GET /v1/projects/{p}/sites/{s}/zones?package_id={uuid}` returns `{site_id, package_id, package_version, zones:[...]}` with full GeoJSON, UUID/code/label and display anchors. Omitting package uses the site's explicit current pointer. Historical authorized packages remain readable. Draft IDs are invalid here.

Extend site/package metadata additively with `zone_contract_version: 1 | null`, `map_revision`, `current_package_id`, and `zone_editing_available`. Package manifest format 2 contains stable zone UUIDs and frozen play/inventory form bindings, with legacy code IDs retained in the zones layer for older readers. Do not assume old clients can parse format 2; test actual old schemas/builds. Existing format-1 packages remain unchanged and readable.

Compatibility evidence to test explicitly: current mobile `manifestSchema` accepts any format >=1 and strips unrecognized fields, while its local stored-package wrapper is fixed at format 1. Therefore an old app may open format 2 yet discard UUID bindings and choose an unrelated current inventory form. Keep v1 collection visibly unversioned in upgraded management reports and require the upgraded collector for the feature's reproducibility guarantee. Test actual installed client behavior using the compatibility selection below. Do not claim server capability alone upgrades an old app or that an old app can display newly introduced warnings.

**Selected compatibility mechanism:** add `GET /v2/projects/{p}/sites` with the same base site fields plus the above capability/version metadata; updated mobile and web use it. On site adoption freeze `legacy_package_id` to the site's last ready format-1 package. For managed sites the existing v1 site list/detail continues returning that legacy package and its matching zones, not the new managed current pointer. Unmanaged sites keep existing v1 selection. No v1 latest-ready query may accidentally discover a format-2 package. Package-by-ID reads remain authorized and available for recovery; package list clients must filter by supported format. A site with no compatible legacy package returns no downloadable v1 package. Old apps' uploads remain accepted as legacy; manager reports distinguish them, and the launch guide requires the upgraded observer app for version-bound research. Avoid changing a legacy package's form choices or archive bytes to emulate v2.

An upgraded client uses bound collection only when both server capability and a verified format-2 package are present. Format-1 collection remains v1 and visibly legacy. Unsupported servers must not receive v2 bodies via silent fallback. No WebSocket/subscription is required: discover package changes on site refresh/foreground/manual refresh, and install only for a later session. Collection makes no extra network call per point.

### Existing import/publication route

Keep `POST /v1/projects/{p}/packages/import` as conversion-only. Extend `POST /v1/projects/{p}/packages` for managed-site imports with explicit zone identity mapping, expected current package and idempotency request ID; route its finalization through the same validation/activation service as zone editing. A legacy submission to a managed site without those preconditions returns `428 precondition_required`, not an unnoticed replacement. Unmanaged sites retain the documented legacy upload behavior until adoption. Blocked packages never become current.

A draft whose base is no longer current can still be read/exported/discarded. For initial implementation, create a new draft from current and explicitly reapply edits; do not implement automatic rebase. A rollback republishes a selected old geometry as a **new** version through this same path.

## New observation protocol

Use `PUT /v2/projects/{project_id}/observations/{observation_id}`. Keep existing v1 uploads and hashes untouched. A separate v2 envelope avoids colliding with instrument answers currently spread into v1's top-level fields.

Point example (illustrative synthetic identifiers; package and zone must exist together):

```json
{
  "schema_version": 2,
  "site_id": "10000000-0000-4000-8000-000000000001",
  "package_id": "20000000-0000-4000-8000-000000000007",
  "zone_id": "30000000-0000-4000-8000-000000000001",
  "form_version": "study-play-v1",
  "round_type": "standard",
  "first_round": true,
  "placement": "hand",
  "coordinates": [-76.48, 42.44],
  "observer": "AB",
  "observed_at": "2026-10-10T14:00:00Z",
  "answers": {}
}
```

The empty answers above only illustrates the envelope; form-required answers must still validate. Inventory uses `round_type: inventory`, `placement: zone`, omits `coordinates` and `first_round`, and selects the frozen inventory form. Point variants require finite coordinates and `first_round`. Reject conflicting or extra envelope fields; answers are confined to `answers`.

Server resolves tenant/site/package/zone and form, checks package finalized and point coverage, then atomically stores observation and binding before returning receipt. Current-package equality is **not** required. Superseded and archived-site packages remain acceptable for authorized late uploads under existing archive semantics. Draft/blocked/nonexistent/cross-site packages cannot bind records.

V2 fingerprint has a fixed documented canonicalization version covering the immutable client envelope and authenticated owner, excluding server-derived labels/anchor/current pointer. Preserve the old v1 fingerprint algorithm for old requests. Same UUID, owner, protocol and payload returns original receipt; different content/protocol is conflict. Look up and verify an existing receipt before reevaluating mutable publication state; authorization is still required. Never allow a v1 retry to claim a v2 row or vice versa.

V2 receipt extends the existing identity/time/revision fields with `schema_version`, `package_id`, `zone_id`, `assignment_basis: recorded_package`. Mobile verifies all identities against its frozen record before acknowledging. Store `upload_protocol` and frozen upload representation/hash version locally at record creation; protocol selection is not recalculated during retry. All pre-upgrade rows remain v1, including rows carrying local package context whose server acceptance status is unknown.

### Error handling

| HTTP / code | Meaning | Client action |
| --- | --- | --- |
| `401 token_invalid` / existing unauthenticated | Session unavailable | Pause uploads; preserve local data; sign in |
| `403 role_required` / existing access code | Current authorization insufficient | Preserve record/draft; explain permission; no automated re-homing |
| `404 not_found` | Resource absent or hidden by authorization | No cross-tenant existence disclosure |
| `409 publication_conflict`, `idempotency_conflict`, `conflict` | Concurrent publish or mismatched retry | Retain draft/record and expose conflict; no overwrite |
| `412 revision_conflict`, `428 precondition_required` | Stale/missing manager write precondition | Reload metadata while preserving edits |
| `422 validation_failed` | Invalid geometry or observation binding | Structured safe issue details; keep local record as needs attention |
| `413 payload_too_large`, `429 rate_limited`, `503 storage_unavailable` | Limits or temporary inability | Actionable size issue; retry/backoff for 429/503; preserve data |

Geometry issue shape in existing error envelope: `{code, zone_ids, path, message}`; codes include `self_intersection`, `outside_site`, `interior_overlap`, `duplicate_code`, `unsupported_extent`, `too_complex`, `point_outside_zone`, `zone_not_in_package`, `form_not_in_package`. Details contain only authorized submitted resource identities and safe coordinates when useful; logs omit shapes/answers. Unknown/malformed responses remain retryable under current mobile behavior. Freeze exact code mappings and examples in CON-05.

## Observation reads, filters and exports

Introduce `GET /v2/projects/{p}/observations` returning `{items, next_cursor, total_matching, generated_at}`. Keep v1 array/list contract unchanged. V2 filters: `site_id`, `package_id`, `zone_id` (repeated values OR together), `assignment_basis`, `round_type`, `observer`, `observed_from`, `observed_before`, and `cursor`, `limit` (1–500). Different filter dimensions AND together. Zone IDs must belong to the requested permitted site/project. Exact recorded snapshot filter is package+zone; stable zone only intentionally spans versions. No-zone/legacy filtering uses explicit basis/legacy code parameters rather than an overloaded empty UUID. Define `legacy_zone_code` and require `site_id` for it.

All rows return historical `zone_id`, `zone_code`, `zone_label`, `package_id`, `package_version`, `assignment_basis`, and `spatial_support: point | zone | legacy_unknown`. Legacy rows have null binding fields and retain recorded code; never fill a historical label from current zones. `geometry` is a Point for point events, null for zone events; `display_anchor` is separately available for inventories. A detail route at the same v2 path includes historical zone references and the recorded form.

Keyset ordering: `(observed_at DESC, observation_id ASC)` with cursor carrying both values and the canonical filter identity. Malformed/mismatched cursors return 422. API owner must implement the mixed-direction predicate correctly. Interactive pages are live reads: `total_matching` is exact for that response's DB snapshot, not a permanent export snapshot. Concurrent late uploads can alter later pages; surface refresh availability and deduplicate by ID. Do not claim a time cutoff alone provides transaction-snapshot consistency.

Add `GET /v2/projects/{p}/observations/summary` and `/export?format=csv|geojson` using the same authorized filter builder. Register static routes before `/{observation_id}`. Summary returns zone/package/round grouped totals and legacy/unversioned counts. Export executes within one bounded repeatable-read snapshot or one streaming SQL statement; rows/count/scope agree. Start with a documented row/byte/time ceiling measured in BE-20. If scope exceeds the ceiling, return an explicit narrowing requirement before emitting a partial success, never truncate at 500. Client-side export of loaded pages is not an “all matching” export.

Existing observer/day/search filters must not silently keep applying only to one page. Move supported filters server-side; any deferred full-text search stays explicitly “search this page” until implemented. Export scope includes timezone interpretation, UTC interval bounds, filter values, generation time, versions and assignment basis. CSV adds stable zone/package fields and neutralizes spreadsheet formula prefixes in human text. GeoJSON emits null geometry for inventory events and links a separate zone layer by package+zone. Map and table use the same filtered result scope; if map only renders loaded pages it must say so. Large-scope overview totals come from summary, not visible markers.

## Shared contract artifacts to create during implementation

Author `contracts/zones/geometry.cases.json`, `contracts/zones/publication.cases.json`, and `contracts/zones/upload.cases.json` with expected results independent of implementation. Cover old v1 fingerprints and new v2 examples. Backend owns Pydantic/OpenAPI; coordinator runs `pnpm contracts:generate` and checks second-run stability. Mobile/web runtime schemas validate downloaded/cached data, not just compile-time types. This plan does not hand-edit generated OpenAPI or TypeScript declarations.
