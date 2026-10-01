\set ON_ERROR_STOP on
BEGIN;
\ir assertions.sql
GRANT EXECUTE ON FUNCTION pg_temp.assert_true(boolean, text),
  pg_temp.assert_rejected(text, text, text)
  TO supabase_auth_admin, fieldmaps_api, anon, authenticated, service_role;

-- Auth invokes the hook before a user identity exists.
SELECT set_config('fieldmaps.user_id', '', true);
SET LOCAL ROLE supabase_auth_admin;
SELECT pg_temp.assert_true(
  fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@mailinator.com"}}')
    = '{"error":{"http_code":400,"message":"Use a permanent email address."}}'::jsonb,
  'Auth rejects disposable signup without a request identity'
);
SELECT pg_temp.assert_true(
  fieldmaps_auth_hooks.before_user_created('{"user":{"email":"Person@MAILINATOR.COM"}}') ? 'error',
  'Auth normalizes disposable email domain case'
);
SELECT pg_temp.assert_true(
  fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@nested.mailinator.com"}}') ? 'error',
  'Auth rejects subdomains of disposable domains'
);
SELECT pg_temp.assert_true(
  fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@fieldmaps-notmailinator.com"}}') = '{}'::jsonb
  AND fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@mailinator.com.example.org"}}') = '{}'::jsonb,
  'Auth domain matching respects DNS label boundaries'
);
SELECT pg_temp.assert_true(
  fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@cornell.edu"}}') = '{}'::jsonb
  AND fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@gmail.com"}}') = '{}'::jsonb,
  'Auth permits permanent email providers'
);
SELECT pg_temp.assert_true(
  EXISTS (SELECT FROM fieldmaps_auth_hooks.blocked_email_domains WHERE domain = 'mailinator.com')
  AND (SELECT count(*) > 9000 FROM fieldmaps_auth_hooks.blocked_email_domains),
  'Auth role can read the maintained blocklist through RLS'
);
SELECT pg_temp.assert_rejected(
  $$INSERT INTO fieldmaps_auth_hooks.blocked_email_domains VALUES ('example.org')$$,
  '42501', 'Auth role cannot add blocked domains'
);
SELECT pg_temp.assert_rejected(
  $$UPDATE fieldmaps_auth_hooks.blocked_email_domains SET domain = 'example.org' WHERE domain = 'mailinator.com'$$,
  '42501', 'Auth role cannot change blocked domains'
);
SELECT pg_temp.assert_rejected(
  $$DELETE FROM fieldmaps_auth_hooks.blocked_email_domains WHERE domain = 'mailinator.com'$$,
  '42501', 'Auth role cannot delete blocked domains'
);
SELECT pg_temp.assert_true(
  NOT has_schema_privilege(current_user, 'fieldmaps_private', 'USAGE'),
  'Auth hook role gains no access to private tenancy functions'
);
RESET ROLE;
SELECT pg_temp.assert_true(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'fieldmaps_auth_hooks.blocked_email_domains'::regclass)
  AND (SELECT NOT prosecdef AND proconfig = ARRAY['search_path=""']
    FROM pg_proc WHERE oid = 'fieldmaps_auth_hooks.before_user_created(jsonb)'::regprocedure),
  'Auth hook uses invoker security, an empty search path and an RLS blocklist'
);
SELECT pg_temp.assert_true(NOT EXISTS (
  SELECT FROM (VALUES ('anon'), ('authenticated'), ('service_role'), ('fieldmaps_api'), ('fieldmaps_sample_reader')) r(name)
  WHERE has_schema_privilege(r.name, 'fieldmaps_auth_hooks', 'USAGE')
    OR has_function_privilege(r.name, 'fieldmaps_auth_hooks.before_user_created(jsonb)', 'EXECUTE')
    OR has_any_column_privilege(r.name, 'fieldmaps_auth_hooks.blocked_email_domains', 'SELECT,INSERT,UPDATE,REFERENCES')
    OR has_table_privilege(r.name, 'fieldmaps_auth_hooks.blocked_email_domains', 'DELETE,TRUNCATE,TRIGGER')
), 'only Auth can access the signup hook and its blocklist');
SET LOCAL ROLE fieldmaps_api;
SELECT pg_temp.assert_rejected(
  $$SELECT fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@gmail.com"}}')$$,
  '42501', 'API callers cannot invoke the Auth hook'
);
RESET ROLE;
SET LOCAL ROLE anon;
SELECT pg_temp.assert_rejected(
  $$SELECT fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@gmail.com"}}')$$,
  '42501', 'anonymous callers cannot invoke the Auth hook'
);
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT pg_temp.assert_rejected(
  $$SELECT fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@gmail.com"}}')$$,
  '42501', 'authenticated callers cannot invoke the Auth hook'
);
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT pg_temp.assert_rejected(
  $$SELECT fieldmaps_auth_hooks.before_user_created('{"user":{"email":"person@gmail.com"}}')$$,
  '42501', 'service callers cannot invoke the Auth hook'
);
RESET ROLE;
ROLLBACK;
\echo All Auth hook scenarios passed; test records rolled back.
