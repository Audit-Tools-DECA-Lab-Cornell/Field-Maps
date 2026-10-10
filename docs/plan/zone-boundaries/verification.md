# Zone boundaries: acceptance and failure matrix

[Master](README.md) · QA-07 in [verification task file](../verification.md). These are required future checks, not results from creating this plan. No finite test list proves every possible edge case; add cases when implementation reveals a new failure mode.

## Test evidence rules

Use synthetic sites, users and observations. Automated tests target local services, never hosted research data. Record commit, migration level, client build/platform, fixture IDs, expected/actual behavior and command/output or screenshot evidence. Keep tokens, answers from real research and secret configuration out of artifacts. Distinguish unit, SQL, live API, browser, simulator, physical device and QGIS results.

## Geometry cases (shared across server and clients)

| Case | Required result |
| --- | --- |
| Convex and concave polygons | Valid shapes round-trip without changed coverage |
| Polygon with hole | Hole interior excluded; ring edge included by coverage rule |
| MultiPolygon with disjoint parts | One zone identity, all parts retained; no duplicated event count |
| Point strictly inside/outside | Same result on mobile, API and SQL |
| Point exactly on exterior edge or vertex | Selected covering zone accepted |
| Point on a shared zone edge | Explicit selected covering zone accepted; no iteration-order assignment |
| Point just either side of boundary | No undocumented tolerance/snap; client/server agree |
| Gap between zones | New point cannot be saved as bound to unrelated zone; draft retained |
| Bow-tie, crossing rings, hole outside shell | Draft may retain structurally valid input; publish blocks with useful issue |
| Empty, null, zero area, unclosed/short rings | Reject at documented boundary; never fallback to bbox |
| Duplicate vertices/segments, invalid multipart contacts | Canonical validation outcome shared and documented |
| Interior overlap, identical shape, one zone contained in another | Publish blocks; `ST_Overlaps`-only implementation fails this test |
| Shared edge/vertex without interior overlap | Publish allowed |
| Zone outside concave site or inside site hole | Publish blocks even if within site's bbox |
| Duplicate zone code/UUID, wrong-site identity | Reject without altering current package |
| Coordinate reversal, projected values, NaN/infinity, Z/M | Range/shape checks fail where detectably invalid; plausible reversed coordinates require map review, not false automatic detection claims |
| Winding/order normalization | Coverage preserved and output/hash deterministic |
| Antimeridian, polar/global shape | Clear unsupported-extent response for this release |
| Maximum and one-over complexity/body limit | Bounded response; current package/draft never corrupted |
| Malformed published geometry on device | New contract refuses readiness and preserves last-good package |

## Manager/database/API cases

| Case | Required result |
| --- | --- |
| Create/save/reopen draft | Real persisted state, server revision/ETag |
| Unfinished edit and network loss | Last acknowledged draft distinguishable from local dirty changes |
| Two saves using same revision | Exactly one update, other 412; no lost edit |
| Two publications with same expected current | Exactly one activation; loser 409 |
| Publish same request after response loss | Same package/receipt, no version duplication |
| Replay old success after another publication | Old result returned, current pointer unchanged |
| Idempotency key reused with different content | 409; original result preserved |
| Missing If-Match or expected current | 428; no mutation |
| Validation succeeds, draft changes before publish | Revalidate exact new revision or refuse stale request |
| Failure after archive generation/before final commit | No partial current state, dangling visible snapshot or successful receipt |
| Attempt direct INSERT into old package's zone set | Restricted DB role cannot append or mutate |
| Observer/viewer mutation and forged manager payload | API and DB deny |
| Org admin without explicit project membership | Intended inherited manager access works |
| Cross-tenant draft/package/zone IDs | No read/write or existence leak |
| Legacy import into managed site without preconditions | Refused; cannot bypass explicit publication |
| QGIS update with same label but ambiguous identity | Mapping required; no invented continuity |
| Zone rename/remove/split/merge | Historical rows unchanged; new identities where required |
| Corrective publication using older geometry | New monotonically higher version; old artifact untouched |
| Package form retired after capture | Authorized late upload uses historical frozen form |
| Membership revoked during edit/publish | Commit boundary enforces authorization/defined transaction ordering; no unchecked stale role |

## Observation and offline cases

| Case | Required result |
| --- | --- |
| v7 draft, v8 publication, offline v7 save/reconnect | Accepted as v7, visible/exported with v7 label/shape |
| Force quit during draft and after save before receipt | Exact context restored; no duplicate upload |
| v7 removed while referenced | Removal blocked or deferred; unfinished work remains usable |
| v8 download interrupted/cancelled/disk full | v7 remains installed/selected; no partial v8 readiness |
| Crash between file write and SQLite catalog commit | Restart reconciliation; no deletion of referenced old content |
| Draft zone missing in corrupt cache | Recoverable error, never first-zone substitution |
| Site list now names v8 but only v7 downloaded | Offline site remains usable with visible older version |
| Login expiry/server unavailable | Local create/save works; upload pauses/retries |
| Account/issuer switch during refresh/download | Stale result cannot alter new account's state |
| Shared package referenced by another account | Removal respects all references without revealing other account's private records |
| Revoked membership or deleted account | No unauthorized upload; records preserved for recovery |
| v1 accepted before upgrade, receipt lost | Identical retry acknowledged after upgrade |
| Old v1 never sent, including instrument context | Upload stays v1; history remains explicitly unversioned |
| New v2 request to old/incompatible server | No silent downgrade; data stays local |
| Old mobile refresh after format-2 publication | v1 site list returns frozen compatible package/zones; updated v2 list sees current managed package |
| Wrong package-zone/site/form combination | Typed rejection, needs-attention record retained |
| Same UUID/body replay | Original receipt; one server row |
| Same UUID/different content or protocol | Conflict; original row untouched |
| Receipt wrong account/project/package/zone | Not acknowledged |
| Inventory in concave or holed zone | Whole-zone support; server anchor inside actual geometry |
| Null/false first_round on inventory | v2 contract enforced consistently API/DB; old rows remain readable |
| Package upgrade between point placement and save | Same frozen version used through completion |
| Observer switches zones mid-draft | Explicit policy/carry-forward; no silent label/answer reassignment |

## Read/filter/export/GIS cases

| Case | Required result |
| --- | --- |
| Same code on two sites | Distinct scoped filters and labels |
| Same identity across reshaped versions | Historical labels/versions visible; exact-version filter works |
| Legacy code-only row | Unknown boundary version, no current-label fabrication |
| Zone filter with >500 matches | Server filters before pagination; complete export or explicit ceiling error |
| Cursor used with other filters/project | Rejected; no tenant leakage |
| Equal observed timestamps | Deterministic ID tie-break; no duplicate page rows |
| Late offline upload during pagination | Live-read behavior documented; refresh exposes new record |
| Full export during writes | Consistent export snapshot; no silent partial 200 |
| Date filtering across DST/project timezone | Correct half-open UTC bounds; table/summary/export agree |
| Export malicious label beginning =,+,-,@ | CSV text is safe for spreadsheet opening |
| Inventory included with points | Separate spatial_support; no ordinary point-event marker/count |
| MultiPolygon inventory | One observation, not one per polygon component |
| Zero matches and site gaps | Exact empty result, no false “complete coverage” claim |
| Map/table different loaded extent/page | Same filters; visible subset explicitly labelled |
| Historical package no longer current | Detail and QGIS overlay load recorded geometry |
| Training records under manager/viewer | Existing creator-only visibility preserved |
| Backup/restore | Archives, snapshot FKs, receipts and current pointer remain consistent |

## Complete story release gate

1. On local web, manager creates an adopted package, edits a polygon, receives a topology error, corrects it and publishes v7. A second manager's stale publication conflicts without losing edits.
2. On a physical collector device, download v7, switch to airplane mode, place a point and leave a draft. Manager publishes v8 with changed boundary and label. Restart device, resume v7, save point plus zone inventory, then reconnect.
3. Verify one accepted server row per observation, exact v7 package/zone binding, original receipt on replay, and inventory's whole-zone support. Attempt old package removal while a draft still references it.
4. On web and local exports/QGIS, filter by v7 zone, see matching rows and original boundaries/labels, distinguish inventory, and prove results beyond 500 with synthetic data. Start a new device session on verified v8.
5. Reviewer checks actual evidence and migration/recovery results. Missing physical-device/browser/GIS evidence is recorded as pending, not replaced by a green unit suite.

## Commands and bounded checks

After contract changes: `pnpm contracts:generate` twice and inspect generated drift. For code: `pnpm backend:check`, `pnpm backend:test`, `pnpm db:test`, `pnpm mobile:check`, `pnpm mobile:test`, `pnpm web:check`, `pnpm --dir web test:unit`. Use the existing local browser harness (`sh scripts/e2e-local.sh`) after reading its startup and fixture behavior; do not run reset/destructive setup implicitly. Feature test filenames are assigned by the owning implementation tasks rather than claimed to exist now.

For this documentation-only planning commit: run `pnpm plan:check`, validate relative links and task references, inspect `git diff --check`, and review the complete plan for contradictions. No application tests are claimed or required merely to create the proposal.
