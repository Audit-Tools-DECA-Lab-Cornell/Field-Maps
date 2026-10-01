from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.repositories import tenancy
from fieldmaps_api.schemas import ProjectAccess


async def list_projects(session: AsyncSession) -> list[ProjectAccess]:
    return await tenancy.list_projects(session)
