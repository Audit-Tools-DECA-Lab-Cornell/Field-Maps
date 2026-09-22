from base64 import urlsafe_b64encode
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Final
from uuid import UUID

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa

ISSUER: Final = "https://fieldmaps-test.invalid/auth/v1"
USER: Final = UUID("50000000-0000-4000-8000-000000000001")
OUTSIDER: Final = UUID("50000000-0000-4000-8000-000000000002")
VIEWER: Final = UUID("50000000-0000-4000-8000-000000000003")
MANAGER: Final = UUID("50000000-0000-4000-8000-000000000004")
PROJECT: Final = UUID("10000000-0000-4000-8000-000000000002")


def base64_integer(value: int) -> str:
    return urlsafe_b64encode(value.to_bytes((value.bit_length() + 7) // 8)).rstrip(b"=").decode()


@dataclass(frozen=True, slots=True)
class Signer:
    private_key: rsa.RSAPrivateKey

    def get_signing_key_from_jwt(self, _token: str) -> jwt.PyJWK:
        numbers = self.private_key.public_key().public_numbers()
        return jwt.PyJWK(
            {
                "kty": "RSA",
                "alg": "RS256",
                "kid": "test",
                "n": base64_integer(numbers.n),
                "e": base64_integer(numbers.e),
            }
        )

    def issue(
        self, subject: UUID = USER, *, expired: bool = False, audience: str = "authenticated"
    ) -> str:
        return jwt.encode(
            {
                "sub": str(subject),
                "iss": ISSUER,
                "aud": audience,
                "exp": datetime.now(UTC) + timedelta(seconds=-60 if expired else 300),
            },
            self.private_key,
            algorithm="RS256",
            headers={"kid": "test"},
        )


def make_signer() -> Signer:
    return Signer(rsa.generate_private_key(public_exponent=65537, key_size=2048))
