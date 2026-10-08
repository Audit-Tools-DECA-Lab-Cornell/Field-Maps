# Putting FieldMaps in front of Janet (October 8, 2026)

The steps that turn `master` into something Janet signs in to herself: the hosted database, the API on Render, the web app on Vercel, her account and study, and a collector build on her device. Each step names who does it and how to check it. Hosted changes are never part of an automated task (`AGENTS.md`); every step here is run by a person.

Project: **Field Maps GIS**, `lezmqhuucfwqknspgcdy` (us-east-1). Checked read-only on October 8: the ledger holds `0001`–`0005`; `auth.users` has one account; no project membership lacks its Auth user; `pg_cron` is available.

## 1. The database (you, about 10 minutes)

The hosted history records the site-packages migration as `20260926200655`; the repository names the same file `20260923120000`. Their contents are byte-identical (MD5 `ae1d6154…`), so the history is repaired, not the schema.

```sh
pnpm dlx supabase@2.118.0 login
pnpm dlx supabase@2.118.0 link --project-ref lezmqhuucfwqknspgcdy
pnpm dlx supabase@2.118.0 migration repair --status reverted 20260926200655
pnpm dlx supabase@2.118.0 migration repair --status applied 20260923120000
pnpm dlx supabase@2.118.0 migration list      # 8 pending: 20260926210844 … 20261007120000
pnpm dlx supabase@2.118.0 db push
```

`db push` applies, in order: default privileges, identity and tenancy, tenancy functions and guards, Training (it creates `pg_cron`'s nightly purge), the sign-up hook function, and sites, forms and round context. Then, optionally, run `database/hosted/verify.sql` in a `psql` session as `postgres` with `-v ON_ERROR_STOP=1`; every assertion rolls back.

Check: `TABLE fieldmaps_meta.schema_migrations;` lists `0001` to `0013`.

## 2. Accounts (you, 5 minutes)

Sign-up stays off, and no email sender is configured, so a code sent by email would not arrive: Supabase's built-in email reaches only the Supabase organization's own members. Until a sender is set up (OPS-02, needs a domain), create accounts by hand:

- **Dashboard → Authentication → Users → Add user → Create new user**, with the email, a temporary password of at least 8 characters, and **Auto Confirm User** ticked. One for you (the organization's owner) and one for Janet.
- Password reset by email needs the sender too. Until then, set a new password from the same page.

## 3. The API on Render (you, 15 minutes)

New **Web Service** from this repository:

| Setting | Value |
| --- | --- |
| Runtime | Docker |
| Branch | `master` |
| Dockerfile path | `backend/Dockerfile` |
| Docker build context | `backend` |
| Region | Virginia (US East), near the database pooler |
| Instance | Starter or larger, so it does not sleep between requests |
| Health check path | `/ready` |
| Environment variable | `FIELDMAPS_CONFIG=config.render.json` |
| Secret File | `database-password`: the hosted `fieldmaps_api` password, nothing else (`node scripts/api-role-password.mjs` makes a new one) |

The password is in your local volume: `docker run --rm -v fieldmaps_hosted_api_secrets:/s alpine cat /s/database-password`. Account deletion needs a second Secret File, `supabase-secret-key`, and `auth_admin_key_file` in the configuration (BE-08); without it, deleting an account answers "not available yet" and changes nothing.

Check: `curl https://<service>.onrender.com/ready` returns `{"status":"ready"}`, and `curl -o /dev/null -w '%{http_code}' https://<service>.onrender.com/v1/me` returns 401.

If the deploy exits with status 3, the API could not start, and its log has one `startup_failed` line saying why:

- `password authentication failed for user "fieldmaps_api"`: the Secret File is not the role's password, and Supabase's pooler logs say the same. Give the role a new one with `node scripts/api-role-password.mjs`. It prints an `ALTER ROLE` for the Supabase SQL editor and the password for the `database-password` Secret File; paste each, then redeploy. The statement carries only the password's SCRAM verifier, because Postgres logs DDL and would otherwise keep the password in clear. Anything else that signs in as `fieldmaps_api` needs the new password too.
- `Tenant or user not found`: the pooler host in `config.render.json` is not this project's. Copy the session pooler host from **Connect** in the Supabase dashboard.
- `must not be superuser or bypass row security`: the configuration names the wrong role.

## 4. The web app on Vercel (you, 5 minutes)

Production environment variables, then redeploy:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lezmqhuucfwqknspgcdy.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | the project's publishable key (as in `mobile/config/staging.json`) |
| `FIELDMAPS_API_URL` | the Render URL, no trailing slash |
| `NEXT_PUBLIC_FIELDMAPS_API_URL` | the same |

In Supabase, **Authentication → URL Configuration**: Site URL `https://field-maps.vercel.app`. The API already allows that origin (`backend/config.render.json`).

Check: sign in at `https://field-maps.vercel.app/sign-in` with your account; `/account` shows your profile and memberships. The workspace pages under `/o/…` are still the sample workspace; Janet's live workspace on the web is the next piece of work.

## 5. Janet's study (you, 2 minutes)

From the repository, signed in as your own account:

```sh
FIELDMAPS_API_URL=https://<service>.onrender.com \
SUPABASE_URL=https://lezmqhuucfwqknspgcdy.supabase.co \
SUPABASE_PUBLISHABLE_KEY=<publishable key> \
MANAGER_EMAIL=<your email> \
node scripts/bootstrap-study.mjs --invite <janet's email>:manager --join-code observer:25
```

It creates the DECA Lab organization and the Play Study project, publishes Janet's behaviour-mapping and zone-inventory forms, creates the Fall Creek site with its map package (outline, surfaces, equipment, tree canopies, one zone covering the playground), and prints Janet's invitation code and an observer join code once. Run it again and it changes nothing that exists. `--help` lists the options, including `--package <folder>` for another site's QGIS export (`ground`, `zones`, and optionally `trees` and `paths` as GeoJSON). Zones come only from the export: no zone is drawn that the site's own drawings do not have.

## 6. The collector on Janet's device (you)

Set `apiUrl` in `mobile/config/staging.json` to the Render URL, then build the `preview` profile (staging configuration, bundle `com.fieldmaps.collector.dev`):

- **Android**: `eas build --profile preview --platform android` gives an APK link to install directly.
- **iPhone or iPad**: an internal build needs an Apple Developer membership and Janet's device registered first: `eas device:create` sends her a link, then `eas build --profile preview --platform ios`. TestFlight is the alternative (`eas build --profile production` and `eas submit`) and needs an App Store Connect record.

This version adds native modules (`expo-location`, and from earlier work `react-native-svg` and `expo-haptics`): any existing development build must be rebuilt.

## 7. Acceptance (with Janet)

1. Janet signs in on the device, completes her profile, and enters her invitation code: Play Study appears beside Training.
2. Play Study → Fall Creek → **Download**: the four parts verify, then **Set up this session**.
3. Choose **Standard**, place a point with the cross (the × is the coordinate; the pin floats above it), answer, review and save. With a connection, the record shows **Uploaded**.
4. Choose **Inventory**, pick the zone, answer the weather, shade and loose-parts questions, save.
5. Turn on **Show my location** from the map's location button: the device asks once; the blue dot and its accuracy circle appear; the button centres the map on her, or brings her position under the cross while placing.
6. Back on your computer, `GET /v1/projects/<id>/observations` (or the bootstrap's project in QGIS) lists both records with zone, round type and placement.

Nothing in this runbook has been run against the hosted project yet. The same sequence (bootstrap twice, then the collector's own download, form and upload code) passed against local Supabase on October 8, 2026.
