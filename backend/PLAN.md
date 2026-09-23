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

**Per-request identity.** Every request runs in `user_transaction`, which sets `fieldmaps.user_id` (`repository.py:38-48`). The role checks in SQL join memberships and rely on RLS to restrict them to the caller.

**Operations gaps**
- No logging, request IDs, Sentry, readiness endpoint, rate limits or body-size limit.
- Every `SQLAlchemyError` is turned into a 503.
- The Dockerfile runs as root, installs dev dependencies and copies `tests/` into the image.

**Forms.** `forms.py` validates the **server** format (`code`, `type`, no conditions). The mobile format is different; CON-02 and BE-10 fix that.

**Tests.** 24 API tests run against real PostGIS (`backend/tests/`). Every change keeps them green.

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
Status: todo · Phase 0 · Size M · Depends: OPS-07 (for the DSN, optional) · Blocks: OPS-04
Do:
1. Add `GET /ready`. It runs `SELECT 1` through the pool and fetches the JWKS (cached), and returns 503 with the error envelope if either fails.
2. At startup, query `SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = current_user` and refuse to start if either is true (architecture rule 4). Add a test.
3. Add JSON structured logging and an `X-Request-Id` middleware that accepts or generates the id and echoes it. Never log bodies, tokens or `answers`.
4. Initialize Sentry only when `SENTRY_DSN` is set, with scrubbing that matches OPS-07.
5. Map only `OperationalError`, `InterfaceError` and `DBAPIError` connection failures to 503 `storage_unavailable`. Everything else becomes 500 `internal` and is sent to Sentry.

Done when: the new tests cover `/ready` failing, the bypass refusal, and a request id on responses.

Verify: `pnpm backend:test`; `pnpm backend:check`.

### BE-03: Restructure into routers, services and repositories, with the error envelope
Status: todo · Phase 0 · Size M · Depends: none · Blocks: BE-06, BE-07, CON-04
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
Status: todo · Phase 1 · Size M · Depends: BE-03, DB-05, DB-06, DB-07 · Blocks: MOB-04, MOB-06, WEB-05, WEB-06, QA-01
Read first: the identity rows in [contracts.md](../docs/plan/contracts.md#api-endpoint-catalog-v1); DB-06 (`ensure_profile`).
Do:
1. `GET /v1/me` calls `fieldmaps_private.ensure_profile(null)` and returns:
   - the profile;
   - org memberships `[{org id, slug, name, role}]`;
   - project memberships `[{project id, code, name, org id, role, is_training}]`.
   - It is idempotent.
2. `PATCH /v1/me` accepts a display name (1–100 characters), initials (the observer-code pattern) and a locale.
3. Add the rows to QA-01's isolation suite.

Done when:
- a first call creates the profile and the Training membership;
- a second call changes nothing;
- the tests pass.

### BE-07: Tenancy: organizations, projects, members, invitations
Status: todo · Phase 1 · Size L · Depends: BE-06, DB-06 · Blocks: WEB-06, WEB-07, MOB-06, QA-01
Read first: the tenancy rows in the contracts catalog; DB-05 and DB-06.
Do:
1. Organizations:
   - `POST /v1/orgs` (via `create_organization`; returns 409 `conflict` on a slug clash, 403 `limit_reached` over the limit)
   - `GET /v1/orgs`, `GET/PATCH /v1/orgs/{org}`
2. Org members: `GET/PATCH/DELETE /v1/orgs/{org}/members/{user}`. Never remove or demote the last owner.
3. Projects:
   - `POST/GET /v1/orgs/{org}/projects`, `GET/PATCH /v1/projects/{p}`
   - Fold the existing `GET /v1/projects` into this module; its response only gains fields.
4. Project members: `GET/PATCH/DELETE /v1/projects/{p}/members/{user}`. Never remove the last manager.
5. Invitations:
   - `POST /v1/projects/{p}/invitations` takes `{role, email?, max_uses, expires_in_days}`.
   - The server generates a token of 32 random bytes, base64url, and/or an 8-character join code (Crockford base32, no ambiguous characters). It stores only their sha256 hashes and returns the plaintext **once**.
   - `GET` lists invitations without secrets; `DELETE` revokes one.
6. `POST /v1/invitations/redeem` takes `{token}` or `{code}`. It normalises the code (uppercase, dashes stripped), hashes it, and calls `redeem_invitation`.
7. Email delivery of invitations is out of scope: the web shows a copyable link. Emailing links is post-pilot.
8. Add the rows to QA-01.

Done when: every endpoint passes its tests, including the cross-org negatives in QA-01.

### BE-08: Account deletion: `DELETE /v1/me`
Status: todo · Phase 1 · Size M · Depends: BE-06, DB-06 · Blocks: MOB-07, WEB-06, OPS-11
Needs user: create the Supabase secret key (`sb_secret_…`) and put it in a runtime Secret File (`supabase-secret-key`) for staging and production. It is never committed.
Do:
1. Add a config field `auth_admin_key_file` (optional). When it is missing, the endpoint returns 503 `storage_unavailable` with an explanatory message.
2. The flow:
   1. Call `fieldmaps_private.forget_user()` inside the user transaction (`sole_owner` gives 409).
   2. After the commit, call the Supabase Admin API `DELETE /auth/v1/admin/users/{id}` with the secret key, with a timeout and a retry.
   3. If step 2 fails, return 202 and record the pending deletion so an operator can finish it. `deletion_requests` is post-pilot; until then, log it at ERROR level and send it to Sentry.
3. The secret key is used by this service function only. Test that it never appears in logs.

Done when:
- the tests (with the admin API mocked) cover success, sole owner, and admin API failure;
- a deleted user's token is refused afterwards, once the token expires or the session is revoked.

### BE-09: Rate limits and body-size limits
Status: todo · Phase 1 · Size S · Depends: BE-03 · Blocks: none
Do:
1. Add a body-size middleware:
   - 24 MB for `POST …/packages`, which carries JSON plus a base64 project file (limits in `packages.py:33-36`);
   - 1 MB for `POST /v1/sync/upload`;
   - 256 KB for everything else.
   - It rejects oversize bodies **before** parsing, with 413 `validation_failed`.
2. Add per-user token-bucket limits, kept in memory (a single instance for the pilot; document that), on:
   - `POST /v1/orgs`: 5 per hour;
   - `POST …/invitations`: 60 per hour;
   - `POST /v1/invitations/redeem`: 10 per 10 minutes;
   - `DELETE /v1/me`: 3 per hour.
   The response is 429 `rate_limited` with `Retry-After`.

Done when: the tests cover 413 and 429.

### BE-10: Canonical form validator
Status: todo · Phase 2 · Size L · Depends: CON-02 · Blocks: BE-11, BE-12
Read first: `contracts/form-definition.schema.json`, `contracts/forms/*.json`, `contracts/forms/cases/*.json`; `mobile/src/forms/engine.ts` (the reference behaviour); `src/fieldmaps_api/forms.py`.
Do:
1. Rewrite `domain/forms.py` to parse the canonical definition with Pydantic models that mirror the JSON Schema.
2. Evaluate conditions (`answered`, `equals`, `notEquals`, `includes`, `all`, `any`) and dynamic option sets exactly as `engine.ts` does.
3. Validation rules:
   - answers keyed by question `id`;
   - reject answers to hidden questions (the client prunes them, so their presence is a validation failure);
   - require a question only while it is visible;
   - apply type checks for `one`, `many`, `text` and `number`.
4. Run every shared case file from `contracts/forms/cases/` in pytest, and match every expected result.
5. Keep `shell-v1` accepted, either by converting its stored definition in a migration or with a documented adapter. The two existing hosted records must still read back.

Done when: all shared cases pass in both pytest and Vitest (CON-02), and the old upload tests pass.

### BE-11: Instrument endpoints
Status: todo · Phase 2 · Size M · Depends: BE-10, DB-09 · Blocks: WEB-09, GIS-01
Do:
1. `GET/POST /v1/projects/{p}/forms` and `GET …/forms/{f}/versions`.
2. `POST …/forms/{f}/versions` creates a draft from JSON, validated against the schema with BE-10's parser. The response lists every problem found.
3. `POST …/versions/{v}/publish` calls `fieldmaps_private.publish_form_version`. Once GIS-01 lands, that function also generates the typed GIS view; nothing changes in the API. `POST …/versions/{v}/retire` retires a version.
4. Everything above requires the manager role.
5. Add the rows to QA-01.

Done when: the lifecycle is covered by tests, and publishing Janet's definition from `contracts/forms/` succeeds locally.

### BE-12: The sync upload endpoint for PowerSync
Status: todo · Phase 2 · Size L · Depends: BE-10, DB-10 · Blocks: MOB-10, QA-03
Read first: the `POST /v1/sync/upload` semantics in [contracts.md](../docs/plan/contracts.md#post-v1syncupload-semantics); `repository.py:56-105` (the idempotent upload to reuse); [sync-powersync.md](../docs/plan/sync-powersync.md).
Do:
1. Each operation runs in its own user transaction, **committed synchronously**, so one bad operation cannot roll back the good ones.
2. Reuse the fingerprint idempotency: an identical replay is accepted.
3. Map each failure to 200 with a rejected per-operation result, and insert an `upload_rejections` row in the same transaction. The failures are:
   - validation (BE-10);
   - no membership or wrong role;
   - an unknown site or form version;
   - a conflicting fingerprint (`conflict`);
   - an unsupported operation or table.
4. Return 401 for an invalid token and 503 for storage failures only.
5. Keep `PUT /v1/projects/{p}/observations/{uuid}` working until MOB-10 ships.
6. Add rows to QA-01 (cross-org operations are rejected), and add a batch-replay test.

Done when:
- the tests cover a mixed batch (accepted, replayed, rejected, unsupported);
- rejections are readable by their owner only.

### BE-13: Sites, zones and packages in Storage
Status: todo · Phase 2 · Size L · Depends: DB-12 · Blocks: MOB-14, WEB-08
Needs user: a Storage S3 access key (Project Settings → Storage), provided as a runtime Secret File. It is never committed.
Read first: `domain/packages.py` (`469-478` bounding-box zones; `31` the empty allow-list); `repository.py` (`prepare_package`, `read_package_archive`); DB-12.
Do:
1. `GET/POST /v1/projects/{p}/sites`, where POST creates a site and requires a manager, and `GET …/sites/{s}/zones`.
2. On a successful prepare:
   - write the archive to `site-packages/{org}/{project}/{site}/{version}.zip` in Storage (a sha256-named key is fine);
   - store `storage_path` and `archive_bytes`;
   - insert the `zones` polygons from the `zones` layer (real geometry, not bounding boxes);
   - set `sites.boundary` from the ground feature;
   - set `sites.current_package_id` when the state is `ready`.
3. `GET …/packages/{id}/download` returns `{url, sha256, bytes, expires_at}`, a signed URL valid for 10 minutes. `GET …/archive` streams from Storage for the web.
4. Make the imagery allow-list configurable through config (`imagery_hosts: []`).
5. Fix the version race: on a unique violation, retry `max+1` once, then return 409.
6. Upload the Training site package (sample geometry from `mobile/src/maps/sample-site.ts`, exported as GeoJSON layers) through the normal pipeline to staging (**Needs user**). Record it in DB-07's notes.

Done when:
- the tests use a Storage stub;
- a package can be prepared, downloaded through a signed URL, and its sha256 matches;
- the zones table holds real polygons.

### BE-14: Analysis: observation list, summary, exports
Status: todo · Phase 3 · Size L · Depends: DB-10, BE-10 · Blocks: WEB-10, WEB-11, WEB-12
Do:
1. `GET /v1/projects/{p}/observations`:
   - cursor on `(observed_at, id)`, with `limit` at most 500;
   - filters: `site`, `zone`, `form_version`, `observer`, `from`, `to`, `bbox` (a `ST_Intersects` on `geom`, using the GiST index);
   - returns the envelope plus `received_at` and `revision`.
2. `GET …/summary` returns counts by site, zone, form version and day, plus the latest `received_at`, computed in SQL.
3. `GET …/exports?format=csv|geojson&…filters` streams the result:
   - CSV columns come from the form version's `exportColumn`s (the codebook order);
   - GeoJSON is a FeatureCollection;
   - each export is audited (DB-13, once it exists; until then, logged).
4. Everything requires viewer or higher. Add the rows to QA-01.

Done when: the tests cover paging stability, the bbox filter, and CSV column order.

### BE-15: GIS access information
Status: todo · Phase 3 · Size S · Depends: GIS-02 · Blocks: WEB-12
Do: add `GET /v1/projects/{p}/gis-access` for managers. It lists that project's reader grants (role name, created, expires, revoked) and the public connection settings (host, port, database, service name, view names), with **no passwords**.

Done when: the tests pass, and the response never contains a secret.
