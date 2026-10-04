from typing import Final

from sqlalchemy import text

ENSURE_PROFILE: Final = text("""
SELECT row_to_json(p)::text FROM fieldmaps_private.ensure_profile(NULL) p
""")

ORGANIZATION_MEMBERSHIPS: Final = text("""
SELECT json_build_object('organization_id', o.id, 'slug', o.slug,
  'name', o.name, 'role', m.role)::text
FROM fieldmaps.organization_members m
JOIN fieldmaps.organizations o ON o.id = m.organization_id
WHERE m.user_id = fieldmaps.request_user_id() AND o.deleted_at IS NULL
ORDER BY o.name, o.id
""")

PROJECT_MEMBERSHIPS: Final = text("""
SELECT json_build_object('project_id', p.id, 'organization_id', p.organization_id,
  'code', p.code, 'name', p.name, 'is_training', p.is_training,
  'role', CASE WHEN fieldmaps_private.has_org_role(
    p.organization_id, ARRAY['owner','admin']) THEN 'manager' ELSE m.role END)::text
FROM fieldmaps.projects p LEFT JOIN fieldmaps.project_memberships m
  ON m.project_id = p.id AND m.user_id = fieldmaps.request_user_id()
WHERE p.id IN (SELECT fieldmaps_private.my_project_ids())
ORDER BY p.name, p.id
""")

UPDATE_PROFILE: Final = text("""
UPDATE fieldmaps.profiles SET
  display_name = CASE WHEN :set_display_name THEN :display_name ELSE display_name END,
  observer_initials = CASE WHEN :set_initials THEN :observer_initials ELSE observer_initials END,
  locale = CASE WHEN :set_locale THEN :locale ELSE locale END
WHERE user_id = fieldmaps.request_user_id() AND deleted_at IS NULL
RETURNING row_to_json(profiles)::text
""")
