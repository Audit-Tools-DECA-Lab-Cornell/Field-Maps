from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldmaps_api.deps import Authentication, user_transaction
from fieldmaps_api.domain.packages import PackageSubmission
from fieldmaps_api.errors import ERROR_RESPONSES
from fieldmaps_api.schemas import PackageDetail, PackageSummary
from fieldmaps_api.services.sites import (
    get_package,
    list_packages,
    prepare_package,
    read_package_archive,
)


def create_router(
    sessions: async_sessionmaker[AsyncSession], authenticate: Authentication
) -> APIRouter:
    router = APIRouter(responses=ERROR_RESPONSES)

    @router.post("/v1/projects/{project_id}/packages", status_code=201)
    async def prepare(
        project_id: UUID,
        submission: PackageSubmission,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> PackageDetail:
        """Prepare a site package from a QGIS export, and record what every check found."""
        async with user_transaction(sessions, user_id) as session:
            return await prepare_package(session, project_id, user_id, submission)

    @router.get("/v1/projects/{project_id}/packages")
    async def packages(
        project_id: UUID,
        user_id: Annotated[UUID, Depends(authenticate)],
        site: Annotated[str | None, Query(max_length=100)] = None,
    ) -> list[PackageSummary]:
        async with user_transaction(sessions, user_id) as session:
            return await list_packages(session, project_id, site)

    @router.get("/v1/projects/{project_id}/packages/{package_id}")
    async def package(
        project_id: UUID,
        package_id: UUID,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> PackageDetail:
        async with user_transaction(sessions, user_id) as session:
            return await get_package(session, project_id, package_id)

    @router.get("/v1/projects/{project_id}/packages/{package_id}/archive")
    async def archive(
        project_id: UUID,
        package_id: UUID,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> Response:
        """Hand over the package itself, for a device about to carry it into the field."""
        async with user_transaction(sessions, user_id) as session:
            payload, digest = await read_package_archive(session, project_id, package_id)
        return Response(
            payload,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="package-{package_id}.zip"',
                # The digest the manifest was stored with, so a device can verify what it fetched.
                "ETag": f'"{digest}"',
            },
        )

    return router
