from typing import TYPE_CHECKING, Protocol, runtime_checkable

from sqlalchemy.exc import DBAPIError
from sqlalchemy.ext.asyncio import AsyncSession

from fieldmaps_api.errors import AccountDeletedError
from fieldmaps_api.identity_schemas import (
    OrganizationMembership,
    Profile,
    ProfilePatch,
    ProjectMembership,
)
from fieldmaps_api.queries import identity as queries

if TYPE_CHECKING:
    from sqlalchemy import Result


@runtime_checkable
class SqlStateError(Protocol):
    @property
    def sqlstate(self) -> str | None: ...


async def ensure_profile(session: AsyncSession) -> Profile:
    try:
        result: Result[tuple[str]] = await session.execute(queries.ENSURE_PROFILE)
    except DBAPIError as error:
        if isinstance(error.orig, SqlStateError) and error.orig.sqlstate == "FM005":
            raise AccountDeletedError from error
        raise
    return Profile.model_validate_json(result.scalar_one())


async def organization_memberships(session: AsyncSession) -> list[OrganizationMembership]:
    result: Result[tuple[str]] = await session.execute(queries.ORGANIZATION_MEMBERSHIPS)
    return [OrganizationMembership.model_validate_json(row) for row in result.scalars()]


async def project_memberships(session: AsyncSession) -> list[ProjectMembership]:
    result: Result[tuple[str]] = await session.execute(queries.PROJECT_MEMBERSHIPS)
    return [ProjectMembership.model_validate_json(row) for row in result.scalars()]


async def update_profile(session: AsyncSession, patch: ProfilePatch) -> Profile:
    result: Result[tuple[str]] = await session.execute(
        queries.UPDATE_PROFILE,
        {
            "set_display_name": "display_name" in patch.model_fields_set,
            "display_name": patch.display_name,
            "set_initials": "observer_initials" in patch.model_fields_set,
            "observer_initials": patch.observer_initials,
            "set_locale": "locale" in patch.model_fields_set,
            "locale": patch.locale,
        },
    )
    return Profile.model_validate_json(result.scalar_one())


async def forget_user(session: AsyncSession) -> None:
    await session.execute(queries.FORGET_USER)
