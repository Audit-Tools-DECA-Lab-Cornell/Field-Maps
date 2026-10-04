from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldmaps_api.deps import Authentication, user_transaction
from fieldmaps_api.errors import ERROR_RESPONSES
from fieldmaps_api.schemas import ProjectAccess
from fieldmaps_api.services.tenancy import list_projects


def create_router(
    sessions: async_sessionmaker[AsyncSession], authenticate: Authentication
) -> APIRouter:
    router = APIRouter(responses=ERROR_RESPONSES)

    @router.get("/v1/projects", operation_id="listProjects")
    async def projects(user_id: Annotated[UUID, Depends(authenticate)]) -> list[ProjectAccess]:
        async with user_transaction(sessions, user_id) as session:
            return await list_projects(session)

    return router
