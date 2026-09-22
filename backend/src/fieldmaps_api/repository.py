import json
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from hashlib import sha256
from typing import ClassVar
from uuid import UUID, uuid4

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, TypeAdapter
from sqlalchemy import Result, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldmaps_api import queries
from fieldmaps_api.forms import AnswerError, FormDefinition, validate_answers
from fieldmaps_api.packages import PackageError, PackageSubmission, prepare
from fieldmaps_api.schemas import (
    ObservationUpload,
    PackageDetail,
    PackageSummary,
    ProjectAccess,
    StoredObservation,
    UploadReceipt,
)


class UploadTarget(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    organization_id: UUID
    site_id: UUID
    form_version_id: UUID
    definition: FormDefinition


PACKAGE_LIST = TypeAdapter(list[PackageSummary])


@asynccontextmanager
async def user_transaction(
    sessions: async_sessionmaker[AsyncSession],
    user_id: UUID,
) -> AsyncGenerator[AsyncSession]:
    async with sessions.begin() as session:
        await session.execute(
            text("SELECT set_config('fieldmaps.user_id', :user_id, true)"),
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
    try:
        answers = validate_answers(target.definition, payload.answers)
    except AnswerError as error:
        raise HTTPException(422, str(error)) from error
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
            "answers": json.dumps(answers, sort_keys=True),
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


async def prepare_package(
    session: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    submission: PackageSubmission,
) -> PackageDetail:
    """Prepare a submission and record it, whether every check passed or one of them blocked.

    A blocked package is stored rather than discarded: the reasons are the useful part, and a
    manager who comes back tomorrow needs to read why the imagery was refused, not re-run it.
    """
    target_result: Result[tuple[str]] = await session.execute(
        queries.PACKAGE_TARGET,
        {"project": project_id, "site": submission.site_code, "form": submission.form_version},
    )
    target_json = target_result.scalar_one_or_none()
    if target_json is None:
        raise HTTPException(
            403, "Only a manager of this project, site and form may prepare a package"
        )
    target = UploadTarget.model_validate_json(target_json)
    try:
        prepared = prepare(submission)
    except PackageError as error:
        raise HTTPException(422, str(error)) from error

    version_result: Result[tuple[int]] = await session.execute(
        queries.NEXT_PACKAGE_VERSION, {"project": project_id, "site": target.site_id}
    )
    version = version_result.scalar_one()
    package_id = uuid4()
    try:
        await session.execute(
            queries.INSERT_PACKAGE,
            {
                "id": package_id,
                "organization": target.organization_id,
                "project": project_id,
                "site": target.site_id,
                "form": target.form_version_id,
                "version": version,
                "state": "blocked" if prepared.blocked else "ready",
                "manifest": prepared.manifest.model_dump_json(),
                "archive": prepared.archive,
                "digest": prepared.archive_sha256,
                "user_id": user_id,
            },
        )
        for position, check in enumerate(prepared.checks):
            await session.execute(
                queries.INSERT_PACKAGE_CHECK,
                {
                    "package": package_id,
                    "position": position,
                    "step": check.step,
                    "state": check.state,
                    "detail": check.detail,
                },
            )
    except IntegrityError as error:
        # Two managers preparing the same site at once; the version is taken.
        raise HTTPException(409, "Another package was prepared for this site; try again") from error

    return await get_package(session, project_id, package_id)


async def list_packages(
    session: AsyncSession, project_id: UUID, site_code: str | None
) -> list[PackageSummary]:
    result: Result[tuple[str]] = await session.execute(
        queries.PACKAGES, {"project": project_id, "site": site_code}
    )
    return [PackageSummary.model_validate_json(row) for row in result.scalars()]


async def get_package(session: AsyncSession, project_id: UUID, package_id: UUID) -> PackageDetail:
    result: Result[tuple[str]] = await session.execute(
        queries.PACKAGE_DETAIL, {"project": project_id, "id": package_id}
    )
    data = result.scalar_one_or_none()
    if data is None:
        raise HTTPException(404, "Package not found")
    return PackageDetail.model_validate_json(data)


async def read_package_archive(
    session: AsyncSession, project_id: UUID, package_id: UUID
) -> tuple[bytes, str]:
    """Read the archive bytes, refusing a package whose checks blocked it."""
    result: Result[tuple[bytes, str, str]] = await session.execute(
        queries.PACKAGE_ARCHIVE, {"project": project_id, "id": package_id}
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(404, "Package not found")
    archive, digest, state = row.tuple()
    if state != "ready":
        raise HTTPException(
            409, "This package was blocked during preparation and cannot be downloaded"
        )
    return archive, digest
