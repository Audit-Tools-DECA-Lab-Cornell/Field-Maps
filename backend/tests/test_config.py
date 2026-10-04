import pytest
from pydantic import ValidationError

from fieldmaps_api.config import Settings


def test_unconfigured_local_api_is_valid_but_partial_identity_config_is_not() -> None:
    assert Settings().issuer is None
    with pytest.raises(ValidationError, match="both"):
        Settings.model_validate({"issuer": "https://project.supabase.co/auth/v1"})


def test_identity_provider_must_use_https() -> None:
    with pytest.raises(ValidationError, match="HTTPS"):
        Settings.model_validate(
            {
                "issuer": "http://project.supabase.co/auth/v1",
                "jwks_url": "http://project.supabase.co/auth/v1/.well-known/jwks.json",
            }
        )


@pytest.mark.parametrize("host", ["localhost", "127.0.0.1", "[::1]"])
def test_loopback_identity_provider_allows_local_supabase(host: str) -> None:
    config = Settings.model_validate(
        {
            "issuer": f"http://{host}:54321/auth/v1",
            "jwks_url": f"http://{host}:54321/auth/v1/.well-known/jwks.json",
        }
    )
    assert config.issuer is not None
    assert config.issuer.scheme == "http"


@pytest.mark.parametrize("host", ["localhost.evil.invalid", "192.168.1.2", "127.0.0.2"])
def test_nonloopback_http_identity_provider_is_rejected(host: str) -> None:
    with pytest.raises(ValidationError, match="HTTPS"):
        Settings.model_validate(
            {
                "issuer": f"http://{host}/auth/v1",
                "jwks_url": f"http://{host}/auth/v1/.well-known/jwks.json",
            }
        )
