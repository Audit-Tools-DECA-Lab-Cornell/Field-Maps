from typing import Final

from sqlalchemy import text

PACKAGE_TARGET: Final = text("""
SELECT json_build_object('organization_id', p.organization_id,
  'site_id', s.id, 'form_version_id', f.id, 'definition', f.definition)::text
FROM fieldmaps.projects p
JOIN fieldmaps.sites s ON s.project_id = p.id AND s.code = :site
JOIN fieldmaps.form_versions f ON f.project_id = p.id AND f.code = :form
WHERE p.id = :project AND fieldmaps_private.has_project_role(p.id, ARRAY['manager'])
""")

NEXT_PACKAGE_VERSION: Final = text("""
SELECT coalesce(max(version), 0) + 1 FROM fieldmaps.site_packages
WHERE project_id = :project AND site_id = :site
""")

INSERT_PACKAGE: Final = text("""
INSERT INTO fieldmaps.site_packages (id, organization_id, project_id, site_id, form_version_id,
  version, state, manifest, archive, archive_sha256, prepared_by)
VALUES (:id, :organization, :project, :site, :form, :version, :state,
  CAST(:manifest AS jsonb), :archive, :digest, :user_id)
RETURNING prepared_at
""")

INSERT_PACKAGE_CHECK: Final = text("""
INSERT INTO fieldmaps.package_checks (package_id, position, step, state, detail)
VALUES (:package, :position, :step, :state, :detail)
""")

PACKAGES: Final = text("""
SELECT json_build_object('package_id', k.id, 'site_code', s.code, 'form_version', f.code,
  'version', k.version, 'state', k.state, 'archive_bytes', octet_length(k.archive),
  'archive_sha256', k.archive_sha256, 'prepared_at', k.prepared_at)::text
FROM fieldmaps.site_packages k
JOIN fieldmaps.sites s ON s.id = k.site_id
JOIN fieldmaps.form_versions f ON f.id = k.form_version_id
WHERE k.project_id = :project
  AND (CAST(:site AS text) IS NULL OR s.code = CAST(:site AS text))
ORDER BY s.code, k.version DESC
""")

PACKAGE_DETAIL: Final = text("""
SELECT json_build_object('package_id', k.id, 'site_code', s.code, 'form_version', f.code,
  'version', k.version, 'state', k.state, 'archive_bytes', octet_length(k.archive),
  'archive_sha256', k.archive_sha256, 'prepared_at', k.prepared_at, 'manifest', k.manifest,
  'checks', coalesce((SELECT json_agg(json_build_object('step', c.step, 'state', c.state,
      'detail', c.detail) ORDER BY c.position)
    FROM fieldmaps.package_checks c WHERE c.package_id = k.id), '[]'::json))::text
FROM fieldmaps.site_packages k
JOIN fieldmaps.sites s ON s.id = k.site_id
JOIN fieldmaps.form_versions f ON f.id = k.form_version_id
WHERE k.project_id = :project AND k.id = :id
""")

PACKAGE_ARCHIVE: Final = text("""
SELECT archive, archive_sha256, state FROM fieldmaps.site_packages
WHERE project_id = :project AND id = :id
""")
