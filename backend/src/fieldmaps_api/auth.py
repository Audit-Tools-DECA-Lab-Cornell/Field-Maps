from dataclasses import dataclass
from typing import Annotated, ClassVar, Protocol
from uuid import UUID

import anyio
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, ValidationError


class TokenClaims(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    sub: UUID
    exp: int
    iss: str
    aud: str


class TokenVerifier(Protocol):
    async def verify(self, token: str, /) -> UUID: ...


class SigningKeys(Protocol):
    def get_signing_key_from_jwt(self, token: str, /) -> jwt.PyJWK: ...


@dataclass(frozen=True, slots=True)
class JwksVerifier:
    issuer: str
    audience: str
    client: SigningKeys

    async def verify(self, token: str) -> UUID:
        try:
            signing_key = await anyio.to_thread.run_sync(
                self.client.get_signing_key_from_jwt, token
            )
            claims = jwt.decode(
                token,
                signing_key,
                algorithms=["ES256", "RS256"],
                audience=self.audience,
                issuer=self.issuer,
                options={"require": ["exp", "sub", "iss", "aud"]},
            )
            return TokenClaims.model_validate(claims).sub
        except jwt.PyJWKClientConnectionError as error:
            raise HTTPException(503, "Sign-in verification is temporarily unavailable") from error
        except (jwt.InvalidTokenError, jwt.PyJWKClientError, ValidationError) as error:
            raise HTTPException(
                401, "Sign in again to synchronize", headers={"WWW-Authenticate": "Bearer"}
            ) from error


@dataclass(frozen=True, slots=True)
class UnconfiguredVerifier:
    async def verify(self, _token: str) -> UUID:
        raise HTTPException(503, "Sign-in provider has not been configured")


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
            raise HTTPException(
                401, "Sign in to synchronize", headers={"WWW-Authenticate": "Bearer"}
            )
        return await self.verifier.verify(credentials.credentials)
