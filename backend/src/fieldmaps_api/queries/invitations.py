from typing import Final

from sqlalchemy import text

INVITATION_SELECT: Final = """SELECT json_build_object(
'id', id, 'organization_id', organization_id, 'project_id', project_id,
'role', role, 'email', email, 'max_uses', max_uses, 'use_count', use_count,
'expires_at', expires_at, 'created_at', created_at, 'revoked_at', revoked_at)::text
FROM fieldmaps.invitations WHERE organization_id = :org
AND project_id IS NOT DISTINCT FROM CAST(:project AS uuid)"""
LIST: Final = text(INVITATION_SELECT + " ORDER BY created_at, id")
ONE: Final = text(INVITATION_SELECT + " AND id = :id")
CREATE: Final = text("""SELECT fieldmaps_private.create_invitation(
:org, :project, :role, :email, :max_uses, :expires_in, :token_hash, :code_hash)""")
REVOKE: Final = text("SELECT fieldmaps_private.revoke_invitation(:org, :project, :id)")
PREVIEW: Final = text("SELECT fieldmaps_private.preview_invitation(:token_hash, :code_hash)::text")
REDEEM: Final = text("SELECT fieldmaps_private.redeem_invitation(:token_hash, :code_hash)::text")
