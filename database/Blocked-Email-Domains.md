# Signup email policy

DB-08 uses a PostgreSQL [Before User Created hook](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook). Supabase Auth calls it before inserting a new user. A blocked domain returns HTTP 400 with `Use a permanent email address.`; other domains continue through normal Auth validation.

The hook runs as its caller (`SECURITY INVOKER`). Only `supabase_auth_admin` receives schema usage, function execution and read access to the RLS-protected domain table. It does not receive access to `fieldmaps_private` and does not require an application user identity.

## Blocklist source

The migration contains a frozen snapshot of the community-maintained [disposable-email-domains list](https://github.com/disposable-email-domains/disposable-email-domains/blob/51fafcd878e7e67b82f8184c21134fa079f8609f/disposable_email_blocklist.conf), used under its [CC0 dedication](https://github.com/disposable-email-domains/disposable-email-domains/blob/51fafcd878e7e67b82f8184c21134fa079f8609f/LICENSE.txt).

| Snapshot | Value |
| --- | --- |
| Upstream commit | `51fafcd878e7e67b82f8184c21134fa079f8609f` |
| Upstream commit date | 2026-09-29 |
| Imported | 2026-09-30 |
| Domains | 9,189 |
| Source file SHA-256 | `d99c636df4e72f94ee903d5a190efd7d68c6e04234af4c01cb66c3106d873e72` |

Matching is case-insensitive and includes subdomains. For example, `mailinator.com` and `inbox.mailinator.com` are blocked; `decamark-notmailinator.com` is not matched merely because its spelling ends similarly. The list is a signup policy, not proof that an address is trustworthy or that every disposable provider is covered.

## Maintenance

Review the upstream snapshot before a release and when a legitimate domain is reported as blocked. Apply changes in a new forward migration, including both additions and removals. Do not edit an applied migration or fetch a moving upstream list during signup or deployment. Record the new source commit and checksum here and rerun SQL and local Auth signup checks.

The local hook is configured in `supabase/config.toml`. Existing local Auth containers need a normal Supabase stop/start to load changed hook settings; preserve volumes. Hosted hook activation is separate work in OPS-13/14. The SQL migration alone does not enable the hook in a hosted project's Auth settings.
