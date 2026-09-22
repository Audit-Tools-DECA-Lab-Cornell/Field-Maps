from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, Query, Request, Response
from fastapi.responses import JSONResponse
from jwt import PyJWKClient
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from fieldmaps_api.auth import Authentication, JwksVerifier, TokenVerifier, UnconfiguredVerifier
from fieldmaps_api.config import Settings, read_local_settings
from fieldmaps_api.database import database_connection
from fieldmaps_api.packages import PackageSubmission
from fieldmaps_api.repository import (
    get_observation,
    get_package,
    list_packages,
    list_projects,
    prepare_package,
    read_package_archive,
    upload_observation,
    user_transaction,
)
from fieldmaps_api.schemas import (
    ObservationUpload,
    PackageDetail,
    PackageSummary,
    ProjectAccess,
    StoredObservation,
    UploadReceipt,
)


def create_app(
    settings: Settings | None = None,
    verifier: TokenVerifier | None = None,
) -> FastAPI:
    configuration = settings or Settings()
    connection = database_connection(configuration)
    engine = create_async_engine(
        connection.url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=0,
        connect_args={"ssl": connection.ssl} if connection.ssl is not None else {},
    )
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    if verifier is None:
        if configuration.issuer is not None and configuration.jwks_url is not None:
            verifier = JwksVerifier(
                str(configuration.issuer).rstrip("/"),
                configuration.audience,
                PyJWKClient(str(configuration.jwks_url), timeout=5, lifespan=300),
            )
        else:
            verifier = UnconfiguredVerifier()
    authenticate = Authentication(verifier)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
        yield
        await engine.dispose()

    app = FastAPI(title="FieldMaps API", version="0.1.0", lifespan=lifespan)

    @app.exception_handler(SQLAlchemyError)
    async def database_error(_request: Request, _error: SQLAlchemyError) -> JSONResponse:
        return JSONResponse(status_code=503, content={"detail": "Storage unavailable; retry later"})

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "running"}

    @app.get("/v1/projects")
    async def projects(user_id: Annotated[UUID, Depends(authenticate)]) -> list[ProjectAccess]:
        async with user_transaction(sessions, user_id) as session:
            return await list_projects(session)

    @app.put("/v1/projects/{project_id}/observations/{observation_id}")
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

    @app.get("/v1/projects/{project_id}/observations/{observation_id}")
    async def observation(
        project_id: UUID,
        observation_id: UUID,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> StoredObservation:
        async with user_transaction(sessions, user_id) as session:
            return await get_observation(session, project_id, observation_id)

    register_package_routes(app, sessions, authenticate)

    return app




def register_package_routes(
    app: FastAPI,
    sessions: async_sessionmaker[AsyncSession],
    authenticate: Authentication,
) -> None:
    """Site packages: preparing one, listing them, and handing the archive to a device."""
    @app.post("/v1/projects/{project_id}/packages", status_code=201)
    async def prepare(
        project_id: UUID,
        submission: PackageSubmission,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> PackageDetail:
        """Prepare a site package from a QGIS export, and record what every check found."""
        async with user_transaction(sessions, user_id) as session:
            return await prepare_package(session, project_id, user_id, submission)

    @app.get("/v1/projects/{project_id}/packages")
    async def packages(
        project_id: UUID,
        user_id: Annotated[UUID, Depends(authenticate)],
        site: Annotated[str | None, Query(max_length=100)] = None,
    ) -> list[PackageSummary]:
        async with user_transaction(sessions, user_id) as session:
            return await list_packages(session, project_id, site)

    @app.get("/v1/projects/{project_id}/packages/{package_id}")
    async def package(
        project_id: UUID,
        package_id: UUID,
        user_id: Annotated[UUID, Depends(authenticate)],
    ) -> PackageDetail:
        async with user_transaction(sessions, user_id) as session:
            return await get_package(session, project_id, package_id)

    @app.get("/v1/projects/{project_id}/packages/{package_id}/archive")
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


def create_app_from_config() -> FastAPI:
    return create_app(read_local_settings())
