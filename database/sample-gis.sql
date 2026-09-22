DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fieldmaps_sample_reader') THEN
    CREATE ROLE fieldmaps_sample_reader NOLOGIN;
  END IF;
END;
$$;

CREATE OR REPLACE VIEW gis.sample_observations WITH (security_barrier = true) AS
SELECT
  o.qgis_id AS fid,
  o.id AS observation_id,
  s.name AS site_name,
  f.code AS form_version,
  o.observer_code,
  o.observed_at,
  o.received_at,
  o.revision,
  public.ST_X(o.geom) AS longitude,
  public.ST_Y(o.geom) AS latitude,
  CASE WHEN jsonb_typeof(o.answers -> 'people') = 'number'
    AND o.answers ->> 'people' ~ '^[0-9]{1,3}$'
    THEN (o.answers ->> 'people')::integer END AS people,
  CASE WHEN jsonb_typeof(o.answers -> 'notes') = 'string'
    THEN o.answers ->> 'notes' END AS notes,
  o.geom::public.geometry(Point, 4326) AS geom
FROM fieldmaps.observations o
JOIN fieldmaps.sites s ON (s.organization_id, s.project_id, s.id)
  = (o.organization_id, o.project_id, o.site_id)
JOIN fieldmaps.form_versions f ON (f.organization_id, f.project_id, f.id)
  = (o.organization_id, o.project_id, o.form_version_id)
WHERE o.organization_id = '10000000-0000-4000-8000-000000000001'
  AND o.project_id = '10000000-0000-4000-8000-000000000002'
  AND f.code = 'shell-v1'
  AND o.deleted_at IS NULL;

GRANT USAGE ON SCHEMA gis TO fieldmaps_sample_reader;
GRANT SELECT ON gis.sample_observations TO fieldmaps_sample_reader;
