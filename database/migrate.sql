\set ON_ERROR_STOP on
BEGIN;
SELECT pg_advisory_xact_lock(17092026, 1);
CREATE SCHEMA IF NOT EXISTS fieldops_meta;
CREATE TABLE IF NOT EXISTS fieldops_meta.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
SELECT EXISTS (
  SELECT FROM fieldops_meta.schema_migrations WHERE version = '0001_initial'
) AS already_applied
\gset
\if :already_applied
  \echo FieldOps migration 0001 already applied.
\else
  \ir migrations/0001_initial.sql
  INSERT INTO fieldops_meta.schema_migrations (version) VALUES ('0001_initial');
\endif
SELECT EXISTS (
  SELECT FROM fieldops_meta.schema_migrations WHERE version = '0002_observation_uploads'
) AS uploads_applied
\gset
\if :uploads_applied
  \echo FieldOps migration 0002 already applied.
\else
  \ir migrations/0002_observation_uploads.sql
  INSERT INTO fieldops_meta.schema_migrations (version) VALUES ('0002_observation_uploads');
\endif
SELECT EXISTS (
  SELECT FROM fieldops_meta.schema_migrations WHERE version = '0003_spatial_interface'
) AS spatial_applied
\gset
\if :spatial_applied
  \echo FieldOps migration 0003 already applied.
\else
  \ir migrations/0003_spatial_interface.sql
  INSERT INTO fieldops_meta.schema_migrations (version) VALUES ('0003_spatial_interface');
\endif
COMMIT;
