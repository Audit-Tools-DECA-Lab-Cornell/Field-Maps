from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldmaps_api.deps import Authentication, user_transaction
from fieldmaps_api.errors import ERROR_RESPONSES
from fieldmaps_api.services import members as member_service
from fieldmaps_api.services import tenancy as service
from fieldmaps_api.tenancy_schemas import (
    Organization,
    OrganizationCreate,
    OrganizationMember,
    OrganizationPatch,
    OrgRolePatch,
    OwnershipTransfer,
)


def create_router(
    sessions: async_sessionmaker[AsyncSession], authenticate: Authentication
) -> APIRouter:
    router = APIRouter(responses=ERROR_RESPONSES)

    @router.post("/v1/orgs", operation_id="createOrganization", status_code=201)
    async def create(
        payload: OrganizationCreate, user: Annotated[UUID, Depends(authenticate)]
    ) -> Organization:
        async with user_transaction(sessions, user) as session:
            return await service.create_organization(session, payload)

    @router.get("/v1/orgs", operation_id="listOrganizations")
    async def listing(user: Annotated[UUID, Depends(authenticate)]) -> list[Organization]:
        async with user_transaction(sessions, user) as session:
            return await service.organizations(session)

    @router.get("/v1/orgs/{org}", operation_id="getOrganization")
    async def detail(org: UUID, user: Annotated[UUID, Depends(authenticate)]) -> Organization:
        async with user_transaction(sessions, user) as session:
            return await service.organization(session, org)

    @router.patch("/v1/orgs/{org}", operation_id="updateOrganization")
    async def patch(
        org: UUID, payload: OrganizationPatch, user: Annotated[UUID, Depends(authenticate)]
    ) -> Organization:
        async with user_transaction(sessions, user) as session:
            return await service.patch_organization(session, org, payload)

    @router.get("/v1/orgs/{org}/members", operation_id="listOrganizationMembers")
    async def members(
        org: UUID, user: Annotated[UUID, Depends(authenticate)]
    ) -> list[OrganizationMember]:
        async with user_transaction(sessions, user) as session:
            return await member_service.organization_members(session, org)

    @router.patch(
        "/v1/orgs/{org}/members/{member}",
        operation_id="setOrganizationRole",
        status_code=204,
        response_class=Response,
    )
    async def set_role(
        org: UUID, member: UUID, payload: OrgRolePatch, user: Annotated[UUID, Depends(authenticate)]
    ) -> Response:
        async with user_transaction(sessions, user) as session:
            await member_service.set_org_role(session, org, member, payload.role)
        return Response(status_code=204)

    @router.delete(
        "/v1/orgs/{org}/members/{member}",
        operation_id="removeOrganizationMember",
        status_code=204,
        response_class=Response,
    )
    async def remove(
        org: UUID, member: UUID, user: Annotated[UUID, Depends(authenticate)]
    ) -> Response:
        async with user_transaction(sessions, user) as session:
            await member_service.remove_org_member(session, org, member)
        return Response(status_code=204)

    @router.post(
        "/v1/orgs/{org}/transfer-ownership",
        operation_id="transferOrganizationOwnership",
        status_code=204,
        response_class=Response,
    )
    async def transfer(
        org: UUID, payload: OwnershipTransfer, user: Annotated[UUID, Depends(authenticate)]
    ) -> Response:
        async with user_transaction(sessions, user) as session:
            await member_service.transfer_ownership(session, org, payload.user_id)
        return Response(status_code=204)

    return router
