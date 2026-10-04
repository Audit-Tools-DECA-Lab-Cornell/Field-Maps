"""Exercise tenant boundaries through the same authenticated API used by clients."""

from collections.abc import Iterator
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import JsonValue, TypeAdapter

from fieldmaps_api.identity_schemas import Identity
from fieldmaps_api.invitation_schemas import InvitationCreated
from fieldmaps_api.tenancy_schemas import Organization, Project
from tests.local_database import admin_sql
from tests.signing import Signer
from tests.tenant_fixtures import (
    ROLES,
    TRAINING,
    Tenant,
    cleanup_tenant,
    create_package,
    create_tenant,
    observation_payload,
    sign_in,
)
from tests.test_site_packages import submission

pytestmark = pytest.mark.integration


@pytest.fixture
def tenants() -> Iterator[tuple[Tenant, Tenant]]:
    first, second = Tenant.new(), Tenant.new()
    try:
        create_tenant(first)
        create_tenant(second)
        yield first, second
    finally:
        cleanup_tenant(second)
        cleanup_tenant(first)


def invitation(
    client: TestClient, signer: Signer, tenant: Tenant, *, bound: bool
) -> InvitationCreated:
    sign_in(client, signer, tenant.users["owner"])
    response = client.post(
        f"/v1/projects/{tenant.project}/invitations",
        json={
            "role": "observer",
            "email": f"{tenant.users['observer']}@isolation.test" if bound else None,
        },
    )
    assert response.status_code == 201, response.text
    return InvitationCreated.model_validate_json(response.content)


def test_every_foreign_role_is_denied_tenant_routes(
    api_client: TestClient,
    signer: Signer,
    tenants: tuple[Tenant, Tenant],
) -> None:
    first, second = tenants
    package = create_package(api_client, signer, first)
    invite = invitation(api_client, signer, first, bound=True)
    org, project, member = first.org, first.project, first.users["observer"]
    routes: list[tuple[str, str, dict[str, JsonValue] | None]] = [
        ("GET", f"/v1/orgs/{org}", None),
        ("PATCH", f"/v1/orgs/{org}", {"name": "Forbidden"}),
        ("GET", f"/v1/orgs/{org}/projects", None),
        ("POST", f"/v1/orgs/{org}/projects", {"name": "Forbidden", "code": "forbidden"}),
        ("GET", f"/v1/orgs/{org}/members", None),
        ("PATCH", f"/v1/orgs/{org}/members/{member}", {"role": "admin"}),
        ("DELETE", f"/v1/orgs/{org}/members/{member}", None),
        ("POST", f"/v1/orgs/{org}/transfer-ownership", {"user_id": str(second.users["owner"])}),
        ("GET", f"/v1/projects/{project}", None),
        ("PATCH", f"/v1/projects/{project}", {"name": "Forbidden"}),
        ("GET", f"/v1/projects/{project}/members", None),
        ("PATCH", f"/v1/projects/{project}/members/{member}", {"role": "manager"}),
        ("DELETE", f"/v1/projects/{project}/members/{member}", None),
        ("GET", f"/v1/orgs/{org}/invitations", None),
        ("POST", f"/v1/orgs/{org}/invitations", {"role": "member"}),
        ("DELETE", f"/v1/orgs/{org}/invitations/{invite.id}", None),
        ("GET", f"/v1/projects/{project}/invitations", None),
        ("POST", f"/v1/projects/{project}/invitations", {"role": "observer"}),
        ("DELETE", f"/v1/projects/{project}/invitations/{invite.id}", None),
        ("GET", f"/v1/projects/{project}/observations/{first.observation}", None),
        ("PUT", f"/v1/projects/{project}/observations/{uuid4()}", observation_payload()),
        ("GET", f"/v1/projects/{project}/packages/{package}", None),
        ("GET", f"/v1/projects/{project}/packages/{package}/archive", None),
    ]
    for role in ROLES:
        sign_in(api_client, signer, second.users[role])
        for method, path, body in routes:
            response = api_client.request(method, path, json=body)
            assert response.status_code in {403, 404}, (role, method, path, response.text)
        denied = api_client.post(f"/v1/projects/{project}/packages", json=submission())
        assert denied.status_code == 403, (role, denied.text)
        listed = api_client.get(f"/v1/projects/{project}/packages")
        assert listed.status_code in {403, 404}, listed.text


def test_lists_and_identity_never_include_another_organization(
    api_client: TestClient,
    signer: Signer,
    tenants: tuple[Tenant, Tenant],
) -> None:
    first, second = tenants
    for role in ROLES:
        sign_in(api_client, signer, second.users[role])
        orgs = api_client.get("/v1/orgs")
        projects = api_client.get("/v1/projects")
        me = api_client.get("/v1/me")
        assert (orgs.status_code, projects.status_code, me.status_code) == (200, 200, 200)
        assert first.org not in {
            row.id for row in TypeAdapter(list[Organization]).validate_json(orgs.content)
        }
        assert first.project not in {
            row.project_id for row in TypeAdapter(list[Project]).validate_json(projects.content)
        }
        identity = Identity.model_validate_json(me.content)
        assert identity.profile.user_id == second.users[role]
        assert all(row.organization_id != first.org for row in identity.organization_memberships)
        assert all(row.organization_id != first.org for row in identity.project_memberships)


def test_foreign_member_and_invitation_ids_cannot_be_moved_into_own_scope(
    api_client: TestClient,
    signer: Signer,
    tenants: tuple[Tenant, Tenant],
) -> None:
    first, second = tenants
    invite = invitation(api_client, signer, first, bound=True)
    sign_in(api_client, signer, second.users["owner"])
    for prefix, role in (
        (f"orgs/{second.org}", "admin"),
        (f"projects/{second.project}", "manager"),
    ):
        member = f"/v1/{prefix}/members/{first.users['observer']}"
        assert api_client.patch(member, json={"role": role}).status_code in {403, 404}
        assert api_client.delete(member).status_code in {403, 404}
        assert api_client.delete(f"/v1/{prefix}/invitations/{invite.id}").status_code in {403, 404}
    transfer = api_client.post(
        f"/v1/orgs/{second.org}/transfer-ownership",
        json={"user_id": str(first.users["owner"])},
    )
    assert transfer.status_code in {403, 404}, transfer.text


def test_invitation_secret_allows_joining_but_email_binding_is_enforced(
    api_client: TestClient,
    signer: Signer,
    tenants: tuple[Tenant, Tenant],
) -> None:
    first, second = tenants
    bound = invitation(api_client, signer, first, bound=True)
    shared = invitation(api_client, signer, first, bound=False)
    sign_in(api_client, signer, second.users["observer"])
    bound_preview = api_client.post("/v1/invitations/preview", json={"token": bound.token})
    assert bound_preview.status_code == 200
    assert "email" not in bound_preview.json()
    rejected = api_client.post("/v1/invitations/redeem", json={"token": bound.token})
    assert rejected.status_code in {403, 404}, rejected.text
    preview = api_client.post("/v1/invitations/preview", json={"code": shared.code})
    assert preview.status_code == 200, preview.text
    redeemed = api_client.post("/v1/invitations/redeem", json={"token": shared.token})
    assert redeemed.status_code == 200, redeemed.text
    assert api_client.get(f"/v1/projects/{first.project}").status_code == 200


def test_viewer_has_no_collection_or_management_rights_even_with_a_project_manager(
    api_client: TestClient,
    signer: Signer,
    tenants: tuple[Tenant, Tenant],
) -> None:
    first, _ = tenants
    sign_in(api_client, signer, first.users["viewer"])
    assert api_client.get(f"/v1/projects/{first.project}").status_code == 200
    upload = api_client.put(
        f"/v1/projects/{first.project}/observations/{uuid4()}", json=observation_payload()
    )
    assert upload.status_code == 403, upload.text
    package = api_client.post(f"/v1/projects/{first.project}/packages", json=submission())
    assert package.status_code == 403, package.text
    for suffix in ("members", "invitations"):
        assert api_client.get(f"/v1/projects/{first.project}/{suffix}").status_code == 403


def test_training_records_profiles_and_memberships_are_private_between_trainees(
    api_client: TestClient,
    signer: Signer,
    tenants: tuple[Tenant, Tenant],
) -> None:
    first, second = tenants
    observations: list[tuple[UUID, UUID]] = []
    for tenant in (first, second):
        user, observation = tenant.users["observer"], uuid4()
        sign_in(api_client, signer, user)
        assert api_client.get("/v1/me").status_code == 200
        admin_sql(
            "INSERT INTO fieldmaps.observations(id,organization_id,project_id,site_id,"
            "form_version_id,"
            "observer_code,observed_at,geom,answers,created_by,upload_hash) SELECT "
            ":'observation',s.organization_id,s.project_id,s.id,f.id,'QA',now(),"
            "fieldmaps.make_point(-76.485,42.448),'{}',:'user',repeat('b',64) "
            "FROM fieldmaps.sites s JOIN fieldmaps.form_versions f ON f.project_id=s.project_id "
            "WHERE s.project_id=:'training';",
            f"observation={observation}",
            f"user={user}",
            f"training={TRAINING}",
        )
        observations.append((user, observation))
    for user, own in observations:
        other_user, other_observation = next(row for row in observations if row[0] != user)
        sign_in(api_client, signer, user)
        assert api_client.get(f"/v1/projects/{TRAINING}/observations/{own}").status_code == 200
        assert (
            api_client.get(f"/v1/projects/{TRAINING}/observations/{other_observation}").status_code
            == 404
        )
        assert api_client.get(f"/v1/projects/{TRAINING}/members").status_code == 403
        hidden = admin_sql(
            "BEGIN; GRANT fieldmaps_api TO postgres; SET LOCAL ROLE fieldmaps_api; "
            "SELECT set_config('fieldmaps.user_id',:'user',true); "
            "SELECT (SELECT count(*) FROM fieldmaps.profiles WHERE user_id=:'other') || ',' || "
            "(SELECT count(*) FROM fieldmaps.project_memberships WHERE user_id=:'other' "
            "AND project_id=:'training'); ROLLBACK;",
            f"user={user}",
            f"other={other_user}",
            f"training={TRAINING}",
        )
        assert hidden.splitlines()[-1] == "0,0"
