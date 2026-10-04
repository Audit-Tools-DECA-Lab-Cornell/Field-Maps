from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.queries import tenancy as q
from fieldmaps_api.repositories import tenancy as db
from fieldmaps_api.tenancy_schemas import (
    Organization,
    OrganizationCreate,
    OrganizationPatch,
    Project,
    ProjectCreate,
    ProjectPatch,
)


async def list_projects(session: AsyncSession) -> list[Project]:
    return await db.list_projects(session)


async def create_organization(session: AsyncSession, payload: OrganizationCreate) -> Organization:
    return await db.one(
        session,
        q.CREATE_ORG,
        Organization,
        {
            "name": payload.name,
            "slug": payload.slug,
            "project_name": payload.project.name,
            "project_code": payload.project.code,
            "timezone": payload.project.timezone,
        },
    )


async def create_project(session: AsyncSession, org: UUID, payload: ProjectCreate) -> Project:
    identifier = await db.identifier(
        session,
        q.CREATE_PROJECT,
        {
            "id": org,
            "name": payload.name,
            "code": payload.code,
            "timezone": payload.timezone,
        },
    )
    return await db.one(session, q.PROJECT, Project, {"id": identifier})


async def patch_organization(
    session: AsyncSession, org: UUID, payload: OrganizationPatch
) -> Organization:
    await db.require_manager(session, q.ORG_MANAGER, org)
    await db.execute(session, q.PATCH_ORG, {"id": org, "name": payload.name, "slug": payload.slug})
    return await db.one(session, q.ORG, Organization, {"id": org})


async def patch_project(session: AsyncSession, project: UUID, payload: ProjectPatch) -> Project:
    await db.require_manager(session, q.PROJECT_MANAGER, project)
    await db.execute(
        session,
        q.PATCH_PROJECT,
        {
            "id": project,
            "name": payload.name,
            "description": payload.description,
            "timezone": payload.timezone,
            "status": payload.status,
            "has_description": "description" in payload.model_fields_set,
        },
    )
    return await db.one(session, q.PROJECT, Project, {"id": project})


async def organizations(session: AsyncSession) -> list[Organization]:
    return await db.rows(session, q.ORGS, Organization)


async def organization(session: AsyncSession, org: UUID) -> Organization:
    await db.require_manager(session, q.ORG_MANAGER, org)
    return await db.one(session, q.ORG, Organization, {"id": org})


async def project(session: AsyncSession, project_id: UUID) -> Project:
    return await db.one(session, q.PROJECT, Project, {"id": project_id})


async def organization_projects(session: AsyncSession, org: UUID) -> list[Project]:
    await db.one(session, q.ORG, Organization, {"id": org})
    return await db.rows(session, q.ORG_PROJECTS, Project, {"id": org})
