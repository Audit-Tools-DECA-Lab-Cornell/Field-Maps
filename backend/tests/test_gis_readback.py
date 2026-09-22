from uuid import UUID, uuid4

import anyio
import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter
from sqlalchemy import Result, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from tests.signing import PROJECT

pytestmark = pytest.mark.integration


async def read_as_gis(observation_id: UUID) -> tuple[float, float, int, str]:
    engine = create_async_engine(
        "postgresql+asyncpg://fieldmaps_owner@/fieldmaps_api_test?host=/var/run/postgresql",
        poolclass=NullPool,
    )
    try:
        async with async_sessionmaker(engine).begin() as connection:
            await connection.execute(text("SET LOCAL ROLE fieldmaps_sample_reader"))
            result: Result[tuple[str]] = await connection.execute(
                text(
                    "SELECT json_build_array(longitude, latitude, people, notes)::text "
                    "FROM gis.sample_observations "
                    "WHERE observation_id = :id",
                ),
                {"id": observation_id},
            )
            return TypeAdapter(tuple[float, float, int, str]).validate_json(result.scalar_one())
    finally:
        await engine.dispose()


def test_committed_upload_is_immediately_visible_through_restricted_gis_view(
    api_client: TestClient,
) -> None:
    observation_id = uuid4()
    response = api_client.put(
        f"/v1/projects/{PROJECT}/observations/{observation_id}",
        json={
            "site_id": "sample-garden",
            "form_version": "shell-v1",
            "coordinates": [-76.485, 42.448],
            "observer": "QA",
            "people": 3,
            "notes": "GIS readback",
            "observed_at": "2026-09-17T12:00:00Z",
        },
    )
    assert response.status_code == 200
    assert anyio.run(read_as_gis, observation_id) == (-76.485, 42.448, 3, "GIS readback")
