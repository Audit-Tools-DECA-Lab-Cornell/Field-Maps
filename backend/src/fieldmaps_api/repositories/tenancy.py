from datetime import timedelta
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.elements import TextClause

from fieldmaps_api.errors import NotFoundError, RoleRequiredError
from fieldmaps_api.queries import tenancy as queries
from fieldmaps_api.tenancy_schemas import Project

if TYPE_CHECKING:
    from sqlalchemy import Result

type Parameters = dict[str, str | int | bool | UUID | timedelta | None]


async def rows[T: BaseModel](
    session: AsyncSession, query: TextClause, model: type[T], params: Parameters | None = None
) -> list[T]:
    result: Result[tuple[str]] = await session.execute(query, params or {})
    return [model.model_validate_json(row) for row in result.scalars()]


async def one[T: BaseModel](
    session: AsyncSession, query: TextClause, model: type[T], params: Parameters
) -> T:
    values = await rows(session, query, model, params)
    if not values:
        message = "Resource not found"
        raise NotFoundError(message)
    return values[0]


async def require_manager(session: AsyncSession, query: TextClause, scope: UUID) -> None:
    result: Result[tuple[bool]] = await session.execute(query, {"id": scope})
    if not result.scalar_one():
        message = "Manager access required"
        raise RoleRequiredError(message)


async def list_projects(session: AsyncSession) -> list[Project]:
    return await rows(session, queries.PROJECTS, Project)


async def execute(session: AsyncSession, query: TextClause, params: Parameters) -> None:
    await session.execute(query, params)


async def identifier(session: AsyncSession, query: TextClause, params: Parameters) -> UUID:
    result: Result[tuple[UUID]] = await session.execute(query, params)
    return result.scalar_one()
