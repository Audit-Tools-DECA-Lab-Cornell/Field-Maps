"""Independent synthetic tenant matrix, including immutable field records."""

import json
from dataclasses import dataclass
from typing import Final
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from pydantic import JsonValue

from fieldmaps_api.schemas import PackageDetail
from tests.local_database import admin_sql
from tests.signing import Signer
from tests.test_site_packages import submission

ROLES: Final = ("owner", "admin", "member", "manager", "observer", "viewer")
TRAINING: Final = UUID("10000000-0000-4000-8000-000000000102")


@dataclass(frozen=True)
class Tenant:
    org: UUID
    project: UUID
    site: UUID
    form: UUID
    observation: UUID
    users: dict[str, UUID]

    @classmethod
    def new(cls) -> "Tenant":
        return cls(uuid4(), uuid4(), uuid4(), uuid4(), uuid4(), {role: uuid4() for role in ROLES})

    def variables(self) -> tuple[str, ...]:
        users = [
            {
                "id": str(user),
                "org_role": role if role in {"owner", "admin"} else "member",
                "project_role": role if role in {"manager", "observer", "viewer"} else None,
            }
            for role, user in self.users.items()
        ]
        return (
            f"org={self.org}",
            f"project={self.project}",
            f"site={self.site}",
            f"form={self.form}",
            f"observation={self.observation}",
            f"users={json.dumps(users)}",
            f"observer={self.users['observer']}",
        )


def create_tenant(tenant: Tenant) -> None:
    admin_sql(
        "BEGIN; CREATE TEMP TABLE fixture_users ON COMMIT DROP AS "
        "SELECT * FROM jsonb_to_recordset(:'users'::jsonb) "
        "AS u(id uuid, org_role text, project_role text); "
        "INSERT INTO auth.users(id,instance_id,aud,role,email,email_confirmed_at) "
        "SELECT id,'00000000-0000-0000-0000-000000000000','authenticated',"
        "'authenticated',id::text||'@isolation.test',now() FROM fixture_users; "
        "INSERT INTO fieldmaps.profiles(user_id) SELECT id FROM fixture_users; "
        "INSERT INTO fieldmaps.organizations(id,name,slug) "
        "VALUES (:'org','Isolation organization',:'org'); "
        "INSERT INTO fieldmaps.projects(id,organization_id,name,code) "
        "VALUES (:'project',:'org','Isolation project','isolation-project'); "
        "INSERT INTO fieldmaps.organization_members(organization_id,user_id,role) "
        "SELECT :'org',id,org_role FROM fixture_users; "
        "INSERT INTO fieldmaps.project_memberships(organization_id,project_id,user_id,role) "
        "SELECT :'org',:'project',id,project_role FROM fixture_users "
        "WHERE project_role IS NOT NULL; "
        "INSERT INTO fieldmaps.sites(id,organization_id,project_id,code,name) "
        "VALUES (:'site',:'org',:'project','sample-garden','Isolation site'); "
        "INSERT INTO fieldmaps.form_versions(id,organization_id,project_id,code,definition) "
        "SELECT :'form',:'org',:'project',code,definition FROM fieldmaps.form_versions "
        "WHERE project_id='10000000-0000-4000-8000-000000000002' AND code='shell-v1'; "
        "INSERT INTO fieldmaps.observations(id,organization_id,project_id,site_id,form_version_id,"
        "observer_code,observed_at,geom,answers,created_by,upload_hash) "
        "VALUES (:'observation',:'org',:'project',:'site',:'form','QA',now(),"
        'fieldmaps.make_point(-76.485,42.448),\'{"people":3,"notes":""}\','
        ":'observer',repeat('a',64)); COMMIT;",
        *tenant.variables(),
    )


def cleanup_tenant(tenant: Tenant) -> None:
    # Published fixtures are immutable. Suppress triggers only inside this cleanup transaction.
    admin_sql(
        "BEGIN; SET LOCAL session_replication_role=replica; "
        "DELETE FROM fieldmaps.package_checks WHERE package_id IN "
        "(SELECT id FROM fieldmaps.site_packages WHERE organization_id=:'org'); "
        "DELETE FROM fieldmaps.site_packages WHERE organization_id=:'org'; "
        "DELETE FROM fieldmaps.observations WHERE organization_id=:'org' OR created_by IN "
        "(SELECT (value->>'id')::uuid FROM jsonb_array_elements(:'users'::jsonb)); "
        "DELETE FROM fieldmaps.invitations WHERE organization_id=:'org'; "
        "DELETE FROM fieldmaps.form_versions WHERE organization_id=:'org'; "
        "DELETE FROM fieldmaps.sites WHERE organization_id=:'org'; "
        "DELETE FROM fieldmaps.project_memberships WHERE organization_id=:'org' OR user_id IN "
        "(SELECT (value->>'id')::uuid FROM jsonb_array_elements(:'users'::jsonb)); "
        "DELETE FROM fieldmaps.organization_members WHERE organization_id=:'org' OR user_id IN "
        "(SELECT (value->>'id')::uuid FROM jsonb_array_elements(:'users'::jsonb)); "
        "DELETE FROM fieldmaps.projects WHERE organization_id=:'org'; "
        "DELETE FROM fieldmaps.organizations WHERE id=:'org'; "
        "DELETE FROM fieldmaps.profiles WHERE user_id IN "
        "(SELECT (value->>'id')::uuid FROM jsonb_array_elements(:'users'::jsonb)); "
        "DELETE FROM auth.users WHERE id IN "
        "(SELECT (value->>'id')::uuid FROM jsonb_array_elements(:'users'::jsonb)); COMMIT;",
        *tenant.variables(),
    )


def sign_in(client: TestClient, signer: Signer, user: UUID) -> None:
    client.headers["Authorization"] = f"Bearer {signer.issue(user)}"


def create_package(client: TestClient, signer: Signer, tenant: Tenant) -> UUID:
    sign_in(client, signer, tenant.users["manager"])
    response = client.post(f"/v1/projects/{tenant.project}/packages", json=submission())
    assert response.status_code == 201, response.text
    return PackageDetail.model_validate_json(response.content).package_id


def observation_payload() -> dict[str, JsonValue]:
    return {
        "site_id": "sample-garden",
        "form_version": "shell-v1",
        "coordinates": [-76.485, 42.448],
        "observer": "QA",
        "people": 3,
        "notes": "",
        "observed_at": "2026-09-17T12:00:00Z",
    }
