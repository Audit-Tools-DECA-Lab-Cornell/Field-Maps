from datetime import UTC, datetime, tzinfo
from typing import Final, override

import anyio
import jwt
import pytest
from fastapi.testclient import TestClient
from pydantic import JsonValue, TypeAdapter

from fieldmaps_api.auth import JwksVerifier
from fieldmaps_api.errors import TokenInvalidError
from fieldmaps_api.main import create_app
from tests.signing import ISSUER, USER, Signer

NOW: Final = 1_800_000_000
JSON: Final[TypeAdapter[JsonValue]] = TypeAdapter(JsonValue)


class FrozenDateTime(datetime):
    @classmethod
    @override
    def now(cls, tz: tzinfo | None = None) -> datetime:
        return datetime.fromtimestamp(NOW, tz=tz or UTC)


@pytest.mark.parametrize(
    ("offset", "accepted"), [(-31, False), (-30, False), (-29, True), (0, True)]
)
def test_expiry_leeway(
    signer: Signer, monkeypatch: pytest.MonkeyPatch, offset: int, *, accepted: bool
) -> None:
    monkeypatch.setattr(jwt.api_jwt, "datetime", FrozenDateTime)
    token = jwt.encode(
        {"sub": str(USER), "iss": ISSUER, "aud": "authenticated", "exp": NOW + offset},
        signer.private_key,
        algorithm="RS256",
    )
    verifier = JwksVerifier(ISSUER, "authenticated", signer)
    if accepted:
        assert anyio.run(verifier.verify, token) == USER
    else:
        with pytest.raises(TokenInvalidError):
            anyio.run(verifier.verify, token)


@pytest.mark.parametrize("anonymous", [True, "true", 1, None])
def test_anonymous_or_malformed_claim_is_rejected(signer: Signer, anonymous: JsonValue) -> None:
    token = jwt.encode(
        {
            "sub": str(USER),
            "iss": ISSUER,
            "aud": "authenticated",
            "exp": int(datetime.now(UTC).timestamp()) + 300,
            "is_anonymous": anonymous,
        },
        signer.private_key,
        algorithm="RS256",
    )
    with TestClient(create_app(verifier=JwksVerifier(ISSUER, "authenticated", signer))) as client:
        response = client.get("/v1/projects", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
    assert JSON.validate_json(response.content) == {
        "error": {
            "code": "token_invalid",
            "message": "Sign in again to synchronize",
            "details": {},
        }
    }


@pytest.mark.parametrize("anonymous", [False, "omitted"])
def test_registered_tokens_remain_valid(signer: Signer, *, anonymous: bool | str) -> None:
    claims: dict[str, JsonValue] = {
        "sub": str(USER),
        "iss": ISSUER,
        "aud": "authenticated",
        "exp": int(datetime.now(UTC).timestamp()) + 300,
    }
    if anonymous is False:
        claims["is_anonymous"] = False
    token = jwt.encode(claims, signer.private_key, algorithm="RS256")
    assert anyio.run(JwksVerifier(ISSUER, "authenticated", signer).verify, token) == USER


@pytest.mark.parametrize("claim", ["sub", "iss", "aud", "exp"])
@pytest.mark.parametrize("missing", [False, True])
def test_required_identity_claims_stay_enforced(
    signer: Signer, claim: str, *, missing: bool
) -> None:
    claims: dict[str, JsonValue] = {
        "sub": str(USER),
        "iss": ISSUER,
        "aud": "authenticated",
        "exp": int(datetime.now(UTC).timestamp()) + 300,
    }
    if missing:
        del claims[claim]
    else:
        claims[claim] = "invalid"
    token = jwt.encode(claims, signer.private_key, algorithm="RS256")
    with pytest.raises(TokenInvalidError):
        anyio.run(JwksVerifier(ISSUER, "authenticated", signer).verify, token)
