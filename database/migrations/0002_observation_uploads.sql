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
GRANT USAGE ON SCHEMA fieldops, public TO fieldops_api;
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
