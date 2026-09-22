import pytest
from fastapi.testclient import TestClient

from fieldmaps_api.auth import JwksVerifier
from fieldmaps_api.main import create_app
from tests.signing import ISSUER, make_signer


@pytest.mark.parametrize("failure", ["expired", "audience", "signature", "malformed"])
def test_untrusted_token_is_rejected_before_storage(failure: str) -> None:
    signer = make_signer()
    tokens = {
        "expired": signer.issue(expired=True),
        "audience": signer.issue(audience="different-app"),
        "signature": make_signer().issue(),
        "malformed": "not-a-token",
    }
    with TestClient(create_app(verifier=JwksVerifier(ISSUER, "authenticated", signer))) as client:
        response = client.get(
            "/v1/projects", headers={"Authorization": f"Bearer {tokens[failure]}"}
        )
        assert response.status_code == 401


def test_unconfigured_authentication_never_accepts_a_token() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/v1/projects", headers={"Authorization": "Bearer example"})
        assert response.status_code == 503
