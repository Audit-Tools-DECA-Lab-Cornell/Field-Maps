from collections.abc import Iterator
from typing import Final
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import JsonValue

from fieldmaps_api.auth import JwksVerifier
from fieldmaps_api.errors import ErrorEnvelope
from fieldmaps_api.identity_schemas import Identity, Profile
from fieldmaps_api.main import create_app
from tests.local_database import admin_sql
from tests.signing import ISSUER, PROJECT, Signer

TRAINING: Final = UUID("10000000-0000-4000-8000-000000000102")


@pytest.fixture
def new_user() -> Iterator[UUID]:
    user = uuid4()
    admin_sql(
        "INSERT INTO auth.users(id, instance_id, aud, role, email) VALUES "
        "(:'user', '00000000-0000-0000-0000-000000000000', 'authenticated', "
        "'authenticated', :'user' || '@test.invalid');",
        f"user={user}",
    )
    try:
        yield user
    finally:
        admin_sql("DELETE FROM auth.users WHERE id = :'user';", f"user={user}")


@pytest.mark.integration
def test_first_identity_bootstraps_training_and_is_idempotent(
    api_client: TestClient, signer: Signer, new_user: UUID
) -> None:
    api_client.headers["Authorization"] = f"Bearer {signer.issue(new_user)}"
    first = api_client.get("/v1/me")
    assert first.status_code == 200, first.text
    identity = Identity.model_validate_json(first.content)
    assert identity.profile.user_id == new_user
    assert identity.organization_memberships == []
    assert len(identity.project_memberships) == 1
    training = identity.project_memberships[0]
    assert training.project_id == TRAINING
    assert training.role == "observer"
    assert training.is_training
    second = api_client.get("/v1/me")
    assert second.status_code == 200
    assert Identity.model_validate_json(second.content) == identity
    assert (
        admin_sql(
            "SELECT count(*) FROM fieldmaps.project_memberships WHERE user_id = :'user';",
            f"user={new_user}",
        )
        == "1"
    )


@pytest.mark.integration
def test_profile_patch_preserves_omitted_fields_and_cannot_modify_another_user(
    api_client: TestClient, signer: Signer, new_user: UUID
) -> None:
    own_before = api_client.get("/v1/me")
    assert own_before.status_code == 200
    original = Identity.model_validate_json(own_before.content)
    api_client.headers["Authorization"] = f"Bearer {signer.issue(new_user)}"
    updated = api_client.patch(
        "/v1/me", json={"display_name": " Observer ", "observer_initials": "QA7", "locale": "en-US"}
    )
    assert updated.status_code == 200, updated.text
    profile = Profile.model_validate_json(updated.content)
    assert profile.display_name == "Observer"
    assert profile.observer_initials == "QA7"
    assert profile.locale == "en-US"
    cleared = api_client.patch("/v1/me", json={"locale": None})
    assert cleared.status_code == 200
    cleared_profile = Profile.model_validate_json(cleared.content)
    assert cleared_profile.locale is None
    assert cleared_profile.display_name == "Observer"
    assert cleared_profile.observer_initials == "QA7"
    rejected = api_client.patch("/v1/me", json={"user_id": str(original.profile.user_id)})
    assert rejected.status_code == 422
    api_client.headers["Authorization"] = f"Bearer {signer.issue()}"
    own_after = api_client.get("/v1/me")
    assert Identity.model_validate_json(own_after.content) == original


@pytest.mark.integration
@pytest.mark.parametrize("forgotten", [False, True])
@pytest.mark.parametrize("method", ["GET", "PATCH"])
def test_deleted_accounts_cannot_recreate_profiles(
    api_client: TestClient, signer: Signer, new_user: UUID, *, forgotten: bool, method: str
) -> None:
    if forgotten:
        admin_sql(
            "INSERT INTO fieldmaps.profiles(user_id, deleted_at) VALUES (:'user', now());",
            f"user={new_user}",
        )
    else:
        admin_sql("DELETE FROM auth.users WHERE id = :'user';", f"user={new_user}")
    api_client.headers["Authorization"] = f"Bearer {signer.issue(new_user)}"
    response = api_client.request(method, "/v1/me", json={})
    assert response.status_code == 403, response.text
    assert ErrorEnvelope.model_validate_json(response.content).error.code == "account_deleted"
    assert (
        admin_sql(
            "SELECT count(*) FROM fieldmaps.project_memberships WHERE user_id = :'user';",
            f"user={new_user}",
        )
        == "0"
    )


@pytest.mark.integration
def test_memberships_are_caller_scoped_even_for_org_admin(
    api_client: TestClient, signer: Signer, new_user: UUID
) -> None:
    admin_sql(
        "INSERT INTO fieldmaps.profiles(user_id) VALUES (:'user'); "
        "INSERT INTO fieldmaps.organization_members(organization_id, user_id, role) VALUES "
        "('10000000-0000-4000-8000-000000000001', :'user', 'admin');",
        f"user={new_user}",
    )
    api_client.headers["Authorization"] = f"Bearer {signer.issue(new_user)}"
    response = api_client.get("/v1/me")
    assert response.status_code == 200, response.text
    identity = Identity.model_validate_json(response.content)
    assert len(identity.organization_memberships) == 1
    assert identity.organization_memberships[0].role == "admin"
    collaborative = [p for p in identity.project_memberships if not p.is_training]
    assert len(collaborative) == 1
    assert collaborative[0].project_id == PROJECT
    assert collaborative[0].role == "manager"


@pytest.mark.parametrize(
    "patch",
    [
        {"display_name": ""},
        {"display_name": "   "},
        {"display_name": "x" * 101},
        {"observer_initials": "lower"},
        {"observer_initials": "A" * 11},
        {"observer_initials": ""},
        {"locale": " "},
        {"user_id": "another-user"},
        {"display_name": 123},
    ],
)
def test_invalid_profile_patch_is_rejected_before_database(
    signer: Signer, patch: dict[str, JsonValue]
) -> None:
    with TestClient(create_app(verifier=JwksVerifier(ISSUER, "authenticated", signer))) as client:
        response = client.patch(
            "/v1/me", json=patch, headers={"Authorization": f"Bearer {signer.issue()}"}
        )
    assert response.status_code == 422
    assert ErrorEnvelope.model_validate_json(response.content).error.code == "validation_failed"


@pytest.mark.parametrize("method", ["GET", "PATCH"])
def test_identity_requires_authentication(method: str) -> None:
    with TestClient(create_app()) as client:
        response = client.request(method, "/v1/me", json={})
    assert response.status_code == 401
    assert ErrorEnvelope.model_validate_json(response.content).error.code == "unauthenticated"
