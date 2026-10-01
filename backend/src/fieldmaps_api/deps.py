from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldmaps_api.auth import TokenVerifier
from fieldmaps_api.errors import UnauthenticatedError


class Authentication:
    def __init__(self, verifier: TokenVerifier) -> None:
        self.verifier: TokenVerifier = verifier

    async def __call__(
        self,
        credentials: Annotated[
            HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))
        ],
    ) -> UUID:
        if credentials is None:
            raise UnauthenticatedError
        return await self.verifier.verify(credentials.credentials)


@asynccontextmanager
async def user_transaction(
    sessions: async_sessionmaker[AsyncSession],
    user_id: UUID,
) -> AsyncGenerator[AsyncSession]:
    async with sessions.begin() as session:
        await session.execute(
            text("SELECT set_config('fieldmaps.user_id', :user_id, true)"),
            {"user_id": str(user_id)},
        )
        yield session
