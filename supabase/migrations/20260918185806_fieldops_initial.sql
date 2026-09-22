CREATE SCHEMA fieldops_meta;
CREATE TABLE fieldops_meta.schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT clock_timestamp());

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE SCHEMA fieldops;
CREATE SCHEMA gis;

CREATE TABLE fieldops.organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200)
);

CREATE TABLE fieldops.projects (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES fieldops.organizations (id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  UNIQUE (organization_id, id)
);

CREATE TABLE fieldops.sites (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 100),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES fieldops.projects (organization_id, id),
  UNIQUE (organization_id, project_id, id),
  UNIQUE (organization_id, project_id, code)
);

CREATE TABLE fieldops.form_versions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 100),
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES fieldops.projects (organization_id, id),
  UNIQUE (organization_id, project_id, id),
  UNIQUE (organization_id, project_id, code)
);

CREATE TABLE fieldops.observations (
  id uuid PRIMARY KEY,
  qgis_id bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  site_id uuid NOT NULL,
  form_version_id uuid NOT NULL,
  observer_code text NOT NULL CHECK (length(btrim(observer_code)) BETWEEN 1 AND 12),
  observed_at timestamptz NOT NULL CHECK (isfinite(observed_at)),
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  deleted_at timestamptz CHECK (deleted_at IS NULL OR isfinite(deleted_at)),
  geom extensions.geometry(Point, 4326) NOT NULL,
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  FOREIGN KEY (organization_id, project_id, site_id)
    REFERENCES fieldops.sites (organization_id, project_id, id),
  FOREIGN KEY (organization_id, project_id, form_version_id)
    REFERENCES fieldops.form_versions (organization_id, project_id, id),
  CHECK (NOT extensions.ST_IsEmpty(geom)),
  CHECK (extensions.ST_X(geom) BETWEEN -180 AND 180 AND extensions.ST_Y(geom) BETWEEN -90 AND 90)
);

CREATE INDEX observations_geom_idx ON fieldops.observations USING gist (geom);
CREATE INDEX observations_project_time_idx
  ON fieldops.observations (organization_id, project_id, observed_at, id);
CREATE INDEX observations_site_idx
  ON fieldops.observations (organization_id, project_id, site_id);
CREATE INDEX observations_form_idx
  ON fieldops.observations (organization_id, project_id, form_version_id);

CREATE FUNCTION fieldops.preserve_form_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'Published form versions are immutable; publish a new version'
    USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER immutable_form_version BEFORE UPDATE OR DELETE ON fieldops.form_versions
  FOR EACH ROW EXECUTE FUNCTION fieldops.preserve_form_version();

CREATE FUNCTION fieldops.advance_observation_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF (NEW.id, NEW.qgis_id, NEW.organization_id, NEW.project_id, NEW.received_at)
     IS DISTINCT FROM
     (OLD.id, OLD.qgis_id, OLD.organization_id, OLD.project_id, OLD.received_at) THEN
    RAISE EXCEPTION 'Observation identity and receipt time cannot change' USING ERRCODE = '23514';
  END IF;
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER observation_revision BEFORE UPDATE ON fieldops.observations
  FOR EACH ROW EXECUTE FUNCTION fieldops.advance_observation_revision();

ALTER TABLE fieldops.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldops.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldops.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldops.form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldops.observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA fieldops, gis, fieldops_meta FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA fieldops, gis, fieldops_meta FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA fieldops FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fieldops FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA fieldops REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

INSERT INTO fieldops_meta.schema_migrations(version) VALUES ('0001_initial');

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fieldops_api') THEN
    CREATE ROLE fieldops_api LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END;
$$;

CREATE TABLE fieldops.project_memberships (
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('observer', 'manager', 'viewer')),
  PRIMARY KEY (user_id, project_id),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES fieldops.projects (organization_id, id)
);
CREATE INDEX memberships_project_idx
  ON fieldops.project_memberships (organization_id, project_id);
ALTER TABLE fieldops.project_memberships ENABLE ROW LEVEL SECURITY;

ALTER TABLE fieldops.observations ADD COLUMN created_by uuid;
ALTER TABLE fieldops.observations ADD COLUMN upload_hash text
  CHECK (upload_hash ~ '^[a-f0-9]{64}$');
ALTER TABLE fieldops.observations ADD CONSTRAINT upload_identity_pair
  CHECK ((created_by IS NULL) = (upload_hash IS NULL));

CREATE FUNCTION fieldops.request_user_id() RETURNS uuid
LANGUAGE sql STABLE SET search_path = pg_catalog AS $$
  SELECT nullif(current_setting('fieldops.user_id', true), '')::uuid;
$$;
REVOKE ALL ON FUNCTION fieldops.request_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldops.request_user_id() TO fieldops_api;
GRANT USAGE ON SCHEMA fieldops, extensions TO fieldops_api;
GRANT SELECT ON fieldops.project_memberships, fieldops.projects,
  fieldops.sites, fieldops.form_versions, fieldops.observations TO fieldops_api;
GRANT INSERT (id, organization_id, project_id, site_id, form_version_id,
  observer_code, observed_at, geom, answers, created_by, upload_hash)
  ON fieldops.observations TO fieldops_api;
GRANT USAGE ON SEQUENCE fieldops.observations_qgis_id_seq TO fieldops_api;

CREATE POLICY self_memberships ON fieldops.project_memberships FOR SELECT TO fieldops_api
  USING (user_id = fieldops.request_user_id());
CREATE POLICY assigned_projects ON fieldops.projects FOR SELECT TO fieldops_api
  USING (EXISTS (SELECT FROM fieldops.project_memberships m WHERE m.project_id = id));
CREATE POLICY assigned_sites ON fieldops.sites FOR SELECT TO fieldops_api
  USING (EXISTS (SELECT FROM fieldops.project_memberships m WHERE m.project_id = sites.project_id));
CREATE POLICY assigned_forms ON fieldops.form_versions FOR SELECT TO fieldops_api
  USING (EXISTS (SELECT FROM fieldops.project_memberships m
    WHERE m.project_id = form_versions.project_id));
CREATE POLICY assigned_observations ON fieldops.observations FOR SELECT TO fieldops_api
  USING (EXISTS (SELECT FROM fieldops.project_memberships m
    WHERE m.project_id = observations.project_id));
CREATE POLICY assigned_observation_uploads ON fieldops.observations FOR INSERT TO fieldops_api
  WITH CHECK (created_by = fieldops.request_user_id() AND upload_hash IS NOT NULL
    AND EXISTS (SELECT FROM fieldops.project_memberships m
      WHERE m.project_id = observations.project_id AND m.role IN ('observer', 'manager')));

CREATE OR REPLACE FUNCTION fieldops.advance_observation_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF (NEW.id, NEW.qgis_id, NEW.organization_id, NEW.project_id, NEW.received_at,
      NEW.created_by, NEW.upload_hash)
     IS DISTINCT FROM
     (OLD.id, OLD.qgis_id, OLD.organization_id, OLD.project_id, OLD.received_at,
      OLD.created_by, OLD.upload_hash) THEN
    RAISE EXCEPTION 'Observation identity and receipt cannot change' USING ERRCODE = '23514';
  END IF;
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

INSERT INTO fieldops_meta.schema_migrations(version) VALUES ('0002_observation_uploads');

CREATE FUNCTION fieldops.make_point(longitude double precision, latitude double precision)
RETURNS extensions.geometry LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT extensions.ST_SetSRID(extensions.ST_MakePoint(longitude, latitude), 4326);
$$;

CREATE FUNCTION fieldops.longitude(point extensions.geometry)
RETURNS double precision LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT extensions.ST_X(point);
$$;

CREATE FUNCTION fieldops.latitude(point extensions.geometry)
RETURNS double precision LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT extensions.ST_Y(point);
$$;

REVOKE ALL ON FUNCTION fieldops.make_point(double precision, double precision),
  fieldops.longitude(extensions.geometry), fieldops.latitude(extensions.geometry) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fieldops.make_point(double precision, double precision),
  fieldops.longitude(extensions.geometry), fieldops.latitude(extensions.geometry) TO fieldops_api;

INSERT INTO fieldops_meta.schema_migrations(version) VALUES ('0003_spatial_interface');

INSERT INTO fieldops.organizations (id, name) VALUES (
  '10000000-0000-4000-8000-000000000001', 'FieldOps training'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO fieldops.projects (id, organization_id, name) VALUES (
  '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001',
  'Mobile shell practice'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO fieldops.sites (id, organization_id, project_id, code, name) VALUES (
  '10000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002', 'sample-garden', 'Sample garden'
) ON CONFLICT (id) DO NOTHING;
INSERT INTO fieldops.form_versions (id, organization_id, project_id, code, definition) VALUES (
  '10000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000002', 'shell-v1',
  '{"status":"practice-only","fields":[
    {"code":"people","type":"integer","required":true,"minimum":0,"maximum":999},
    {"code":"notes","type":"text","required":false,"maxLength":1000}
  ]}'
) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'fieldops_sample_reader') THEN
    CREATE ROLE fieldops_sample_reader NOLOGIN;
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
  extensions.ST_X(o.geom) AS longitude,
  extensions.ST_Y(o.geom) AS latitude,
  CASE WHEN jsonb_typeof(o.answers -> 'people') = 'number'
    AND o.answers ->> 'people' ~ '^[0-9]{1,3}$'
    THEN (o.answers ->> 'people')::integer END AS people,
  CASE WHEN jsonb_typeof(o.answers -> 'notes') = 'string'
    THEN o.answers ->> 'notes' END AS notes,
  o.geom::extensions.geometry(Point, 4326) AS geom
FROM fieldops.observations o
JOIN fieldops.sites s ON (s.organization_id, s.project_id, s.id)
  = (o.organization_id, o.project_id, o.site_id)
JOIN fieldops.form_versions f ON (f.organization_id, f.project_id, f.id)
  = (o.organization_id, o.project_id, o.form_version_id)
WHERE o.organization_id = '10000000-0000-4000-8000-000000000001'
  AND o.project_id = '10000000-0000-4000-8000-000000000002'
  AND f.code = 'shell-v1'
  AND o.deleted_at IS NULL;

GRANT USAGE ON SCHEMA gis TO fieldops_sample_reader;
GRANT SELECT ON gis.sample_observations TO fieldops_sample_reader;


REVOKE ALL ON SCHEMA fieldops, fieldops_meta, gis FROM anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA fieldops, fieldops_meta, gis FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA fieldops FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fieldops FROM anon, authenticated, service_role;
ALTER TABLE fieldops_meta.schema_migrations ENABLE ROW LEVEL SECURITY;
ALTER ROLE fieldops_api SET statement_timeout = '15s';
ALTER ROLE fieldops_api SET idle_in_transaction_session_timeout = '15s';
ALTER ROLE fieldops_api SET search_path = pg_catalog;
