from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldmaps_api.deps import Authentication, user_transaction
from fieldmaps_api.errors import ERROR_RESPONSES
from fieldmaps_api.schemas import ObservationUpload, StoredObservation, UploadReceipt
from fieldmaps_api.services.collection import get_observation, upload_observation


def create_router(
    sessions: async_sessionmaker[AsyncSession], authenticate: Authentication
) -> APIRouter:
    router = APIRouter(responses=ERROR_RESPONSES)

    @router.put("/v1/projects/{project_id}/observations/{observation_id}")
    async def upload(
        project_id: UUID,
        observation_id: UUID,
        payload: ObservationUpload,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> UploadReceipt:
        async with user_transaction(sessions, user_id) as session:
            receipt = await upload_observation(
                session, project_id, observation_id, user_id, payload
            )
        return receipt

    @router.get("/v1/projects/{project_id}/observations/{observation_id}")
    async def observation(
        project_id: UUID,
        observation_id: UUID,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> StoredObservation:
        async with user_transaction(sessions, user_id) as session:
            return await get_observation(session, project_id, observation_id)

    return router
