CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
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
  geom public.geometry(Point, 4326) NOT NULL,
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  FOREIGN KEY (organization_id, project_id, site_id)
    REFERENCES fieldops.sites (organization_id, project_id, id),
  FOREIGN KEY (organization_id, project_id, form_version_id)
    REFERENCES fieldops.form_versions (organization_id, project_id, id),
  CHECK (NOT public.ST_IsEmpty(geom)),
  CHECK (public.ST_X(geom) BETWEEN -180 AND 180 AND public.ST_Y(geom) BETWEEN -90 AND 90)
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
