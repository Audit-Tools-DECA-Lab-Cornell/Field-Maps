\set ON_ERROR_STOP on
SELECT 'CREATE DATABASE fieldmaps'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fieldmaps')
\gexec
SELECT 'CREATE DATABASE fieldmaps_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fieldmaps_test')
\gexec
SELECT 'CREATE DATABASE fieldmaps_api_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'fieldmaps_api_test')
\gexec
