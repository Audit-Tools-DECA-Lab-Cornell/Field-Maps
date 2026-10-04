import hashlib
import secrets
from datetime import timedelta
from typing import Final
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.invitation_schemas import (
    Invitation,
    InvitationCreated,
    InvitationCredential,
    InvitationPreview,
    InvitationRedeemed,
    OrgInvitationCreate,
    ProjectInvitationCreate,
)
from fieldmaps_api.queries import invitations as q
from fieldmaps_api.queries import tenancy as tenancy_q
from fieldmaps_api.repositories import tenancy as db
from fieldmaps_api.services import tenancy

ALPHABET: Final = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def credential_hashes(payload: InvitationCredential) -> db.Parameters:
    return {
        "token_hash": hashlib.sha256(payload.token.encode()).hexdigest() if payload.token else None,
        "code_hash": hashlib.sha256(payload.code.encode()).hexdigest() if payload.code else None,
    }


async def create(
    session: AsyncSession,
    org: UUID,
    project: UUID | None,
    payload: OrgInvitationCreate | ProjectInvitationCreate,
) -> InvitationCreated:
    token = secrets.token_urlsafe(32)
    code = "".join(secrets.choice(ALPHABET) for _ in range(8))
    identifier = await db.identifier(
        session,
        q.CREATE,
        {
            "org": org,
            "project": project,
            "role": payload.role,
            "email": payload.email,
            "max_uses": payload.max_uses,
            "expires_in": timedelta(days=payload.expires_in_days),
            "token_hash": hashlib.sha256(token.encode()).hexdigest(),
            "code_hash": hashlib.sha256(code.encode()).hexdigest(),
        },
    )
    invitation = await db.one(
        session,
        q.ONE,
        Invitation,
        {
            "org": org,
            "project": project,
            "id": identifier,
        },
    )
    return InvitationCreated.model_validate(
        {**invitation.model_dump(), "token": token, "code": code}
    )


async def create_project(
    session: AsyncSession, project: UUID, payload: ProjectInvitationCreate
) -> InvitationCreated:
    record = await tenancy.project(session, project)
    return await create(session, record.organization_id, project, payload)


async def list_org(session: AsyncSession, org: UUID) -> list[Invitation]:
    await db.require_manager(session, tenancy_q.ORG_MANAGER, org)
    return await db.rows(session, q.LIST, Invitation, {"org": org, "project": None})


async def list_project(session: AsyncSession, project: UUID) -> list[Invitation]:
    await db.require_manager(session, tenancy_q.PROJECT_MANAGER, project)
    record = await tenancy.project(session, project)
    return await db.rows(
        session, q.LIST, Invitation, {"org": record.organization_id, "project": project}
    )


async def revoke_org(session: AsyncSession, org: UUID, invitation: UUID) -> None:
    await db.execute(session, q.REVOKE, {"org": org, "project": None, "id": invitation})


async def revoke_project(session: AsyncSession, project: UUID, invitation: UUID) -> None:
    record = await tenancy.project(session, project)
    await db.execute(
        session, q.REVOKE, {"org": record.organization_id, "project": project, "id": invitation}
    )


async def preview(session: AsyncSession, payload: InvitationCredential) -> InvitationPreview:
    return await db.one(session, q.PREVIEW, InvitationPreview, credential_hashes(payload))


async def redeem(session: AsyncSession, payload: InvitationCredential) -> InvitationRedeemed:
    return await db.one(session, q.REDEEM, InvitationRedeemed, credential_hashes(payload))
