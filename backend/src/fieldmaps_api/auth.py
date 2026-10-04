from dataclasses import dataclass
from typing import ClassVar, Protocol
from uuid import UUID

import anyio
import jwt
from pydantic import BaseModel, ConfigDict, StrictBool, ValidationError

from fieldmaps_api.errors import StorageUnavailableError, TokenInvalidError


class TokenClaims(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    sub: UUID
    exp: int
    iss: str
    aud: str
    is_anonymous: StrictBool = False


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
                leeway=30,
                audience=self.audience,
                issuer=self.issuer,
                options={"require": ["exp", "sub", "iss", "aud"]},
            )
            parsed = TokenClaims.model_validate(claims)
        except jwt.PyJWKClientConnectionError as error:
            message = "Sign-in verification is temporarily unavailable"
            raise StorageUnavailableError(message) from error
        except (jwt.InvalidTokenError, jwt.PyJWKClientError, ValidationError) as error:
            raise TokenInvalidError from error
        if parsed.is_anonymous:
            raise TokenInvalidError
        return parsed.sub


@dataclass(frozen=True, slots=True)
class UnconfiguredVerifier:
    async def verify(self, _token: str) -> UUID:
        message = "Sign-in provider has not been configured"
        raise StorageUnavailableError(message)
