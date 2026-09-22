# FieldOps observation API

FastAPI, SQLAlchemy, and PostgreSQL/PostGIS implement the first authenticated, append-only upload slice. The mobile app saves to SQLite first; its foreground queue uploads when connected. QGIS can consume the same committed database records through a scoped GIS view. QGIS itself is not the synchronization server.

## Run locally

For the configured hosted database, follow [Supabase setup](../docs/Supabase-Setup.md). The commands below use the separate local PostGIS database.

With Docker Desktop running, from the repository root:

```sh
make -C database up migrate seed
make -C database api-build api-test api-up
```

The API listens at `http://127.0.0.1:8000`; `/docs` exposes its OpenAPI contract. `/health` is a process liveness check, not a database/auth readiness check. Stop with `make -C database stop`.

The public `config.local.json` now identifies the FieldOps Supabase development project; see [current setup status](../docs/Supabase-Setup.md). Leaving both identity settings null disables authenticated access. Missing credentials return 401; a token presented without a configured verifier returns 503. No test-user shortcut or permissive auth mode exists on the running API. Tests use ephemeral RSA keys and synthetic identities in the separate `fieldops_api_test` database.

## Configure a development identity provider

Create/select a Supabase development project, use its asymmetric JWT signing key (ES256 or RS256), and create a test email/password account through its Auth dashboard. Configure the project's public values in `backend/config.local.json`:

```json
{
	"database_url": "postgresql+asyncpg://fieldops_api@/fieldops?host=/var/run/postgresql",
	"issuer": "https://YOUR_PROJECT.supabase.co/auth/v1",
	"jwks_url": "https://YOUR_PROJECT.supabase.co/auth/v1/.well-known/jwks.json",
	"audience": "authenticated"
}
```

These issuer/JWKS values are public. No Supabase service-role key is needed by this API. It validates the JWT signature, expiry, audience, and issuer and derives the user UUID from the signed subject. Legacy HS256 projects must switch to a supported asymmetric signing key before using this verifier. See [Supabase JWT documentation](https://supabase.com/docs/guides/auth/jwts).

An administrator must add the Auth user's UUID to `fieldops.project_memberships`; signing in alone grants no project access. From an authorized local administrator SQL session, replace `AUTH_USER_UUID` in this statement:

```sql
INSERT INTO fieldops.project_memberships (user_id, organization_id, project_id, role)
SELECT 'AUTH_USER_UUID'::uuid, organization_id, id, 'observer'
FROM fieldops.projects
WHERE id = '10000000-0000-4000-8000-000000000002'
ON CONFLICT (user_id, project_id) DO NOTHING;
```

Rebuild/restart the API after public config changes. Configure the same provider and project in [mobile connection settings](../mobile/README.md#enable-the-connected-development-slice), then rebuild the native development client for SecureStore and NetInfo. The Supabase account's database is not used by this local slice: Supabase supplies identity; observations remain in local PostGIS.

## Contract and guarantees

| Endpoint                                         | Behavior                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| `GET /v1/projects`                               | Projects visible to the verified account                          |
| `PUT /v1/projects/{project}/observations/{uuid}` | Validate and commit a new point or acknowledge an identical retry |
| `GET /v1/projects/{project}/observations/{uuid}` | Read a permitted observation                                      |

The PUT body contains `site_id`, `form_version`, `[longitude, latitude]` coordinates, `observer`, integer `people` (0–999), `notes`, and timezone-aware `observed_at`. This version accepts only the sample site and practice form; it does not implement Janet's full variable library.

A 200 receipt includes observation/project/user UUIDs, original `received_at`, and `accepted_revision: 1`. A receipt is returned only after commit. Identical retries return the original receipt; conflicting content returns 409 and preserves the original. The authenticated user and normalized payload fingerprint are immutable. A lost response can therefore be retried without duplicate records.

Project membership is enforced in both the API lookup and database row policies. The API uses a restricted non-owner role with transaction-local identity, preventing pooled connections from retaining another account's context. It can select permitted rows and insert observations; it cannot edit/delete observations or grant membership. The SQLite queue keeps records until matching receipt verification and never uploads unassigned practice records.

## Verification and limits

`make -C database api-test` passes 24 tests against real PostGIS, including token rejection, membership checks, connection-pool isolation, conflicting/concurrent retries, input boundaries, and restricted GIS readback. Python Ruff and BasedPyright also pass. The separate SQL suite passes 19 assertions. Native sign-in, mobile-to-running-API reconnect, and QGIS Desktop refresh still need a configured account/device acceptance run.

This is a local development service. The shared Unix socket uses local trust and must not be deployed as production database authentication. The hosted development database now has adapted migrations, restricted runtime credentials, and verified TLS. Production rollout still needs approved region/retention choices, a public HTTPS API deployment, managed secret injection, network restrictions, backups, monitoring, and API resource limits. The API has no general form engine, attachments, update/delete synchronization, download cursor, or closed-app mobile background synchronization yet.

Use QGIS read-only access for this slice; arbitrary GIS edits do not yet synchronize back to devices. The local database has no TCP listener, so a QGIS Desktop connection is not provisioned by these commands. The GIS test validates the database view, not the desktop application's behavior.

References: [FastAPI typed responses](https://fastapi.tiangolo.com/tutorial/response-model/), [Supabase mobile auth](https://supabase.com/docs/guides/auth/quickstarts/react-native), [PostGIS](https://postgis.net/).
