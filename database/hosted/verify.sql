BEGIN;
GRANT fieldmaps_api, fieldmaps_sample_reader TO postgres WITH SET TRUE;
CREATE FUNCTION pg_temp.assert_true(actual boolean, label text) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF actual IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL: %', label;
  END IF;
END;
$$;

INSERT INTO fieldmaps.project_memberships (user_id, organization_id, project_id, role)
VALUES ('50000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002', 'observer');

SET LOCAL ROLE fieldmaps_api;
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM fieldmaps.projects), 'no identity sees no projects');
SELECT set_config('fieldmaps.user_id', '50000000-0000-4000-8000-000000000001', true);
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM fieldmaps.projects), 'member sees assigned project');
INSERT INTO fieldmaps.observations
  (id, organization_id, project_id, site_id, form_version_id, observer_code,
   observed_at, geom, answers, created_by, upload_hash)
VALUES ('50000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000004',
  'QA', now(), fieldmaps.make_point(-76.485, 42.448),
  '{"people":3,"notes":"Hosted transaction verification"}',
  fieldmaps.request_user_id(), repeat('a', 64));
SELECT pg_temp.assert_true(
  (SELECT fieldmaps.longitude(geom) = -76.485 FROM fieldmaps.observations
   WHERE id = '50000000-0000-4000-8000-000000000002'), 'API geometry readback');
SELECT set_config('fieldmaps.user_id', '50000000-0000-4000-8000-000000000003', true);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM fieldmaps.observations), 'unassigned user sees no observations');
SELECT pg_temp.assert_true(NOT has_table_privilege(current_user, 'fieldmaps.observations', 'UPDATE'), 'API cannot edit observations');
SELECT pg_temp.assert_true(NOT has_table_privilege(current_user, 'fieldmaps.project_memberships', 'INSERT'), 'API cannot assign memberships');
RESET ROLE;
SET LOCAL ROLE fieldmaps_sample_reader;
SELECT pg_temp.assert_true(
  (SELECT longitude = -76.485 AND latitude = 42.448 AND people = 3
   FROM gis.sample_observations WHERE observation_id = '50000000-0000-4000-8000-000000000002'),
  'restricted GIS view returns the uploaded point');
RESET ROLE;
ROLLBACK;
SELECT 'Seven hosted assertions passed; synthetic membership and observation rolled back' AS result;
