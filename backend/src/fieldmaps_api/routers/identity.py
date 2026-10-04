from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldmaps_api.deps import Authentication, user_transaction
from fieldmaps_api.errors import ERROR_RESPONSES
from fieldmaps_api.identity_schemas import Identity, Profile, ProfilePatch
from fieldmaps_api.services.identity import get_identity, patch_profile


def create_router(
    sessions: async_sessionmaker[AsyncSession], authenticate: Authentication
) -> APIRouter:
    router = APIRouter(responses=ERROR_RESPONSES)

    @router.get("/v1/me", operation_id="get_identity")
    async def me(user_id: Annotated[UUID, Depends(authenticate)]) -> Identity:
        async with user_transaction(sessions, user_id) as session:
            return await get_identity(session)

    @router.patch("/v1/me", operation_id="update_profile")
    async def update_me(
        patch: ProfilePatch, user_id: Annotated[UUID, Depends(authenticate)]
    ) -> Profile:
        async with user_transaction(sessions, user_id) as session:
            return await patch_profile(session, patch)

    return router
