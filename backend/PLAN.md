# API plan (`backend/`)

This file is part of the [FieldMaps production plan](../docs/plan/README.md) and defines the `BE-*` tasks.
- **Endpoint shapes and the error envelope** are owned by [contracts.md](../docs/plan/contracts.md). Implement them as written there; if one must change, change contracts.md first.
- **Database objects** these tasks rely on are `DB-*` tasks in [supabase/PLAN.md](../supabase/PLAN.md).
- **Layering and module boundaries** are in [architecture.md](../docs/plan/architecture.md#layering-inside-each-component).

## Context (verified 2026-09-22)

**Code layout**
- `main.py` builds the app, with every route as a closure inside `create_app`. There is no `APIRouter`.
- `repository.py` mixes transaction handling, use cases, data access and `HTTPException`s. `queries.py` holds raw SQL constants.
- Pure domain modules: `forms.py` (answer validation), `packages.py` (package preparation and 5 checks), `geojson.py`, `qgis_project.py`.

**Routes** (8 today): `/health`, `GET /v1/projects`, `PUT`/`GET` observation, and 4 package routes.

**Authentication** (`auth.py`)
- Verifies ES256/RS256 against JWKS (`PyJWKClient`, cached 300 s).
- Requires `exp`, `sub`, `iss` and `aud`, with **no leeway**.
- Ignores `is_anonymous`.

**Per-request identity.**
- Every request runs in `user_transaction`, which sets `fieldmaps.user_id` (`repository.py:38-48`).
- Since BE-16 (2026-09-26), every role-check query names the caller: `m.user_id = fieldmaps.request_user_id()`.
- Correctness no longer depends on the memberships SELECT policy hiding other members' rows. DB-05 widens that policy for managers.

**Operations gaps**
- No logging, request IDs, Sentry, readiness endpoint, rate limits or body-size limit.
- Every `SQLAlchemyError` is turned into a 503. That includes programming errors, and it hid the package-list bug fixed in BE-16.
- The Dockerfile runs as root, installs dev dependencies and copies `tests/` into the image.

**Forms.** `forms.py` validates the **server** format (`code`, `type`, no conditions). The mobile format is different; CON-02 and BE-10 fix that.

**Tests.** 59 API tests run against real PostGIS (`backend/tests/`, 2026-09-26). Every change keeps them green.

## Target layout

```
backend/src/fieldmaps_api/
  main.py                 app factory: config, engine, middleware, exception handlers, include_router
  errors.py               domain errors + one handler → error envelope
  observability.py        JSON logging, request id middleware, Sentry init
  deps.py                 authenticate, user_transaction, rate limiter
  routers/{identity,tenancy,sites,instrument,collection,analysis,gis}.py
  services/{…same…}.py    use cases; raise domain errors
  repositories/{…same…}.py + queries/{…}.py   SQL only
  domain/{forms,packages,geojson,qgis_project}.py   pure logic (moved, unchanged APIs)
```

## Tasks

### BE-01: Harden the container image
Status: todo · Phase 0 · Size S · Depends: none · Blocks: OPS-04
Read first: `backend/Dockerfile`; `database/Makefile` (targets `api-build` and `api-test`); recent commits "Carry the build metadata into the image the tests run in".
Do:
1. Split the Dockerfile into a multi-stage build:
   - a `test` target, which keeps dev dependencies and `tests/` and is used by `make api-test`;
   - a `runtime` target, built with `uv sync --frozen --no-dev --no-install-project`, without tests, running as a non-root `USER`.
2. Start uvicorn with `--proxy-headers --forwarded-allow-ips='*'`, because Render sits behind a proxy. Keep `PORT` handling.
3. Add a `HEALTHCHECK` that calls `/health`.

Done when:
- `make -C database api-build api-test` still passes;
- the runtime image has no pytest and runs as non-root.

Verify: `docker run --rm <runtime-image> id -u` prints something other than 0; `docker run --rm <runtime-image> python -c "import pytest"` fails.

### BE-02: Readiness, observability, and a safe database-error mapping
Status: todo · Phase 0 · Size M · Depends: none · Blocks: OPS-04
Do:
1. Add `GET /ready`. It runs `SELECT 1` through the pool and fetches the JWKS (cached), and returns 503 with the error envelope if either fails.
2. At startup, query `SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user` and refuse to start if either is true (architecture rule 4). Add a test.
3. Add JSON structured logging and an `X-Request-Id` middleware that accepts or generates the id and echoes it. Never log bodies, tokens or `answers`.
4. Initialize Sentry only when `SENTRY_DSN` is set, with scrubbing that matches OPS-07. The DSN can arrive later; the code must work without it.
5. Map database errors by what they are, never by class alone.
   - `DBAPIError` is the base class of every SQLAlchemy driver error. Under asyncpg it also wraps plpgsql `RAISE EXCEPTION` and RLS violations. Catching it wholesale would turn `sole_owner` into a retryable 503.
   - Read `error.orig.sqlstate` and map it as follows:

     | SQLSTATE | Result |
     |---|---|
     | `FM001`–`FM008` | The code and HTTP status in the [contracts.md table](../docs/plan/contracts.md#error-envelope) |
     | `23505` | 409 `conflict` |
     | `23514`, `23502`, class `22` | 422 `validation_failed` |
     | `23503` | 422 `validation_failed` (a reference to something that does not exist) |
     | `42501`, or an RLS `WITH CHECK` violation | 403 `role_required` |
     | Transient: class `08`, `57P01`, `40001`, `40P01`, `55P03`, `57014`, class `53`, SQLAlchemy pool `TimeoutError`, `InterfaceError`, or a connection that was invalidated | 503 `storage_unavailable` |
     | Anything else | 500 `internal`, sent to Sentry |

Done when: the new tests cover all of these:
- `/ready` failing;
- the bypass refusal;
- a request id on responses;
- an `FM002` raised in the database surfacing as 409 `sole_owner`;
- a CHECK violation surfacing as 422;
- a dropped connection and a deadlock surfacing as 503.

Verify: `pnpm backend:test`; `pnpm backend:check`.

### BE-03: Restructure into routers, services and repositories, with the error envelope
Status: todo · Phase 0 · Size M · Depends: none · Blocks: BE-04, BE-06, BE-07, BE-09, CON-04, GIS-06
Read first: every file in `src/fieldmaps_api/`; [contracts.md](../docs/plan/contracts.md#error-envelope).
Do:
1. Move the code into the target layout above. **This is a behaviour-preserving refactor:** the same routes, status codes and bodies, except that errors adopt the envelope.
2. Create `errors.py` with `DomainError(code, message, status, details)` subclasses, and replace every `HTTPException` raised in the repository code.
3. Register one exception handler that turns every error (including FastAPI's 422) into `{error:{code,message,details}}`. Add the envelope as a component schema in the OpenAPI output.
4. Update the mobile (`mobile/src/sync/upload.ts`) and web (`web/src/lib/packages.ts`) error readers only if they parse bodies. Today they branch on status codes, so nothing breaks.

Done when:
- every existing test passes, with assertions updated only for the error body shape;
- no `HTTPException` remains outside `deps.py`.

### BE-04: OpenAPI export without a database
Status: todo · Phase 0 · Size S · Depends: BE-03 · Blocks: CON-03
Do:
1. Add `fieldmaps_api/openapi.py`, which builds the app with a dummy config and no connection, then prints `app.openapi()` as sorted JSON.
2. Add a `make -C backend openapi` target, or a root `Makefile` target, that writes `contracts/openapi.json`.
3. Give every route an `operation_id`, a response model, and the error responses it can return, so the generated client types stay stable.

Done when: running the target twice produces identical output, with no database or network.

### BE-05: Token checks
Status: todo · Phase 0 · Size S · Depends: none · Blocks: none
Read first: `auth.py`; `tests/test_authentication.py`.
Do:
1. Add `leeway=30` to `jwt.decode`.
2. Reject tokens with `is_anonymous: true` (401 `token_invalid`).
3. Keep requiring `sub` as a UUID, and keep checking `iss`, `aud` and `exp`.

Done when: new tests cover leeway on both sides of 30 s and the anonymous-token rejection.

### BE-06: Identity: `GET /v1/me` and `PATCH /v1/me`
Status: todo · Phase 1 · Size M · Depends: BE-03, DB-05, DB-06, DB-07 · Blocks: BE-07, BE-08, MOB-04, MOB-06, QA-01, WEB-05, WEB-06
Read first: the identity rows in [contracts.md](../docs/plan/contracts.md#api-endpoint-catalog-v1); DB-06 (`ensure_profile`).
Do:
1. `GET /v1/me` calls `fieldmaps_private.ensure_profile(null)` and returns:
   - the profile;
   - org memberships `[{org id, slug, name, role}]`;
   - project memberships `[{project id, code, name, org id, role, is_training}]`.
   - It is idempotent.
   - `FM005` becomes 403 `account_deleted`. That covers a forgotten profile, and a token whose Auth user is already gone. It is never a 500. Test both cases here.
2. `PATCH /v1/me` accepts a display name (1–100 characters), initials (the observer-code pattern) and a locale.
3. Add the rows to QA-01's isolation suite.

Done when:
- a first call creates the profile and the Training membership;
- a second call changes nothing;
- the tests pass.

### BE-07: Tenancy: organizations, projects, members, invitations
Status: todo · Phase 1 · Size L · Depends: BE-03, BE-06, DB-05, DB-06 · Blocks: MOB-06, QA-01, WEB-06, WEB-07
Read first: the tenancy rows in the contracts catalog; DB-05 and DB-06. Every write goes through a DB-06 function. The API holds no INSERT, UPDATE or DELETE on membership or invitation tables.
Do:
1. **Organizations:**
   - `POST /v1/orgs` calls `create_organization`: 409 `conflict` on a slug clash, 403 `limit_reached` over the limit.
   - `GET /v1/orgs`, `GET /v1/orgs/{org}`.
   - `PATCH /v1/orgs/{org}` changes only `name` and `slug`.
2. **Org members.**
   - `GET /v1/orgs/{org}/members`.
   - `PATCH …/members/{user}` calls `set_org_role`; `DELETE` calls `remove_org_member`.
   - `POST /v1/orgs/{org}/transfer-ownership` calls `transfer_ownership`.
   - There is no POST for members: people join only through invitations.
3. **Projects:**
   - `POST /v1/orgs/{org}/projects` calls `create_project`.
   - `GET /v1/orgs/{org}/projects`, `GET /v1/projects/{p}`.
   - `PATCH /v1/projects/{p}` changes only `name`, `description`, `timezone` and `status`.
   - Fold the existing `GET /v1/projects` into this module; its response only gains fields.
4. **Project members.** `GET /v1/projects/{p}/members` (managers), `PATCH …/members/{user}` calls `set_project_role`, and `DELETE` calls `remove_project_member`.
5. **Invitations**, at `POST /v1/projects/{p}/invitations` (project roles) and `POST /v1/orgs/{org}/invitations` (org roles `member` or `admin`).
   - Both take `{role, email?, max_uses, expires_in_days}`.
   - The server generates a token of 32 random bytes (base64url) and/or an 8-character join code (Crockford base32, about 40 bits, no ambiguous characters). It passes only their sha256 hashes to `create_invitation`, and returns the plaintext **once**.
   - A lowercased email binds the invite.
   - `expires_in_days` is converted to an interval for `create_invitation`.
   - `GET` lists invitations without secrets.
   - `DELETE /v1/projects/{p}/invitations/{id}` and `DELETE /v1/orgs/{org}/invitations/{id}` call `revoke_invitation(org, project, id)`, with the scope taken from the URL.
6. **`POST /v1/invitations/preview`** takes `{token}` or `{code}`, consumes nothing, and calls `preview_invitation`.
   - It returns `{organization name, project name, role, expires_at}`, so clients can ask "Join … as …?" before redeeming.
   - It is rate-limited in the same bucket as redemption (BE-09).
7. **`POST /v1/invitations/redeem`** takes `{token}` or `{code}`. It normalises the code (uppercase, dashes stripped), hashes it, and calls `redeem_invitation`.
8. **Invitation email delivery is out of scope.** The web shows a copyable link and code. Emailing links is post-pilot.
9. Add the rows to QA-01.

Done when: every endpoint passes its tests, including the cross-org negatives in QA-01.

### BE-08: Account deletion: `DELETE /v1/me`
Status: todo · Phase 1 · Size M · Depends: BE-06, DB-06 · Blocks: MOB-07, OPS-11, WEB-06
Needs user: create the Supabase secret key (`sb_secret_…`) and put it in a runtime Secret File (`supabase-secret-key`) for staging and production. It is never committed.
Do:
1. Add a config field `auth_admin_key_file` (optional). When it is missing, the endpoint returns 503 `storage_unavailable` with an explanatory message.
2. **The flow.** It is safe to repeat.
   1. Call `fieldmaps_private.forget_user()` inside the user transaction. `sole_owner` gives 409. `forget_user` is idempotent, so a repeat call for a forgotten profile goes straight to the next step.
   2. After the commit, call the Supabase Admin API `DELETE /auth/v1/admin/users/{id}` with the secret key, with a timeout and one retry. Treat 404 as already deleted. Return 204.
   3. If step 2 still fails, return 202 with `{"status":"pending"}`. Log at ERROR level and send to Sentry, with the user id only.
      - The durable record is the profile's `deleted_at`. It stays set until the Auth deletion cascades the row away (DB-06), and `assert_active_user()` stops that account regaining any membership in the meantime.
      - `DELETE /v1/me` is safe to repeat. The clients retry it a bounded number of times **before** signing out, while their session is still valid (MOB-07, WEB-06). After that, only the server-side record remains.
      - Operators finish leftovers with the query in `docs/Production-Runbook.md` (OPS-09).
3. Map `FM005` from any DB-06 function to 403 `account_deleted`.
4. The secret key is used by this service function only. Test that it never appears in logs.

Done when the tests (with the Admin API mocked) cover:
- success, and sole owner;
- an Admin API failure returns 202, after which `GET /v1/me` returns 403 `account_deleted` and the user has no Training membership;
- a repeated `DELETE /v1/me` with the Admin API healthy returns 204;
- `DELETE /v1/me` for a token whose Auth user is already gone returns 204: `forget_user` is a no-op and the Admin API answers 404, which counts as already deleted.

### BE-09: Rate limits and body-size limits
Status: todo · Phase 1 · Size S · Depends: BE-03 · Blocks: none
Do:
1. Add a body-size middleware:
   - 24 MB for `POST …/packages`, which carries JSON plus a base64 project file (limits in `packages.py:33-36`);
   - 4 MB for `POST /v1/sync/upload`. MOB-10 sizes batches to fit, and treats a 413 as "retry with a smaller batch", never as success;
   - 256 KB for everything else.
   - It rejects oversize bodies **before** parsing, with 413 `validation_failed`.
2. Add per-user token-bucket limits, kept in memory (a single instance for the pilot; document that), on:
   - `POST /v1/orgs`: 5 per hour;
   - `POST …/invitations`: 60 per hour;
   - `POST /v1/invitations/redeem` and `POST /v1/invitations/preview`: one shared bucket, 10 per 10 minutes. Preview reveals names for a guessed code, so it must be throttled like redemption;
   - `DELETE /v1/me`: 3 per hour.
   The response is 429 `rate_limited` with `Retry-After`.

Done when: the tests cover 413 and 429, including 429 on preview.

### BE-10: Canonical form validator
Status: todo · Phase 2 · Size L · Depends: CON-02 · Blocks: BE-11, BE-12, BE-14
Read first: `contracts/form-definition.schema.json`, `contracts/forms/*.json`, `contracts/forms/cases/*.json`; `mobile/src/forms/engine.ts` (the reference behaviour); `src/fieldmaps_api/forms.py`.
Do:
1. Rewrite `domain/forms.py` to parse the canonical definition with Pydantic models that mirror the JSON Schema. That schema is generated in `io: "input"` mode (CON-02).
   - Use `extra="ignore"` and the same defaults as the zod schema, so the server accepts every definition the device accepts.
2. Evaluate conditions (`answered`, `equals`, `notEquals`, `includes`, `all`, `any`) and dynamic option sets exactly as `engine.ts` does.
3. Validation rules:
   - answers keyed by question `id`;
   - **drop** answers to hidden questions, and report their ids as `pruned` in the per-operation result, rather than rejecting the observation;
     - This matches contract rule 2.
     - A client/server parity bug then loses one hidden answer, never the whole record.
   - require a question only while it is visible;
   - apply type checks for `one`, `many`, `text` and `number`.
4. Run every shared case file from `contracts/forms/cases/` in pytest, and match every expected result.
5. Keep `shell-v1` accepted through a documented adapter that reads its stored `fields` format.
   - A migration must not rewrite it: published definitions are immutable (DB-09).
   - The two verified hosted records must still read back.

Done when: all shared cases pass in both pytest and Vitest (CON-02), and the old upload tests pass.

### BE-11: Instrument endpoints
Status: todo · Phase 2 · Size M · Depends: BE-10, DB-09 · Blocks: WEB-09
Do:
1. `GET /v1/projects/{p}/forms` and `GET …/forms/{f}/versions` are for any member. They list published and retired versions; drafts are listed for managers only (DB-09's policies).
2. `POST /v1/projects/{p}/forms` and `POST …/forms/{f}/versions` are for managers. The second creates a draft from JSON, validated with BE-10's parser, and the response lists every problem found.
3. `POST …/versions/{v}/publish` calls `fieldmaps_private.publish_form_version(p, v)`, passing the project from the URL.
   - The function itself checks the role, the state and that the version belongs to that project.
   - Once GIS-01 lands, it also generates the typed GIS view; nothing changes in the API.
   - `POST …/versions/{v}/retire` calls `retire_form_version`.
4. Add the rows to QA-01, including: a manager of org B publishing org A's version id gets 404.

Done when: the lifecycle is covered by tests, and publishing Janet's definition from `contracts/forms/` succeeds locally.

### BE-12: The sync upload endpoint for PowerSync
Status: todo · Phase 2 · Size L · Depends: BE-10, DB-10 · Blocks: MOB-10, QA-03
Read first: the `POST /v1/sync/upload` semantics in [contracts.md](../docs/plan/contracts.md#post-v1syncupload-semantics); `repository.py:56-105` (the idempotent upload to reuse); [sync-powersync.md](../docs/plan/sync-powersync.md).
Do:
1. **Accept the body as `{operations: [raw objects]}`**, and validate each operation separately.
   - One malformed operation becomes one rejected result.
   - The request itself never fails with 422, because a request-level error gives the client no per-operation answer.
2. **Each operation runs in its own user transaction, committed synchronously.**
   - The observation write runs inside a SAVEPOINT (`session.begin_nested()`).
   - On a validation failure, `IntegrityError`, `DataError` or an RLS violation:
     1. roll back to the savepoint;
     2. insert the `upload_rejections` row in the outer transaction;
     3. commit.
   - After a database error the transaction is aborted (25P02), so the rejection cannot be written without the savepoint. Never raise to reject.
3. **Idempotency by content, not by body hash.** When the insert affects no row, load the existing row.
   - It is an **accepted replay** when `created_by` is the caller, `project_id` matches, and either:
     - the canonical content matches: `site_id`, `form_version_id`, `observed_at`, the point, `observer_code` and the pruned answers, compared after BE-10 normalization. `device_id` and `app_version` are excluded, because they vary between attempts; or
     - the stored row came from the legacy `PUT` (`device_id IS NULL`). A record that MOB-11 re-sends after a lost response can never match the old body hash, and the server already holds it; the row is not modified.
   - Otherwise it is rejected with `conflict`.
   - Do not compare `upload_hash`. It hashes the raw request body (`repository.py:75`), so an envelope can never match a row written through the legacy `PUT`.
   - An accepted upload or replay sets `resolved_at` on **every** unresolved rejection for (caller, observation id).
4. **Rejected results.** Map each of these to a `rejected` result with its code:
   - validation (BE-10);
   - no membership or wrong role;
   - an unknown site or form version;
   - the same id with different content, or created by another user (`conflict`, step 3);
   - an unsupported operation or table (`unsupported_operation`);
   - any other unexpected, non-transient per-operation exception (`internal`, also sent to Sentry). An operation that always fails would otherwise hold back every later record from that user, because PowerSync uploads in order.
   - **Transient faults are never rejections.** On a BE-02 transient SQLSTATE, stop and answer 503; operations committed earlier in the batch stay committed. The client retries, and the replays are accepted.
   - A rejection names `project_id` and `organization_id` only when the caller is a member of that project. Otherwise both are NULL, so nobody can plant rows in another tenant's view (DB-10).
5. **Retired form versions are accepted** (DB-09 step 7). Only an unknown version is rejected.
6. **Each per-operation result** carries `{id, status, code?, pruned?, user_id}`. The client checks that `user_id` is the account the database belongs to (sync-powersync.md).
7. **Return 401 for an invalid token and 503 for storage failures only.**
8. Keep `PUT /v1/projects/{p}/observations/{uuid}` working until MOB-10 ships.
9. Add rows to QA-01 (cross-org operations are rejected), and add a batch-replay test.

Done when the tests cover:
- a mixed batch: accepted, replayed, rejected by validation, rejected by a constraint violation placed **before** a valid operation (both get results, and the rejection row exists), and unsupported;
- an observation created through the legacy `PUT`, then replayed through `/v1/sync/upload` as an envelope, is accepted, and no rejection is written;
- the same envelope sent twice with a different `app_version` is accepted both times;
- a user from org B naming org A's project gets a rejection with a NULL project, and A's manager sees nothing;
- a deadlock mid-batch returns 503, and the earlier operations stay committed;
- a malformed operation in the batch still gets a 200;
- rejections are readable by their owner and their project's managers only.

### BE-13: Sites, zones and packages in Storage
Status: todo · Phase 2 · Size L · Depends: DB-12 · Blocks: DB-14, GIS-07, MOB-14, OPS-15, WEB-08
Needs user: a Storage S3 access key (Project Settings → Storage), provided as a runtime Secret File. It is never committed.
Read first: `domain/packages.py` (`469-478` bounding-box zones; `31` the empty allow-list); `repository.py` (`prepare_package`, `read_package_archive`); DB-12.
Do:
1. `GET/POST /v1/projects/{p}/sites`, where POST creates a site and requires a manager, and `GET …/sites/{s}/zones`.
2. On a successful prepare:
   - write the archive to `site-packages/{org}/{project}/{site}/{version}.zip` in Storage (a sha256-named key is fine);
   - store `storage_path` and `archive_bytes`, and **stop writing `archive`**:
     - remove it from `INSERT_PACKAGE` (`queries.py`);
     - read `archive_bytes` from its column instead of `octet_length(archive)` in `PACKAGES` and `PACKAGE_DETAIL`;
     - make `PACKAGE_ARCHIVE` read `storage_path`;
   - insert the `zones` polygons from the `zones` layer (real geometry, not bounding boxes);
   - set `sites.boundary` from the ground feature;
   - set `sites.current_package_id` when the state is `ready`.
3. `GET …/packages/{id}/download` returns `{url, sha256, bytes, expires_at}`, a signed URL valid for 10 minutes.
   - `GET …/archive` streams from Storage for the web.
   - A package with `storage_path IS NULL` (from before BE-13) answers 410 `archive_unavailable` on both. DB-14 then retires the column.
4. Make the imagery allow-list configurable through config (`imagery_hosts: []`).
5. Fix the version race: on a unique violation, retry `max+1` once, then return 409.
6. Upload the Training site package (sample geometry from `mobile/src/maps/sample-site.ts`, exported as GeoJSON layers) through the normal pipeline to staging (**Needs user**). Record it in DB-07's notes.

Done when:
- the tests use a Storage stub;
- a package can be prepared, downloaded through a signed URL, and its sha256 matches;
- the zones table holds real polygons.

### BE-14: Analysis: observation list, summary, exports
Status: todo · Phase 3 · Size L · Depends: BE-10, DB-10 · Blocks: WEB-10, WEB-11, WEB-12
Do:
1. `GET /v1/projects/{p}/observations`:
   - cursor on `(observed_at, id)`, with `limit` at most 500;
   - filters: `site`, `zone`, `round`, `form_version`, `observer`, `from`, `to`, `bbox` (a `ST_Intersects` on `geom`, using the GiST index);
   - returns the envelope plus `received_at` and `revision`.
2. `GET …/summary` returns counts by site, zone, round, form version and day, plus the latest `received_at`, computed in SQL. Coverage "by zone and round" is J1 step 6.
3. `GET …/exports?format=csv|geojson&…filters` streams the result:
   - CSV columns come from the form version's `exportColumn`s (the codebook order);
   - GeoJSON is a FeatureCollection;
   - each export is audited (DB-13, once it exists; until then, logged).
4. Everything requires viewer or higher. Add the rows to QA-01.

Done when: the tests cover paging stability, the bbox filter, and CSV column order.

### BE-15: GIS access information
Status: todo · Phase 3 · Size S · Depends: GIS-02 · Blocks: WEB-12
Do: add `GET /v1/projects/{p}/gis-access` for managers.
- It lists that project's reader grants (role name, created, expires, revoked) and the public connection settings (host, port, database, service name, view names), with **no passwords**.
- It reads `fieldmaps.gis_reader_grants` through the manager policy that GIS-01 adds for `fieldmaps_api`.

Done when: the tests pass, and the response never contains a secret.

### BE-16: Name the caller in every role-check query
Status: done (2026-09-26) · Phase 0 · Size S · Depends: none · Blocks: DB-05
What now works:
- **Role checks name the caller.** `PROJECTS`, `UPLOAD_TARGET` and `PACKAGE_TARGET` in `backend/src/fieldmaps_api/queries.py` filter on `m.user_id = fieldmaps.request_user_id()`. The API's role checks stay correct when DB-05 lets managers read other members' rows. Without this, a viewer on a project that has a manager passes the manager check; that was reproduced against real PostGIS.
- **The package list works.** `GET /v1/projects/{p}/packages` failed on every call with 503, because asyncpg cannot infer a type for the bare `:site IS NULL`. It now casts the site filter to text.
- **The SQL suite is green again.** `database/tests/run.sql`'s ledger assertion expected three migrations, and had been failing since `0004`. It now asserts the exact ordered version list.

Verified by:
- the 19 local SQL assertions;
- all 59 API tests, via `make -C database api-build api-test`;
- Ruff and BasedPyright.

