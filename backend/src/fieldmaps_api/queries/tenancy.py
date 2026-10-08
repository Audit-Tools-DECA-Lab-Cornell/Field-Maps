from typing import Final

from sqlalchemy import text

PROJECT_SELECT: Final = """
SELECT json_build_object('project_id', p.id, 'organization_id', p.organization_id,
 'name', p.name, 'code', p.code, 'description', p.description, 'timezone', p.timezone,
 'status', p.status, 'is_training', p.is_training, 'role', CASE WHEN
 fieldmaps_private.has_org_role(p.organization_id, ARRAY['owner','admin'])
 THEN 'manager' ELSE m.role END)::text
FROM fieldmaps.projects p LEFT JOIN fieldmaps.project_memberships m
 ON m.project_id = p.id AND m.user_id = fieldmaps.request_user_id()
WHERE p.id IN (SELECT fieldmaps_private.my_project_ids())
"""
PROJECTS: Final = text(PROJECT_SELECT + " ORDER BY p.name, p.id")
PROJECT: Final = text(PROJECT_SELECT + " AND p.id = :id")
ORG_PROJECTS: Final = text(PROJECT_SELECT + " AND p.organization_id = :id ORDER BY p.name, p.id")
ORGS: Final = text("SELECT row_to_json(o)::text FROM fieldmaps.organizations o ORDER BY name, id")
ORG: Final = text("SELECT row_to_json(o)::text FROM fieldmaps.organizations o WHERE id = :id")
CREATE_ORG: Final = text("""SELECT row_to_json(o)::text FROM
 fieldmaps_private.create_organization(:name, :slug, :project_name, :project_code, :timezone) o""")
CREATE_PROJECT: Final = text("""SELECT id FROM
 fieldmaps_private.create_project(:id, :name, :code, :timezone)""")
PATCH_ORG: Final = text("""UPDATE fieldmaps.organizations SET
 name = coalesce(:name, name), slug = coalesce(:slug, slug) WHERE id = :id""")
PATCH_PROJECT: Final = text("""UPDATE fieldmaps.projects SET
 name = coalesce(:name, name), timezone = coalesce(:timezone, timezone),
 status = coalesce(:status, status), description = CASE WHEN :has_description
 THEN :description ELSE description END WHERE id = :id""")
# Members with the name and observer code their profile shows the caller (RLS: managers see their
# collaborators' profiles), so a team list names people rather than listing account ids.
ORG_MEMBERS: Final = text("""SELECT (to_jsonb(m) || jsonb_build_object(
 'display_name', p.display_name, 'observer_initials', p.observer_initials))::text
 FROM fieldmaps.organization_members m LEFT JOIN fieldmaps.profiles p ON p.user_id = m.user_id
 WHERE m.organization_id = :id ORDER BY m.granted_at, m.user_id""")
PROJECT_MEMBERS: Final = text("""SELECT (to_jsonb(m) || jsonb_build_object(
 'display_name', p.display_name, 'observer_initials', p.observer_initials))::text
 FROM fieldmaps.project_memberships m LEFT JOIN fieldmaps.profiles p ON p.user_id = m.user_id
 WHERE m.project_id = :id ORDER BY m.granted_at, m.user_id""")
ORG_MANAGER: Final = text("SELECT fieldmaps_private.has_org_role(:id, ARRAY['owner','admin'])")
PROJECT_MANAGER: Final = text("SELECT fieldmaps_private.has_project_role(:id, ARRAY['manager'])")
SET_ORG_ROLE: Final = text("SELECT fieldmaps_private.set_org_role(:id, :user, :role)")
REMOVE_ORG_MEMBER: Final = text("SELECT fieldmaps_private.remove_org_member(:id, :user)")
TRANSFER: Final = text("SELECT fieldmaps_private.transfer_ownership(:id, :user)")
SET_PROJECT_ROLE: Final = text("SELECT fieldmaps_private.set_project_role(:id, :user, :role)")
REMOVE_PROJECT_MEMBER: Final = text("SELECT fieldmaps_private.remove_project_member(:id, :user)")
