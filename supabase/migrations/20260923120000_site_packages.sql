-- Hosted counterpart of database/migrations/0004_site_packages.sql.
--
-- The package routes read and write these tables unconditionally, so until this is applied the
-- hosted API answers every package request with 503. The tables and triggers are the local
-- migration's, unchanged. The policies are the local 0004 policies as tightened by the local
-- 0005_package_policy_identity: every membership test names the caller explicitly instead of
-- relying on the memberships SELECT policy to hide other members' rows (widening that policy
-- would otherwise let any member pass a manager check), and a package's checks can only be
-- written by a current manager in the transaction that prepared it. What this file adds besides
-- is what every hosted migration carries: explicit revokes from Supabase's browser roles and the
-- `fieldmaps_meta` ledger rows.

CREATE TABLE fieldmaps.site_packages (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL,
  project_id uuid NOT NULL,
  site_id uuid NOT NULL,
  form_version_id uuid NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  state text NOT NULL CHECK (state IN ('ready', 'blocked')),
  manifest jsonb NOT NULL CHECK (jsonb_typeof(manifest) = 'object'),
  archive bytea NOT NULL CHECK (octet_length(archive) BETWEEN 1 AND 16777216),
  archive_sha256 text NOT NULL CHECK (archive_sha256 ~ '^[a-f0-9]{64}$'),
  prepared_by uuid NOT NULL,
  prepared_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (organization_id, project_id, site_id)
    REFERENCES fieldmaps.sites (organization_id, project_id, id),
  FOREIGN KEY (organization_id, project_id, form_version_id)
    REFERENCES fieldmaps.form_versions (organization_id, project_id, id),
  -- Superseding a package means preparing the next version beside it, never editing this one.
  UNIQUE (organization_id, project_id, site_id, version)
);
CREATE INDEX site_packages_site_idx
  ON fieldmaps.site_packages (organization_id, project_id, site_id, version DESC);

CREATE TABLE fieldmaps.package_checks (
  package_id uuid NOT NULL REFERENCES fieldmaps.site_packages (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position >= 0),
  step text NOT NULL CHECK (step IN ('source-project', 'layer-sources',
    'coordinate-reference', 'imagery-licence', 'archive')),
  state text NOT NULL CHECK (state IN ('passed', 'warning', 'blocked', 'skipped')),
  detail text NOT NULL CHECK (length(btrim(detail)) BETWEEN 1 AND 2000),
  PRIMARY KEY (package_id, position)
);

CREATE FUNCTION fieldmaps.preserve_site_package() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
  RAISE EXCEPTION 'Prepared packages are immutable; prepare the next version'
    USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER immutable_site_package BEFORE UPDATE OR DELETE ON fieldmaps.site_packages
  FOR EACH ROW EXECUTE FUNCTION fieldmaps.preserve_site_package();
CREATE TRIGGER immutable_package_check BEFORE UPDATE OR DELETE ON fieldmaps.package_checks
  FOR EACH ROW EXECUTE FUNCTION fieldmaps.preserve_site_package();

ALTER TABLE fieldmaps.site_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE fieldmaps.package_checks ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON fieldmaps.site_packages, fieldmaps.package_checks TO fieldmaps_api;
GRANT INSERT (id, organization_id, project_id, site_id, form_version_id, version, state,
  manifest, archive, archive_sha256, prepared_by)
  ON fieldmaps.site_packages TO fieldmaps_api;
GRANT INSERT (package_id, position, step, state, detail)
  ON fieldmaps.package_checks TO fieldmaps_api;

-- Anyone on the project may read a package: an observer's device has to fetch it.
CREATE POLICY assigned_packages ON fieldmaps.site_packages FOR SELECT TO fieldmaps_api
  USING (EXISTS (SELECT FROM fieldmaps.project_memberships m
    WHERE m.project_id = site_packages.project_id
      AND m.user_id = fieldmaps.request_user_id()));
CREATE POLICY assigned_package_checks ON fieldmaps.package_checks FOR SELECT TO fieldmaps_api
  USING (EXISTS (SELECT FROM fieldmaps.site_packages p
    JOIN fieldmaps.project_memberships m ON m.project_id = p.project_id
    WHERE p.id = package_checks.package_id
      AND m.user_id = fieldmaps.request_user_id()));

-- Preparing one is a manager's act, and the row records which manager.
CREATE POLICY manager_prepares_package ON fieldmaps.site_packages FOR INSERT TO fieldmaps_api
  WITH CHECK (prepared_by = fieldmaps.request_user_id()
    AND EXISTS (SELECT FROM fieldmaps.project_memberships m
      WHERE m.project_id = site_packages.project_id
        AND m.user_id = fieldmaps.request_user_id() AND m.role = 'manager'));
-- A package's checks are part of preparing it: only the preparing manager, still a manager, and
-- only in the transaction that inserted the package (its clock_timestamp() default is never
-- earlier than this transaction's start). Otherwise an "immutable" package could gain checks later.
CREATE POLICY manager_prepares_package_checks ON fieldmaps.package_checks FOR INSERT TO fieldmaps_api
  WITH CHECK (EXISTS (SELECT FROM fieldmaps.site_packages p
    JOIN fieldmaps.project_memberships m ON m.project_id = p.project_id
    WHERE p.id = package_checks.package_id
      AND p.prepared_by = fieldmaps.request_user_id()
      AND p.prepared_at >= transaction_timestamp()
      AND m.user_id = fieldmaps.request_user_id() AND m.role = 'manager'));

-- The initial migration's revokes covered only the tables that existed then.
REVOKE ALL ON fieldmaps.site_packages, fieldmaps.package_checks
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION fieldmaps.preserve_site_package()
  FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO fieldmaps_meta.schema_migrations(version)
  VALUES ('0004_site_packages'), ('0005_package_policy_identity');
