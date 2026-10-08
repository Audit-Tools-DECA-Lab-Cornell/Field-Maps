-- Sites a manager can create, form versions with a lifecycle, and the round a record belongs to.
--
-- 1. Sites (BE-13 step 1): managers create and rename a project's sites through the API.
-- 2. The instrument lifecycle (DB-09): forms, drafts a manager edits, publishing that freezes a
--    version, and retiring. Members read published and retired versions only; managers also read
--    their drafts. Publishing and retiring run in fieldmaps_private and name the caller.
-- 3. Round context on observations (D26, part of DB-10): the zone, the round type (standard,
--    reliability, inventory), whether it was the first round of an observation period, and whether
--    the point was placed by hand or is a whole-zone record stored at the zone's centre.
--
-- Direct inserts that predate the lifecycle (seeds, fixtures, the Training form) keep working: a
-- version inserted without a form is given one from its code (`shell-v1` → form `shell`, version
-- 1), and the state still defaults to published. The API always inserts drafts explicitly.

-- 1. Sites ------------------------------------------------------------------------------------

ALTER TABLE fieldmaps.sites
  ADD COLUMN description text CHECK (description IS NULL OR length(description) <= 2000),
  ADD COLUMN created_by uuid,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

GRANT INSERT (id, organization_id, project_id, code, name, description, created_by)
  ON fieldmaps.sites TO fieldmaps_api;
GRANT UPDATE (name, description) ON fieldmaps.sites TO fieldmaps_api;

CREATE POLICY manager_creates_site ON fieldmaps.sites FOR INSERT TO fieldmaps_api
  WITH CHECK (created_by = fieldmaps.request_user_id()
    AND fieldmaps_private.has_project_role(project_id, ARRAY['manager']));
CREATE POLICY manager_updates_site ON fieldmaps.sites FOR UPDATE TO fieldmaps_api
  USING (fieldmaps_private.has_project_role(project_id, ARRAY['manager']))
  WITH CHECK (fieldmaps_private.has_project_role(project_id, ARRAY['manager']));

-- 2. Forms and the version lifecycle ----------------------------------------------------------

-- The backfill below updates rows the old trigger refuses, so it goes first.
DROP TRIGGER immutable_form_version ON fieldmaps.form_versions;

CREATE TABLE fieldmaps.forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  code text NOT NULL CHECK (code ~ '^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, project_id) REFERENCES fieldmaps.projects (organization_id, id),
  UNIQUE (organization_id, project_id, code),
  UNIQUE (organization_id, project_id, id)
);
CREATE INDEX forms_project_idx ON fieldmaps.forms (organization_id, project_id);

ALTER TABLE fieldmaps.form_versions
  ADD COLUMN form_id uuid,
  ADD COLUMN version integer CHECK (version > 0),
  ADD COLUMN state text NOT NULL DEFAULT 'published'
    CHECK (state IN ('draft', 'published', 'retired')),
  ADD COLUMN schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  ADD COLUMN published_at timestamptz,
  ADD COLUMN published_by uuid,
  ADD COLUMN created_by uuid,
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

-- Every existing version gets its form: the code without its "-vN" suffix, and that number.
INSERT INTO fieldmaps.forms (organization_id, project_id, code, name)
SELECT DISTINCT organization_id, project_id,
  regexp_replace(code, '-v[0-9]+$', ''), regexp_replace(code, '-v[0-9]+$', '')
FROM fieldmaps.form_versions
ON CONFLICT (organization_id, project_id, code) DO NOTHING;
UPDATE fieldmaps.form_versions v SET
  form_id = f.id,
  version = coalesce(substring(v.code FROM '-v([0-9]+)$')::integer, 1),
  published_at = coalesce(v.published_at, clock_timestamp())
FROM fieldmaps.forms f
WHERE f.organization_id = v.organization_id AND f.project_id = v.project_id
  AND f.code = regexp_replace(v.code, '-v[0-9]+$', '');
DO $$
BEGIN
  IF EXISTS (SELECT FROM fieldmaps.form_versions WHERE form_id IS NULL OR version IS NULL) THEN
    RAISE EXCEPTION 'Every form version needs a form and a version number' USING ERRCODE = '23502';
  END IF;
END;
$$;
ALTER TABLE fieldmaps.form_versions
  ALTER COLUMN form_id SET NOT NULL,
  ALTER COLUMN version SET NOT NULL,
  ADD FOREIGN KEY (organization_id, project_id, form_id)
    REFERENCES fieldmaps.forms (organization_id, project_id, id),
  ADD UNIQUE (form_id, version),
  ADD CHECK (state <> 'published' OR published_at IS NOT NULL);

-- Seeds and fixtures insert versions without a form: give them one from the code, as above.
CREATE FUNCTION fieldmaps.fill_form_version_lineage() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE base text := regexp_replace(NEW.code, '-v[0-9]+$', '');
BEGIN
  IF NEW.form_id IS NULL THEN
    INSERT INTO fieldmaps.forms (organization_id, project_id, code, name)
    VALUES (NEW.organization_id, NEW.project_id, base, base)
    ON CONFLICT (organization_id, project_id, code) DO NOTHING;
    SELECT id INTO NEW.form_id FROM fieldmaps.forms
    WHERE organization_id = NEW.organization_id AND project_id = NEW.project_id AND code = base;
  END IF;
  NEW.version := coalesce(NEW.version, substring(NEW.code FROM '-v([0-9]+)$')::integer, 1);
  IF NEW.state = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER form_version_lineage BEFORE INSERT ON fieldmaps.form_versions
  FOR EACH ROW EXECUTE FUNCTION fieldmaps.fill_form_version_lineage();

-- Identity never changes. A draft's definition may; a published version may only be retired.
CREATE OR REPLACE FUNCTION fieldmaps.preserve_form_version() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state <> 'draft' THEN
      RAISE EXCEPTION 'Published form versions are immutable; publish a new version'
        USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF (NEW.id, NEW.organization_id, NEW.project_id, NEW.code, NEW.form_id, NEW.version,
      NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.id, OLD.organization_id, OLD.project_id, OLD.code, OLD.form_id, OLD.version,
      OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'Form version identity cannot change' USING ERRCODE = '23514';
  END IF;
  IF OLD.state = 'draft' AND NEW.state IN ('draft', 'published') THEN
    RETURN NEW;
  END IF;
  IF OLD.state = 'published' AND NEW.state = 'retired'
     AND NEW.definition = OLD.definition AND NEW.schema_version = OLD.schema_version
     AND NEW.published_at IS NOT DISTINCT FROM OLD.published_at
     AND NEW.published_by IS NOT DISTINCT FROM OLD.published_by THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Published form versions are immutable; publish a new version'
    USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER immutable_form_version BEFORE UPDATE OR DELETE ON fieldmaps.form_versions
  FOR EACH ROW EXECUTE FUNCTION fieldmaps.preserve_form_version();

ALTER TABLE fieldmaps.forms ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON fieldmaps.forms FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT (id, organization_id, project_id, code, name, created_by)
  ON fieldmaps.forms TO fieldmaps_api;
CREATE POLICY member_reads_forms ON fieldmaps.forms FOR SELECT TO fieldmaps_api
  USING (project_id IN (SELECT fieldmaps_private.my_project_ids()));
CREATE POLICY manager_creates_form ON fieldmaps.forms FOR INSERT TO fieldmaps_api
  WITH CHECK (created_by = fieldmaps.request_user_id()
    AND fieldmaps_private.has_project_role(project_id, ARRAY['manager']));

GRANT INSERT (id, organization_id, project_id, form_id, version, code, definition,
  schema_version, state, created_by) ON fieldmaps.form_versions TO fieldmaps_api;
GRANT UPDATE (definition, schema_version) ON fieldmaps.form_versions TO fieldmaps_api;
GRANT DELETE ON fieldmaps.form_versions TO fieldmaps_api;

-- Members read what can be collected or was collected; drafts are their managers' alone.
DROP POLICY assigned_forms ON fieldmaps.form_versions;
CREATE POLICY member_reads_published_versions ON fieldmaps.form_versions FOR SELECT TO fieldmaps_api
  USING (state IN ('published', 'retired')
    AND project_id IN (SELECT fieldmaps_private.my_project_ids()));
CREATE POLICY manager_reads_drafts ON fieldmaps.form_versions FOR SELECT TO fieldmaps_api
  USING (state = 'draft' AND fieldmaps_private.has_project_role(project_id, ARRAY['manager']));
CREATE POLICY manager_creates_draft ON fieldmaps.form_versions FOR INSERT TO fieldmaps_api
  WITH CHECK (state = 'draft' AND created_by = fieldmaps.request_user_id()
    AND fieldmaps_private.has_project_role(project_id, ARRAY['manager']));
CREATE POLICY manager_edits_draft ON fieldmaps.form_versions FOR UPDATE TO fieldmaps_api
  USING (state = 'draft' AND fieldmaps_private.has_project_role(project_id, ARRAY['manager']))
  WITH CHECK (state = 'draft' AND fieldmaps_private.has_project_role(project_id, ARRAY['manager']));
CREATE POLICY manager_discards_draft ON fieldmaps.form_versions FOR DELETE TO fieldmaps_api
  USING (state = 'draft' AND fieldmaps_private.has_project_role(project_id, ARRAY['manager']));

-- Publishing freezes a draft and marks its definition published, so a device can upload against it.
CREATE FUNCTION fieldmaps_private.publish_form_version(p_project_id uuid, p_form_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target fieldmaps.form_versions;
BEGIN
  PERFORM fieldmaps_private.assert_active_user();
  SELECT * INTO target FROM fieldmaps.form_versions WHERE id = p_form_version_id FOR UPDATE;
  IF NOT FOUND OR target.project_id <> p_project_id THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'FM007';
  END IF;
  IF NOT fieldmaps_private.has_project_role(p_project_id, ARRAY['manager']) THEN
    RAISE EXCEPTION 'role_required' USING ERRCODE = 'FM006';
  END IF;
  IF target.state <> 'draft' THEN
    RAISE EXCEPTION 'conflict' USING ERRCODE = 'FM008';
  END IF;
  UPDATE fieldmaps.form_versions SET
    state = 'published',
    definition = pg_catalog.jsonb_set(target.definition, '{status}', '"published"', true),
    published_at = pg_catalog.clock_timestamp(),
    published_by = fieldmaps.request_user_id()
  WHERE id = p_form_version_id;
END;
$$;

-- Retiring stops new collection; records already collected against it still upload.
CREATE FUNCTION fieldmaps_private.retire_form_version(p_project_id uuid, p_form_version_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target fieldmaps.form_versions;
BEGIN
  PERFORM fieldmaps_private.assert_active_user();
  SELECT * INTO target FROM fieldmaps.form_versions WHERE id = p_form_version_id FOR UPDATE;
  IF NOT FOUND OR target.project_id <> p_project_id THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'FM007';
  END IF;
  IF NOT fieldmaps_private.has_project_role(p_project_id, ARRAY['manager']) THEN
    RAISE EXCEPTION 'role_required' USING ERRCODE = 'FM006';
  END IF;
  IF target.state <> 'published' THEN
    RAISE EXCEPTION 'conflict' USING ERRCODE = 'FM008';
  END IF;
  UPDATE fieldmaps.form_versions SET state = 'retired' WHERE id = p_form_version_id;
END;
$$;

REVOKE ALL ON FUNCTION fieldmaps.fill_form_version_lineage(), fieldmaps.preserve_form_version()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION fieldmaps_private.publish_form_version(uuid, uuid),
  fieldmaps_private.retire_form_version(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fieldmaps_private.publish_form_version(uuid, uuid),
  fieldmaps_private.retire_form_version(uuid, uuid) TO fieldmaps_api;

-- 3. Round context on observations ------------------------------------------------------------

ALTER TABLE fieldmaps.observations
  ADD COLUMN zone_code text CHECK (zone_code IS NULL OR length(btrim(zone_code)) BETWEEN 1 AND 100),
  ADD COLUMN round_type text CHECK (round_type IN ('standard', 'reliability', 'inventory')),
  ADD COLUMN first_round boolean,
  ADD COLUMN placement_source text CHECK (placement_source IN ('hand', 'zone'));
CREATE INDEX observations_round_idx
  ON fieldmaps.observations (organization_id, project_id, round_type, zone_code);
GRANT INSERT (zone_code, round_type, first_round, placement_source)
  ON fieldmaps.observations TO fieldmaps_api;

INSERT INTO fieldmaps_meta.schema_migrations(version) VALUES ('0013_sites_forms_collection');
