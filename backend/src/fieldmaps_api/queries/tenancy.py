from typing import Final

from sqlalchemy import text

PROJECTS: Final = text("""
SELECT json_build_object('project_id', p.id, 'organization_id', p.organization_id,
  'name', p.name, 'role', CASE WHEN fieldmaps_private.has_org_role(
    p.organization_id, ARRAY['owner','admin']) THEN 'manager' ELSE m.role END)::text
FROM fieldmaps.projects p LEFT JOIN fieldmaps.project_memberships m
  ON m.project_id = p.id AND m.user_id = fieldmaps.request_user_id()
WHERE p.id IN (SELECT fieldmaps_private.my_project_ids())
ORDER BY p.name, p.id
""")
