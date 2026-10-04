from uuid import UUID, uuid4

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.domain.packages import PackageError, PackageSubmission, prepare
from fieldmaps_api.errors import (
    ConflictError,
    NotFoundError,
    RoleRequiredError,
    ValidationFailedError,
)
from fieldmaps_api.repositories import sites
from fieldmaps_api.schemas import PackageDetail, PackageSummary
from fieldmaps_api.services.tenancy import project


async def prepare_package(
    session: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    submission: PackageSubmission,
) -> PackageDetail:
    """Store preparation results, including blocked packages and their failed checks."""
    target = await sites.package_target(session, project_id, submission)
    if target is None:
        message = "Only a manager of this project, site and form may prepare a package"
        raise RoleRequiredError(message)
    try:
        prepared = prepare(submission)
    except PackageError as error:
        raise ValidationFailedError(str(error)) from error
    version = await sites.next_package_version(session, project_id, target.site_id)
    package_id = uuid4()
    package = sites.PackageWrite(
        package_id=package_id,
        project_id=project_id,
        user_id=user_id,
        target=target,
        version=version,
        state="blocked" if prepared.blocked else "ready",
        manifest_json=prepared.manifest.model_dump_json(),
        archive=prepared.archive,
        digest=prepared.archive_sha256,
        checks=prepared.checks,
    )
    try:
        await sites.insert_package(session, package)
    except IntegrityError as error:
        message = "Another package was prepared for this site; try again"
        raise ConflictError(message) from error
    return await get_package(session, project_id, package_id)


async def list_packages(
    session: AsyncSession, project_id: UUID, site_code: str | None
) -> list[PackageSummary]:
    await project(session, project_id)
    return await sites.list_packages(session, project_id, site_code)


async def get_package(session: AsyncSession, project_id: UUID, package_id: UUID) -> PackageDetail:
    package = await sites.get_package(session, project_id, package_id)
    if package is None:
        message = "Package not found"
        raise NotFoundError(message)
    return package


async def read_package_archive(
    session: AsyncSession, project_id: UUID, package_id: UUID
) -> tuple[bytes, str]:
    result = await sites.read_package_archive(session, project_id, package_id)
    if result is None:
        message = "Package not found"
        raise NotFoundError(message)
    archive, digest, state = result
    if state != "ready":
        message = "This package was blocked during preparation and cannot be downloaded"
        raise ConflictError(message)
    return archive, digest
