-- Given a valid saved observation, invalid writes must leave it intact.
SELECT pg_temp.assert_rejected(
  $$INSERT INTO observations (id, organization_id, project_id, site_id, form_version_id,
    observer_code, observed_at, geom, answers)
    SELECT id, organization_id, project_id, site_id, form_version_id,
      observer_code, observed_at, geom, answers FROM observations$$,
  '23505', 'duplicate observation IDs cannot create a second record'
);
SELECT pg_temp.assert_rejected(
  $$UPDATE observations SET site_id = '20000000-0000-4000-8000-000000000003'$$,
  '23503', 'an observation cannot reference another organization site'
);
SELECT pg_temp.assert_rejected(
  $$UPDATE observations SET form_version_id = '20000000-0000-4000-8000-000000000004'$$,
  '23503', 'an observation cannot reference another project form'
);
SELECT pg_temp.assert_rejected(
  $$UPDATE observations SET geom = ST_SetSRID(ST_MakePoint(181, 42), 4326)$$,
  '23514', 'out-of-range longitude is rejected'
);
SELECT pg_temp.assert_rejected(
  $$UPDATE observations SET geom = ST_GeomFromText('POINT EMPTY', 4326)$$,
  '23514', 'empty locations are rejected'
);
SELECT pg_temp.assert_rejected(
  $$UPDATE observations SET geom = ST_SetSRID(ST_MakePoint(1, 2), 3857)$$,
  '22023', 'a projected CRS cannot be silently relabelled as WGS84'
);
SELECT pg_temp.assert_rejected(
  $$UPDATE observations SET answers = '[]'$$,
  '23514', 'answers must be a JSON object'
);
SELECT pg_temp.assert_rejected(
  $$UPDATE form_versions SET definition = '{"fields":["changed"]}'$$,
  '23514', 'published form definitions cannot be rewritten'
);
SELECT pg_temp.assert_rejected(
  $$DELETE FROM form_versions$$,
  '23514', 'published form versions cannot be deleted'
);
SELECT pg_temp.assert_true(
  (SELECT count(*) = 1 AND min(revision) = 1 FROM observations),
  'rejected writes preserve the original record and revision'
);
-- When an accepted edit supplies the expected current revision.
UPDATE observations SET answers = '{"people":4,"notes":"Revised"}' WHERE revision = 1;
-- Then the database advances the revision, including tombstones for future sync.
SELECT pg_temp.assert_true(
  (SELECT revision = 2 AND updated_at >= received_at FROM observations),
  'accepted edits advance the server revision'
);
UPDATE observations SET deleted_at = clock_timestamp() WHERE revision = 2;
SELECT pg_temp.assert_true(
  NOT EXISTS (SELECT FROM gis.sample_observations)
  AND (SELECT revision = 3 AND deleted_at IS NOT NULL FROM observations),
  'deleted records remain as tombstones but disappear from the GIS layer'
);
UPDATE observations SET deleted_at = NULL;
