from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.queries import tenancy as q
from fieldmaps_api.repositories import tenancy as db
from fieldmaps_api.tenancy_schemas import OrganizationMember, OrgRole, ProjectMember, ProjectRole


async def organization_members(session: AsyncSession, org: UUID) -> list[OrganizationMember]:
    await db.require_manager(session, q.ORG_MANAGER, org)
    return await db.rows(session, q.ORG_MEMBERS, OrganizationMember, {"id": org})


async def project_members(session: AsyncSession, project: UUID) -> list[ProjectMember]:
    await db.require_manager(session, q.PROJECT_MANAGER, project)
    return await db.rows(session, q.PROJECT_MEMBERS, ProjectMember, {"id": project})


async def set_org_role(session: AsyncSession, org: UUID, member: UUID, role: OrgRole) -> None:
    await db.execute(session, q.SET_ORG_ROLE, {"id": org, "user": member, "role": role})


async def remove_org_member(session: AsyncSession, org: UUID, member: UUID) -> None:
    await db.execute(session, q.REMOVE_ORG_MEMBER, {"id": org, "user": member})


async def transfer_ownership(session: AsyncSession, org: UUID, user: UUID) -> None:
    await db.execute(session, q.TRANSFER, {"id": org, "user": user})


async def set_project_role(
    session: AsyncSession, project: UUID, member: UUID, role: ProjectRole
) -> None:
    await db.execute(session, q.SET_PROJECT_ROLE, {"id": project, "user": member, "role": role})


async def remove_project_member(session: AsyncSession, project: UUID, member: UUID) -> None:
    await db.execute(session, q.REMOVE_PROJECT_MEMBER, {"id": project, "user": member})
