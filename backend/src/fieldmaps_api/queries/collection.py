from typing import Final

from sqlalchemy import text

UPLOAD_TARGET: Final = text("""
SELECT json_build_object('organization_id', p.organization_id,
  'site_id', s.id, 'form_version_id', f.id, 'definition', f.definition)::text
FROM fieldmaps.projects p
JOIN fieldmaps.sites s ON s.project_id = p.id AND s.code = :site
JOIN fieldmaps.form_versions f ON f.project_id = p.id AND f.code = :form
WHERE p.id = :project
  AND fieldmaps_private.has_project_role(p.id, ARRAY['observer','manager'])
""")

INSERT_OBSERVATION: Final = text("""
INSERT INTO fieldmaps.observations (id, organization_id, project_id, site_id, form_version_id,
  observer_code, observed_at, geom, answers, created_by, upload_hash)
VALUES (:id, :organization, :project, :site, :form, :observer, :observed_at,
  fieldmaps.make_point(:longitude, :latitude),
  CAST(:answers AS jsonb), :user_id, :fingerprint)
ON CONFLICT (id) DO NOTHING RETURNING id
""")

RECEIPT: Final = text("""
SELECT json_build_object('observation_id', id, 'project_id', project_id,
  'user_id', created_by, 'accepted_revision', 1, 'received_at', received_at)::text
FROM fieldmaps.observations
WHERE id = :id AND project_id = :project AND created_by = :user_id AND upload_hash = :fingerprint
""")

OBSERVATION: Final = text("""
SELECT json_build_object('observation_id', id, 'project_id', project_id,
  'observer', observer_code, 'coordinates',
  json_build_array(fieldmaps.longitude(geom), fieldmaps.latitude(geom)),
  'answers', answers, 'observed_at', observed_at, 'revision', revision)::text
FROM fieldmaps.observations WHERE id = :id AND project_id = :project AND deleted_at IS NULL
""")
