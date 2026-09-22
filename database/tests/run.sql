\set ON_ERROR_STOP on
BEGIN;
SET LOCAL search_path = fieldops, public;

CREATE FUNCTION pg_temp.assert_true(actual boolean, label text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL: %', label;
  END IF;
  RAISE NOTICE 'PASS: %', label;
END;
$$;

CREATE FUNCTION pg_temp.assert_rejected(statement text, expected_state text, label text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE actual_state text;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE;
  END;
  IF actual_state IS DISTINCT FROM expected_state THEN
    RAISE EXCEPTION 'FAIL: %, expected %, got %', label, expected_state, actual_state;
  END IF;
  RAISE NOTICE 'PASS: %', label;
END;
$$;

-- Given the sample project and another organization with its own site and form.
\ir ../sample-project.sql
\ir ../sample-gis.sql
INSERT INTO organizations VALUES ('20000000-0000-4000-8000-000000000001', 'Other team');
INSERT INTO projects VALUES (
  '20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Other project'
);
INSERT INTO sites VALUES (
  '20000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002', 'other-site', 'Other site'
);
INSERT INTO form_versions VALUES (
  '20000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000002', 'other-v1', '{"fields":[]}'
);

-- When an observation is stored using the mobile contract's UUID and longitude/latitude.
INSERT INTO observations (
  id, organization_id, project_id, site_id, form_version_id,
  observer_code, observed_at, geom, answers
) VALUES (
  '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004', 'QA', '2026-09-17T14:00:00Z',
  ST_SetSRID(ST_MakePoint(-76.485, 42.448), 4326), '{"people":3,"notes":"Database test"}'
);

-- Then GIS consumers get the same location, stable key, and typed answers.
SELECT pg_temp.assert_true(
  (SELECT longitude = -76.485 AND latitude = 42.448 AND people = 3
    AND notes = 'Database test' AND ST_SRID(geom) = 4326 AND fid > 0
   FROM gis.sample_observations), 'QGIS projection preserves coordinates and typed answers'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 3 FROM fieldops_meta.schema_migrations), 'migration replay records each version once'
);
\ir constraints.sql
\ir access.sql
ROLLBACK;
\echo All database scenarios passed; test records rolled back.
