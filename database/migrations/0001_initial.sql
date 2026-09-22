CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA fieldmaps;
CREATE SCHEMA gis;

CREATE TABLE fieldmaps.organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200)
);

CREATE TABLE fieldmaps.projects (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES fieldmaps.organizations (id),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  UNIQUE (organization_id, id)
);

CREATE TABLE fieldmaps.sites (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 100),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES fieldmaps.projects (organization_id, id),
  UNIQUE (organization_id, project_id, id),
  UNIQUE (organization_id, project_id, code)
);

CREATE TABLE fieldmaps.form_versions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 100),
  definition jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  FOREIGN KEY (organization_id, project_id)
    REFERENCES fieldmaps.projects (organization_id, id),
  UNIQUE (organization_id, project_id, id),
  UNIQUE (organization_id, project_id, code)
);

CREATE TABLE fieldmaps.observations (
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
  geom public.geometry(Point, 4326) NOT NULL,
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  FOREIGN KEY (organization_id, project_id, site_id)
    REFERENCES fieldmaps.sites (organization_id, project_id, id),
  FOREIGN KEY (organization_id, project_id, form_version_id)
    REFERENCES fieldmaps.form_versions (organization_id, project_id, id),
  CHECK (NOT public.ST_IsEmpty(geom)),
  CHECK (public.ST_X(geom) BETWEEN -180 AND 180 AND public.ST_Y(geom) BETWEEN -90 AND 90)
);

CREATE INDEX observations_geom_idx ON fieldmaps.observations USING gist (geom);
CREATE INDEX observations_project_time_idx
  ON fieldmaps.observations (organization_id, project_id, observed_at, id);
CREATE INDEX observations_site_idx
  ON fieldmaps.observations (organization_id, project_id, site_id);
CREATE INDEX observations_form_idx
  ON fieldmaps.observations (organization_id, project_id, form_version_id);

CREATE FUNCTION fieldmaps.preserve_form_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'Published form versions are immutable; publish a new version'
    USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER immutable_form_version BEFORE UPDATE OR DELETE ON fieldmaps.form_versions
  FOR EACH ROW EXECUTE FUNCTION fieldmaps.preserve_form_version();

CREATE FUNCTION fieldmaps.advance_observation_revision() RETURNS trigger
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
CREATE TRIGGER observation_revision BEFORE UPDATE ON fieldmaps.observations
  FOR EACH ROW EXECUTE FUNCTION fieldmaps.advance_observation_revision();

ALTER TABLE fieldmaps.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldmaps.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldmaps.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldmaps.form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldmaps.observations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA fieldmaps, gis, fieldmaps_meta FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA fieldmaps, gis, fieldmaps_meta FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA fieldmaps FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fieldmaps FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA fieldmaps REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
