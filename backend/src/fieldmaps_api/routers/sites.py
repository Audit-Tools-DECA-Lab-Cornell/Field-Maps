from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Path, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldmaps_api.deps import Authentication, user_transaction
from fieldmaps_api.domain.packages import PackageSubmission
from fieldmaps_api.errors import ERROR_RESPONSES
from fieldmaps_api.schemas import PackageDetail, PackageSummary
from fieldmaps_api.services import sites as site_service
from fieldmaps_api.services.sites import (
    get_package,
    list_packages,
    prepare_package,
    read_package_archive,
)
from fieldmaps_api.site_schemas import Site, SiteCreate, SitePatch

type SiteCode = Annotated[str, Path(min_length=1, max_length=100)]


def create_router(
    sessions: async_sessionmaker[AsyncSession], authenticate: Authentication
) -> APIRouter:
    router = APIRouter(responses=ERROR_RESPONSES)

    @router.get("/v1/projects/{project_id}/sites", operation_id="listSites")
    async def site_list(
        project_id: UUID, user_id: Annotated[UUID, Depends(authenticate)]
    ) -> list[Site]:
        """List the project's sites with their current package, zones and observation count."""
        async with user_transaction(sessions, user_id) as session:
            return await site_service.list_sites(session, project_id)

    @router.post("/v1/projects/{project_id}/sites", status_code=201, operation_id="createSite")
    async def site_create(
        project_id: UUID,
        payload: SiteCreate,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> Site:
        """Add a site to the project. Its map arrives later, as a package prepared for its code."""
        async with user_transaction(sessions, user_id) as session:
            return await site_service.create_site(session, project_id, payload)

    @router.get("/v1/projects/{project_id}/sites/{site_code}", operation_id="getSite")
    async def site_detail(
        project_id: UUID,
        site_code: SiteCode,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> Site:
        async with user_transaction(sessions, user_id) as session:
            return await site_service.get_site(session, project_id, site_code)

    @router.patch("/v1/projects/{project_id}/sites/{site_code}", operation_id="updateSite")
    async def site_update(
        project_id: UUID,
        site_code: SiteCode,
        payload: SitePatch,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> Site:
        async with user_transaction(sessions, user_id) as session:
            return await site_service.update_site(session, project_id, site_code, payload)

    @router.post(
        "/v1/projects/{project_id}/packages",
        status_code=201,
        operation_id="preparePackage",
    )
    async def prepare(
        project_id: UUID,
        submission: PackageSubmission,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> PackageDetail:
        """Prepare a site package from a QGIS export, and record what every check found."""
        async with user_transaction(sessions, user_id) as session:
            return await prepare_package(session, project_id, user_id, submission)

    @router.get(
        "/v1/projects/{project_id}/packages",
        operation_id="listPackages",
    )
    async def packages(
        project_id: UUID,
        user_id: Annotated[UUID, Depends(authenticate)],
        site: Annotated[str | None, Query(max_length=100)] = None,
    ) -> list[PackageSummary]:
        async with user_transaction(sessions, user_id) as session:
            return await list_packages(session, project_id, site)

    @router.get(
        "/v1/projects/{project_id}/packages/{package_id}",
        operation_id="getPackage",
    )
    async def package(
        project_id: UUID,
        package_id: UUID,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> PackageDetail:
        async with user_transaction(sessions, user_id) as session:
            return await get_package(session, project_id, package_id)

    @router.get(
        "/v1/projects/{project_id}/packages/{package_id}/archive",
        operation_id="downloadPackageArchive",
        response_class=Response,
        response_model=None,
        responses={
            200: {
                "description": "Prepared package archive",
                "content": {"application/zip": {"schema": {"type": "string", "format": "binary"}}},
                "headers": {
                    "ETag": {"schema": {"type": "string"}, "description": "Quoted SHA-256 digest"},
                    "Content-Disposition": {"schema": {"type": "string"}},
                },
            }
        },
    )
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
