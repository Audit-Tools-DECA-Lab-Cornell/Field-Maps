from collections.abc import Iterator
from pathlib import Path

import anyio
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from fieldmaps_api.auth import JwksVerifier
from fieldmaps_api.config import Settings
from fieldmaps_api.main import create_app
from tests.signing import ISSUER, MANAGER, PROJECT, USER, VIEWER, Signer, make_signer


async def seed_memberships() -> None:
    engine = create_async_engine(
        "postgresql+asyncpg://fieldmaps_owner@/fieldmaps_api_test?host=/var/run/postgresql",
        poolclass=NullPool,
    )
    try:
        async with engine.begin() as connection:
            await connection.execute(
                text(
                    "INSERT INTO fieldmaps.project_memberships "
                    "(user_id, organization_id, project_id, role) VALUES "
                    "(:user, '10000000-0000-4000-8000-000000000001', :project, :role) "
                    "ON CONFLICT (user_id, project_id) DO NOTHING",
                ),
                [
                    {"user": USER, "project": PROJECT, "role": "observer"},
                    {"user": VIEWER, "project": PROJECT, "role": "viewer"},
                    {"user": MANAGER, "project": PROJECT, "role": "manager"},
                ],
            )
    finally:
        await engine.dispose()


@pytest.fixture
def signer() -> Signer:
    return make_signer()


@pytest.fixture
def api_client(signer: Signer) -> Iterator[TestClient]:
    if not Path("/var/run/postgresql/.s.PGSQL.5432").exists():
        pytest.skip("Run make -C database api-test for real PostGIS integration")
    anyio.run(seed_memberships)
    settings = Settings(
        database_url="postgresql+asyncpg://fieldmaps_api@/fieldmaps_api_test?host=/var/run/postgresql",
    )
    with TestClient(create_app(settings, JwksVerifier(ISSUER, "authenticated", signer))) as client:
        client.headers["Authorization"] = f"Bearer {signer.issue()}"
        yield client
