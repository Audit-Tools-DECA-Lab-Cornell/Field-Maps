CREATE ROLE fieldmaps_qgis_training LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
GRANT fieldmaps_sample_reader TO fieldmaps_qgis_training;
GRANT USAGE ON SCHEMA extensions TO fieldmaps_sample_reader;
ALTER ROLE fieldmaps_qgis_training SET search_path = pg_catalog, extensions, gis;
ALTER ROLE fieldmaps_qgis_training SET statement_timeout = '30s';
ALTER ROLE fieldmaps_qgis_training SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE fieldmaps_qgis_training SET default_transaction_read_only = on;
