from typing import TYPE_CHECKING

from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.queries import tenancy as queries
from fieldmaps_api.schemas import ProjectAccess

if TYPE_CHECKING:
    from sqlalchemy import Result


async def list_projects(session: AsyncSession) -> list[ProjectAccess]:
    result: Result[tuple[str]] = await session.execute(queries.PROJECTS)
    return [ProjectAccess.model_validate_json(row) for row in result.scalars()]
