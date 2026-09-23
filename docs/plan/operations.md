# Operations: hosted settings, CI, deploys, monitoring, releases

This file is part of the [FieldMaps production plan](README.md) and defines the `OPS-*` tasks.

Most tasks here change hosted services, and **every one of those needs the user's explicit authorization**. The steps below say `Needs user:` for those. An agent may prepare files, checklists and scripts, but must not apply dashboard changes, deploy, or buy anything on its own.

Environments are described in [architecture.md](architecture.md#environments). Running costs are in [decisions.md](decisions.md#running-cost).

## Context

- **API.** It runs only on the developer's machine against hosted Supabase (`docs/Supabase-Setup.md:15`). The Render config exists (`backend/config.render.json`) but nothing is deployed.
- **Auth settings.** Public sign-up is ON (the user changed it on 2026-09-22, and `docs/Supabase-Setup.md:10,81` still says otherwise).
  - There is no custom SMTP. The built-in provider sends only to project team members, at most 2 per hour, so confirmation emails will not reach real users.
  - On a new Free project, email templates cannot be edited without custom SMTP. That blocks the `{{ .Token }}` codes.
- **CI and monitoring.** There is no CI, no Sentry, and no backup drill.
- **Mobile builds.** Bundle IDs end in `.dev` (`mobile/app.json:13,20`). EAS Update is installed, but `runtimeVersion` and `updates.url` are not set.

## Tasks

### OPS-01: Staging Auth settings for public sign-up
Status: todo · Phase 0 · Size S · Depends: none · Blocks: MOB-05, WEB-04
Needs user: apply the settings in the Supabase dashboard for project `lezmqhuucfwqknspgcdy`.
Read first: `docs/Supabase-Setup.md`; <https://supabase.com/docs/guides/deployment/going-into-prod>.
Do:
1. Prepare this checklist for the user:
   - "Confirm email" ON;
   - email OTP length 6, expiry 3600 s;
   - minimum password length 8;
   - Site URL is the staging web origin;
   - Redirect URLs: the web origins plus `fieldmaps://auth/callback`;
   - anonymous sign-ins OFF.
2. After the user applies it, update `docs/Supabase-Setup.md`: sign-up is ON, the settings above, and the date.

Done when:
- the doc states the real settings, dated;
- no stale "sign-up is off" remains (`grep -n "sign-up" docs/Supabase-Setup.md`).

Verify: check the dashboard values. A sign-up on staging returns "confirmation required".

### OPS-02: Custom SMTP via Resend
Status: todo · Phase 0 · Size S · Depends: Q6 in [decisions.md](decisions.md#open-questions) (the sending domain) · Blocks: OPS-03, MOB-05, WEB-04
Needs user: a Resend account, the DNS records for the sending domain, and SMTP settings in Supabase.
Do:
1. Write the setup steps into `docs/Supabase-Setup.md` under "Email delivery":
   - Resend domain verification (SPF, DKIM);
   - Supabase Auth → SMTP (host `smtp.resend.com`, port 465, the user, and an API key entered only in the dashboard);
   - raise the Auth email rate limit to 30 per hour or more.
2. The user applies them.

Done when: a sign-up email reaches an address that is not a team member.

Verify: a test sign-up to a personal inbox receives the email within 1 minute.

### OPS-03: Email templates with 6-digit codes
Status: todo · Phase 0 · Size S · Depends: OPS-02 · Blocks: MOB-05, WEB-04
Needs user: paste the templates into the Supabase dashboard (staging, and later production).
Read first: <https://supabase.com/docs/guides/auth/auth-email-templates>.
Do:
1. Create `supabase/templates/confirm-signup.html`, `recovery.html` and `email-change.html`.
   - Each shows `{{ .Token }}` prominently: "Your FieldMaps code is 123456".
   - Each includes a secondary `{{ .TokenHash }}` link for web users.
   - Use Nocturne-neutral HTML with inline styles and no tracking pixels.
2. Reference them from `supabase/config.toml` (`[auth.email.template.*]`), so the local stack (DB-02) uses the same files.

Done when: local Mailpit and staging both show the 6-digit code.

Verify: `supabase start`; sign up locally; the Mailpit message shows the code.

### OPS-04: Render staging service for the API
Status: todo · Phase 0 · Size M · Depends: BE-01, BE-02 · Blocks: SYNC-01, MOB-01 (staging URL), WEB-05
Needs user: a Render account and service, the Secret File `database-password`, and later `supabase-secret-key` (BE-08).
Read first: `backend/README.md` ("Deploy it"); `backend/config.render.json`; `backend/Dockerfile`.
Do:
1. Add `render.yaml` (a Blueprint) at the repo root:
   - web service built from `backend/Dockerfile`;
   - `FIELDMAPS_CONFIG=config.render.json`;
   - health check path `/ready`;
   - region Virginia (near `aws-0-us-east-1`);
   - plan Starter.
2. Remove the localhost origins from `config.render.json`, and add the staging Vercel origin and preview pattern.
3. Document the URL in `docs/Supabase-Setup.md` and `backend/README.md`.

Done when: the staging API answers `/ready` 200 over HTTPS, and rejects a request with no token with 401 and the error envelope.

Verify: `curl -s https://<staging-api>/ready` and `curl -s -o /dev/null -w '%{http_code}' https://<staging-api>/v1/projects` (expect 401).

### OPS-05: Vercel environment for web auth
Status: todo · Phase 1 · Size S · Depends: WEB-03 · Blocks: WEB-04
Needs user: the Vercel project settings (Root Directory `web`) and the environment variables.
Do:
1. Document these in `web/README.md`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `FIELDMAPS_API_URL` (server-only; replaces `NEXT_PUBLIC_FIELDMAPS_API_URL` once WEB-05 lands)
   - `SENTRY_DSN`
2. The user sets them for Preview (staging) and Production.

Done when: a preview deployment can sign in against staging.

Verify: sign in on a preview URL.

### OPS-06: GitHub Actions CI
Status: todo · Phase 0 · Size M · Depends: DB-02 (for the backend and database jobs) · Blocks: DB-03
Read first: the root `package.json` scripts; `Makefile`; `docs/Workspace.md` ("Development and checks").
Do:
1. Create `.github/workflows/ci.yml` with these jobs:
   - `web`: install, check, build;
   - `mobile`: install, typecheck, lint, test;
   - `backend`: uv sync, ruff, basedpyright, then pytest against `supabase start` using the Supabase CLI setup action;
   - `database`: SQL assertions against the same stack;
   - `contracts`: `pnpm contracts:generate`, then `git diff --exit-code` (after CON-03);
   - `plan`: `node docs/plan/check-plan.mjs`.
2. Use Node 24 and pnpm 10.17.1. Cache pnpm and uv.
3. CI never touches hosted services.

Done when: CI is green on a pull request.

Verify: the Actions run on the next pull request.

### OPS-07: Sentry projects
Status: todo · Phase 0 · Size S · Depends: none · Blocks: BE-02, MOB-20, WEB-15
Needs user: a Sentry account and three projects (api, web, mobile). The DSNs are set as runtime environment variables only.
Do:
1. Document the DSN variable names per app.
2. Set the scrubbing rules: no request bodies, no `answers`, no emails in breadcrumbs.

Done when: each app sends a test event (verified later in QA-06).

### OPS-08: PowerSync staging instance
Status: todo · Phase 2 · Size S · Depends: SYNC-01, DB-11 · Blocks: SYNC-02, MOB-09
Needs user: a PowerSync Cloud account, a US-region instance, and the `powersync_role` password.
Read first: [sync-powersync.md](sync-powersync.md#source-database).
Do:
1. Connect the instance to the staging **direct** connection (`db.<ref>.supabase.co:5432`, IPv6), as `powersync_role`.
2. Client Auth: "Use Supabase Auth", with the JWT secret blank.
3. Set `max_slot_wal_keep_size` on staging. Document how to monitor `pg_replication_slots`.
4. Record the instance URL (public) in `mobile/config/staging.json` (MOB-01).

Done when: the instance shows "replicating" and SYNC-02 can deploy.

### OPS-09: Production environment
Status: todo · Phase 4 (week 10) · Size L · Depends: Q5 budget approval, OPS-01…OPS-08, DB-* for Phases 0–2 · Blocks: OPS-11, QA-05
Needs user: every step. The new Supabase project is on Pro, and PowerSync on Pro.
Do:
1. Write `docs/Production-Runbook.md` covering these, in order:
   - create the project in us-east-1;
   - apply `supabase/migrations` in order;
   - set the role passwords;
   - Auth settings (OPS-01), SMTP (OPS-02), templates (OPS-03), leaked-password protection (OPS-13), the Before-User-Created hook (DB-08);
   - the Render production service;
   - the PowerSync production instance;
   - Vercel production environment variables;
   - EAS `production` config.
2. The user executes it. Record each step as done, with the date.

Done when: the production health checks are green and QA-01/QA-02 pass against production with synthetic accounts, which are then deleted.

### OPS-10: Backups and restore drill
Status: todo · Phase 4 · Size M · Depends: OPS-09 · Blocks: QA-06
Needs user: restore into a scratch project.
Do:
1. Confirm that daily backups are active on Pro.
2. Write `docs/Restore-Runbook.md`.
   - Storage objects are not in database backups. Package archives can be recreated from the manager's QGIS source, so document re-upload as their recovery path until photos exist.
3. Run one restore drill and record the times: target recovery point 24 h (daily backup), target recovery time 4 h.

Done when: the drill is recorded with its measured times.

### OPS-11: Store listings and submission
Status: todo · Phase 4 · Size L · Depends: MOB-20, WEB-14, Q1 (app name and bundle ID) · Blocks: QA-05
Needs user: the Apple Developer and Google Play accounts, the listings, and review submission.
Do:
1. Prepare `docs/Store-Submission.md`:
   - Privacy nutrition labels: email, user ID, precise location of observations, user content, all linked to the user.
   - Play Data safety.
   - The account deletion paths: in the app (MOB-07) and the web link `/privacy/delete-data` (WEB-14).
   - The test account for reviewers, including a join code.
   - Screenshots.
2. Submit a TestFlight internal build and a Play internal-testing build.

Done when: both internal tracks install on the pilot devices.

### OPS-12: Monitoring and alerts
Status: todo · Phase 4 · Size S · Depends: OPS-09 · Blocks: none
Do:
1. Render health alerts.
2. An uptime monitor on `/ready`.
3. A weekly Supabase advisors run, with results noted.
4. PowerSync: replication lag and upload errors in its dashboard, and an alert when `pg_replication_slots` retained WAL exceeds 512 MB.
5. Sentry alert rules for new issues.

Done when: `docs/Production-Runbook.md` lists each alert and who receives it.

### OPS-13: Auth hardening switches
Status: todo · Phase 1 (staging) / Phase 4 (production) · Size S · Depends: DB-08 · Blocks: none
Needs user: dashboard changes.
Do:
1. Enable the Before User Created hook, pointing at `fieldmaps_private.before_user_created` (DB-08).
2. Enable leaked-password protection on Pro.
3. Record that CAPTCHA is deferred (decision D9), and why.

Done when: `docs/Supabase-Setup.md` states each switch and its date.
