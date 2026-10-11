# Prompt for Claude: plan web and mobile zone-boundary frontend

Copy the text below into the DECA Mark workspace chat with Claude. All proposed backend details must be checked against the linked contract before coding.

---

Work in `/Users/praty/Desktop/StudentJob.nosync/field-ops`. Plan the web and mobile frontend for **zone polygon boundaries**, one complete feature at a time. The backend/database/data-layer plan has been saved but is **not implemented**. First inspect the actual source and produce a detailed frontend plan; do not start implementation or claim an endpoint exists merely because it appears in these documents.

Read these in order:

1. `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, `docs/plan/zone-boundaries/README.md`, and `docs/plan/zone-boundaries/assessment.md`.
2. `docs/plan/zone-boundaries/contract.md`, `supabase/ZONE-BOUNDARIES.md`, and `backend/ZONE-BOUNDARIES.md`.
3. `web/AGENTS.md`, `web/README.md`, `web/ZONE-BOUNDARIES.md`, `mobile/README.md`, and `mobile/ZONE-BOUNDARIES.md`.
4. `docs/plan/zone-boundaries/verification.md`, `qgis/ZONE-BOUNDARIES.md`, and the owning WEB-28/WEB-29/MOB-28/MOB-29 tasks in the component PLAN.md files.

## Product and user context

DECA Mark serves research teams observing children's play. Managers use the web to prepare sites/maps/forms and review data. Observers use phones/tablets in daylight, often offline, with attention on the activity. They manually place the observed activity location, which often differs from the observer's GPS position. Standard and Reliability rounds collect point events; Inventory records conditions/materials for a whole zone. Do not treat an inventory's compatibility anchor as an observed point.

The first editor changes zones over existing imported ground/reference layers. Basemap/imagery ingestion, round scheduling, field polygon authoring on mobile, GPS tracking, form builders and a general GIS rewrite are out of scope. Keep Polygon, MultiPolygon and holes readable and lossless. Contour is shared between web/mobile; tokens live in `contracts/contour.json` and map palettes in `contracts/map-palettes.json`. Managers get research language; observers get short field language. Every web operation uses real API data, never session-only fake persistence.

## Current source facts to verify

Web: `components/map/MapFrame.tsx` and `SitePlan.tsx` are SVG-based. Zone editing currently shows NotAvailable in `features/sites/SiteScreen.tsx`. Package import/history already exist. `lib/api/client.ts` uses request-scoped authenticated server reads; larger package writes go browser-to-API. `features/data/view.ts` already has zone filters and labels, but filters only the loaded newest 500 and labels from current site zones. That must change for history-safe complete filtering.

Mobile: `packages/hosted/` downloads and verifies archives/forms into device files; `session/provider.tsx`, SQLite stores and the outbox retain records. `domain/observation.ts` already stores package ID/version and zone code/label, but `sync/contracts.ts` omits package binding. `maps/geometry.ts` handles polygons/holes/multipart but exact edges are ambiguous. Draft restore can select the first zone when the saved one is missing; package removal lacks dependency checks. These are required data-layer fixes, not a reason to redesign every screen or replace the sync stack.

## Backend target and contract boundaries

Immutable map packages are the boundary versions. Stable zone UUID/code identifies a zone; each package freezes its label/geometry. A manager edit publishes a new package. Old observations and active offline sessions keep their original package. Ordinary reshaping/renaming retains identity; split/merge creates new identities. Default analysis is recorded-zone-at-collection, never a hidden reclassification against current boundaries.

Proposed manager endpoints under `/v1/projects/{p}/sites/{site_id}`: draft create/list/get/PUT/discard, validate, publish, and historical zones by package_id. Draft writes require ETag `If-Match`; publish requires request_id and expected_current_package_id. Missing precondition 428, stale draft 412, competing current package 409. Retrying a successful publication returns its original package without reactivating it. All imports into managed sites use the same activation rules. Detailed request/response/error shapes are in the contract; do not invent parallel client schemas.

Proposed observation upload: `PUT /v2/projects/{p}/observations/{id}` with strict nested `answers`, site/package/zone UUIDs, round context and manual point coordinates. Inventory omits event coordinates and first_round. Old v1 top-level answer requests remain unchanged. New records freeze upload protocol/body; never add fields to old queued requests or downgrade bound v2 data to v1. Receipt verification includes package/zone identity.

Proposed reads: v2 paginated observations/detail, summary and CSV/GeoJSON export, server-side zone/package/site/round/observer/date filters. Responses contain historical zone/code/label/package/version, assignment_basis and spatial_support. Inventory event geometry is null, with a separate display anchor/zone reference. Legacy records retain code with unknown boundary/version. New list response is an object; old v1 list remains an array. Use the same filter scope for map/table/export; label any map-page subset explicitly.

Updated web/mobile also use the proposed `/v2/projects/{p}/sites` discovery endpoint. Managed sites freeze a compatible old package for v1 clients, because current old mobile parsers accept new archive format numbers but strip unknown metadata. Do not fetch current managed boundaries through the old v1 site-list adapter or silently downgrade bound sessions after network failure.

## What you should plan

1. **Manager editing:** entry point, real persisted drafts, polygon/rectangle and vertex editing, keyboard/touch support, undo/redo, save states, topology errors, stale edits, publication review and version history. Compare adapting current map components with a dedicated drawing library using a small suitability spike. Preserve coordinates and complex shapes; choose tools on evidence.
2. **Manager review:** historical labels, map-version display, mixed-version states, deleted/renamed zones, site-scoped filters, server pagination/summary/export, legacy data and inventory representation. Decide sensible defaults without hiding uncertainty or caps.
3. **Observer collection:** version update messaging at session boundaries, offline package readiness/retention/recovery, point-on-boundary choice, missing geometry, reference-protected removal and exact draft resume. Keep existing crosshair placement and fast repeat collection; no per-observation network dependency.
4. **Frontend architecture:** component/state boundaries, existing server-fetch versus client editor state, runtime schemas, tenant/version-aware cache keys, mutation invalidation, cancellation/account-switch fencing and coordination with mobile data owners. Introduce libraries only for a demonstrated gap.
5. **Verification and handoff:** scoped files/tasks, dependencies, browser/device matrix, accessibility, offline/upgrade tests, API fixtures from the canonical contract, and issues that need lead decisions. Define concrete “done” evidence, not just successful compilation.

You may optimize implementation structure and propose a better approach. Protect the master plan's research/offline/security invariants. If a backend contract is insufficient, send the lead a precise proposed change, reason, affected consumers and acceptance cases before implementing a divergent client. Do not invent success responses to make screens work ahead of the API. Product defaults are recommendations: overlap prohibition, required zone for new bound points and delayed update adoption must be surfaced if the protocol needs alternatives.

Save detailed frontend planning in `web/ZONE-BOUNDARIES-UI.md` and `mobile/ZONE-BOUNDARIES-UI.md`, linked from the existing feature handoffs. Keep task status in owning PLAN.md files and run `pnpm plan:check` after changes. Coordinate edits to shared mobile session/providers/API files with the mobile data agent; coordinate generated types with the contract owner. Use parallel subagents only with explicit file ownership, no reverting others, and integration gates. Lead with the product outcome so implementers can improve technical steps while keeping behavior correct.

Do not read secret/env files. Do not commit, push, branch, migrate, deploy or publish without user authorization for that action. This prompt requests **frontend planning first**, not implementation. Report uncertainties honestly and finish zone-boundary planning before proposing the next map feature.
