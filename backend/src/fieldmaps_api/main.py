from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import ClassVar, Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from jwt import PyJWKClient
from pydantic import BaseModel, ConfigDict
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from fieldmaps_api.auth import JwksVerifier, TokenVerifier, UnconfiguredVerifier
from fieldmaps_api.config import Settings, read_local_settings
from fieldmaps_api.database import database_connection
from fieldmaps_api.deps import Authentication
from fieldmaps_api.errors import ERROR_RESPONSES, register_error_handlers
from fieldmaps_api.routers import collection, identity, sites, tenancy


class HealthResponse(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    status: Literal["running"] = "running"


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
    # The management application runs on its own origin and sends an Authorization header, so
    # every call it makes is preflighted. Named origins only: a wildcard here would let any page
    # a manager has open spend their token.
    if configuration.allowed_origins or configuration.browser_origin_pattern:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=configuration.allowed_origins,
            allow_origin_regex=configuration.browser_origin_pattern,
            allow_methods=["GET", "POST", "PUT", "PATCH"],
            allow_headers=["authorization", "content-type"],
            expose_headers=["etag"],
            max_age=600,
        )

    register_error_handlers(app)

    @app.get(
        "/health",
        operation_id="health",
        responses=ERROR_RESPONSES,
    )
    async def health() -> HealthResponse:
        return HealthResponse()

    app.include_router(tenancy.create_router(sessions, authenticate))
    app.include_router(identity.create_router(sessions, authenticate))
    app.include_router(collection.create_router(sessions, authenticate))
    app.include_router(sites.create_router(sessions, authenticate))
    return app


def create_app_from_config() -> FastAPI:
    return create_app(read_local_settings())
