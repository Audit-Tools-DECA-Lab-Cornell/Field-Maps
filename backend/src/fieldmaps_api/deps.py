from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from fieldmaps_api.auth import TokenVerifier
from fieldmaps_api.errors import UnauthenticatedError
from fieldmaps_api.rate_limits import RateLimiter, policy_for


class Authentication:
    def __init__(self, verifier: TokenVerifier) -> None:
        self.verifier: TokenVerifier = verifier
        self.limiter: RateLimiter = RateLimiter()

    async def __call__(
        self,
        request: Request,
        credentials: Annotated[
            HTTPAuthorizationCredentials | None, Depends(HTTPBearer(auto_error=False))
        ],
    ) -> UUID:
        if credentials is None:
            raise UnauthenticatedError
        user_id = await self.verifier.verify(credentials.credentials)
        policy = policy_for(request.method, request.url.path)
        if policy is not None:
            self.limiter.consume(user_id, policy)
        return user_id


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
