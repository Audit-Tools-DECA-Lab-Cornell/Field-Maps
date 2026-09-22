CREATE ROLE fieldops_qgis_training LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT fieldops_sample_reader TO fieldops_qgis_training;
GRANT USAGE ON SCHEMA extensions TO fieldops_sample_reader;
ALTER ROLE fieldops_qgis_training SET search_path = pg_catalog, extensions, gis;
ALTER ROLE fieldops_qgis_training SET statement_timeout = '30s';
ALTER ROLE fieldops_qgis_training SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE fieldops_qgis_training SET default_transaction_read_only = on;
