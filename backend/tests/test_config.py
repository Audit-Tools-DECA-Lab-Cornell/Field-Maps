import pytest
from pydantic import ValidationError

from fieldops_api.config import Settings


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
