from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from hashlib import sha256
from typing import ClassVar
from uuid import UUID

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import Result, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldops_api import queries
from fieldops_api.schemas import ObservationUpload, ProjectAccess, StoredObservation, UploadReceipt


class UploadTarget(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    organization_id: UUID
    site_id: UUID
    form_version_id: UUID


@asynccontextmanager
async def user_transaction(
    sessions: async_sessionmaker[AsyncSession],
    user_id: UUID,
) -> AsyncGenerator[AsyncSession]:
    async with sessions.begin() as session:
        await session.execute(
            text("SELECT set_config('fieldops.user_id', :user_id, true)"),
            {"user_id": str(user_id)},
        )
        yield session


async def list_projects(session: AsyncSession) -> list[ProjectAccess]:
    result: Result[tuple[str]] = await session.execute(queries.PROJECTS)
    return [ProjectAccess.model_validate_json(row) for row in result.scalars()]


async def upload_observation(
    session: AsyncSession,
    project_id: UUID,
    observation_id: UUID,
    user_id: UUID,
    payload: ObservationUpload,
) -> UploadReceipt:
    target_result: Result[tuple[str]] = await session.execute(
        queries.UPLOAD_TARGET,
        {"project": project_id, "site": payload.site_id, "form": payload.form_version},
    )
    target_json = target_result.scalar_one_or_none()
    if target_json is None:
        raise HTTPException(403, "You cannot upload to this project, site, or form")
    target = UploadTarget.model_validate_json(target_json)
    fingerprint = sha256(payload.model_dump_json().encode()).hexdigest()
    await session.execute(
        queries.INSERT_OBSERVATION,
        {
            "id": observation_id,
            "organization": target.organization_id,
            "project": project_id,
            "site": target.site_id,
            "form": target.form_version_id,
            "observer": payload.observer,
            "observed_at": payload.observed_at,
            "longitude": payload.coordinates[0],
            "latitude": payload.coordinates[1],
            "answers": payload.model_dump_json(include={"people", "notes"}),
            "user_id": user_id,
            "fingerprint": fingerprint,
        },
    )
    receipt_result: Result[tuple[str]] = await session.execute(
        queries.RECEIPT,
        {
            "id": observation_id,
            "project": project_id,
            "user_id": user_id,
            "fingerprint": fingerprint,
        },
    )
    receipt_json = receipt_result.scalar_one_or_none()
    if receipt_json is None:
        raise HTTPException(409, "This observation ID already exists with a different upload")
    return UploadReceipt.model_validate_json(receipt_json)


async def get_observation(
    session: AsyncSession,
    project_id: UUID,
    observation_id: UUID,
) -> StoredObservation:
    result: Result[tuple[str]] = await session.execute(
        queries.OBSERVATION,
        {"id": observation_id, "project": project_id},
    )
    data = result.scalar_one_or_none()
    if data is None:
        raise HTTPException(404, "Observation not found")
    return StoredObservation.model_validate_json(data)
