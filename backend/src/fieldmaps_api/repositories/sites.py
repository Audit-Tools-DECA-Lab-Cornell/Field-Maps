from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.domain.packages import PackageSubmission, PreparationCheck
from fieldmaps_api.queries import sites as queries
from fieldmaps_api.schemas import PackageDetail, PackageSummary, UploadTarget

if TYPE_CHECKING:
    from sqlalchemy import Result


@dataclass(frozen=True, slots=True)
class PackageWrite:
    package_id: UUID
    project_id: UUID
    user_id: UUID
    target: UploadTarget
    version: int
    state: Literal["blocked", "ready"]
    manifest_json: str
    archive: bytes
    digest: str
    checks: tuple[PreparationCheck, ...]


async def package_target(
    session: AsyncSession, project_id: UUID, submission: PackageSubmission
) -> UploadTarget | None:
    result: Result[tuple[str]] = await session.execute(
        queries.PACKAGE_TARGET,
        {"project": project_id, "site": submission.site_code, "form": submission.form_version},
    )
    data = result.scalar_one_or_none()
    return None if data is None else UploadTarget.model_validate_json(data)


async def next_package_version(session: AsyncSession, project_id: UUID, site_id: UUID) -> int:
    result: Result[tuple[int]] = await session.execute(
        queries.NEXT_PACKAGE_VERSION, {"project": project_id, "site": site_id}
    )
    return result.scalar_one()


async def insert_package(session: AsyncSession, package: PackageWrite) -> None:
    await session.execute(
        queries.INSERT_PACKAGE,
        {
            "id": package.package_id,
            "organization": package.target.organization_id,
            "project": package.project_id,
            "site": package.target.site_id,
            "form": package.target.form_version_id,
            "version": package.version,
            "state": package.state,
            "manifest": package.manifest_json,
            "archive": package.archive,
            "digest": package.digest,
            "user_id": package.user_id,
        },
    )
    for position, check in enumerate(package.checks):
        await session.execute(
            queries.INSERT_PACKAGE_CHECK,
            {
                "package": package.package_id,
                "position": position,
                "step": check.step,
                "state": check.state,
                "detail": check.detail,
            },
        )


async def list_packages(
    session: AsyncSession, project_id: UUID, site_code: str | None
) -> list[PackageSummary]:
    result: Result[tuple[str]] = await session.execute(
        queries.PACKAGES, {"project": project_id, "site": site_code}
    )
    return [PackageSummary.model_validate_json(row) for row in result.scalars()]


async def get_package(
    session: AsyncSession, project_id: UUID, package_id: UUID
) -> PackageDetail | None:
    result: Result[tuple[str]] = await session.execute(
        queries.PACKAGE_DETAIL, {"project": project_id, "id": package_id}
    )
    data = result.scalar_one_or_none()
    return None if data is None else PackageDetail.model_validate_json(data)


async def read_package_archive(
    session: AsyncSession, project_id: UUID, package_id: UUID
) -> tuple[bytes, str, str] | None:
    result: Result[tuple[bytes, str, str]] = await session.execute(
        queries.PACKAGE_ARCHIVE, {"project": project_id, "id": package_id}
    )
    row = result.one_or_none()
    return None if row is None else row.tuple()
