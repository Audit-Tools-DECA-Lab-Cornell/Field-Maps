\set ON_ERROR_STOP on
SELECT 'CREATE DATABASE fieldops'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fieldops')
\gexec
SELECT 'CREATE DATABASE fieldops_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fieldops_test')
\gexec
SELECT 'CREATE DATABASE fieldops_api_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fieldops_api_test')
\gexec
