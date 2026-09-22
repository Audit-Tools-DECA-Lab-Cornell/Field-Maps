BEGIN READ ONLY;

SELECT current_database() AS database_name, current_user AS administrator,
  current_setting('server_version') AS postgres_version;

SELECT e.extname, e.extversion, n.nspname AS extension_schema
FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
WHERE e.extname IN ('postgis', 'pgcrypto');

SELECT nspname AS application_schema
FROM pg_namespace WHERE nspname IN ('fieldops', 'fieldops_meta', 'gis');

SELECT rolname, rolcanlogin, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls
FROM pg_roles WHERE rolname IN ('postgres', 'fieldops_api', 'fieldops_sample_reader');

SELECT n.nspname AS schema_name, c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public', 'fieldops', 'gis') AND c.relkind IN ('r', 'p', 'v')
ORDER BY n.nspname, c.relname;

SELECT n.nspname AS schema_name, r.rolname,
  has_schema_privilege(r.oid, n.oid, 'USAGE') AS can_use,
  has_schema_privilege(r.oid, n.oid, 'CREATE') AS can_create
FROM pg_namespace n CROSS JOIN pg_roles r
WHERE n.nspname IN ('public', 'extensions', 'fieldops', 'gis')
  AND r.rolname IN ('anon', 'authenticated', 'service_role', 'fieldops_api');

SELECT count(*) AS auth_account_count FROM auth.users;

COMMIT;
