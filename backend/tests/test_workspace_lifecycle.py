"""Access changes and package selection as the live workspace uses them."""

from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from fieldmaps_api.identity_schemas import Identity
from fieldmaps_api.schemas import PackageDetail, PackageSummary
from fieldmaps_api.site_schemas import Site
from fieldmaps_api.tenancy_schemas import Project
from tests.signing import Signer
from tests.tenant_fixtures import (
    Tenant,
    cleanup_tenant,
    create_tenant,
    observation_payload,
    sign_in,
)
from tests.test_site_packages import qgz, submission

pytestmark = pytest.mark.integration


@pytest.fixture
def tenant(api_client: TestClient, signer: Signer) -> Iterator[Tenant]:
    value = Tenant.new()
    create_tenant(value)
    sign_in(api_client, signer, value.users["owner"])
    try:
        yield value
    finally:
        cleanup_tenant(value)


def test_inherited_manager_access_disappears_on_org_demotion(
    api_client: TestClient, signer: Signer, tenant: Tenant
) -> None:
    base = f"/v1/projects/{tenant.project}"
    sign_in(api_client, signer, tenant.users["admin"])
    me = Identity.model_validate_json(api_client.get("/v1/me").content)
    assert (
        next(row for row in me.project_memberships if row.project_id == tenant.project).role
        == "manager"
    )
    assert api_client.get(f"{base}/members").status_code == 200
    assert api_client.patch(base, json={"description": "Saved by an org admin"}).status_code == 200
    sign_in(api_client, signer, tenant.users["owner"])
    assert (
        api_client.patch(
            f"/v1/orgs/{tenant.org}/members/{tenant.users['admin']}", json={"role": "member"}
        ).status_code
        == 204
    )
    sign_in(api_client, signer, tenant.users["admin"])
    me = Identity.model_validate_json(api_client.get("/v1/me").content)
    assert tenant.project not in {row.project_id for row in me.project_memberships}
    assert api_client.get(base).status_code == 404
    assert api_client.get(f"{base}/members").status_code == 403


def test_removal_revokes_record_and_archive_access_on_the_next_request(
    api_client: TestClient, signer: Signer, tenant: Tenant
) -> None:
    base = f"/v1/projects/{tenant.project}"
    package = PackageDetail.model_validate_json(
        api_client.post(f"{base}/packages", json=submission()).content
    )
    paths = [
        base,
        f"{base}/observations",
        f"{base}/observations/{tenant.observation}",
        f"{base}/sites",
        f"{base}/forms",
        f"{base}/packages/{package.package_id}/archive",
    ]
    sign_in(api_client, signer, tenant.users["viewer"])
    for path in paths:
        assert api_client.get(path).status_code == 200
    sign_in(api_client, signer, tenant.users["owner"])
    assert api_client.delete(f"{base}/members/{tenant.users['viewer']}").status_code == 204
    sign_in(api_client, signer, tenant.users["viewer"])
    for path in paths:
        assert api_client.get(path).status_code == 404


def test_archive_is_a_status_change_and_does_not_strand_offline_uploads(
    api_client: TestClient, signer: Signer, tenant: Tenant
) -> None:
    base = f"/v1/projects/{tenant.project}"
    changed = api_client.patch(base, json={"status": "archived", "timezone": "America/New_York"})
    assert changed.status_code == 200
    sign_in(api_client, signer, tenant.users["observer"])
    assert Project.model_validate_json(api_client.get(base).content).status == "archived"
    assert (
        api_client.put(f"{base}/observations/{uuid4()}", json=observation_payload()).status_code
        == 200
    )
    sign_in(api_client, signer, tenant.users["owner"])
    assert api_client.patch(base, json={"status": "active", "description": None}).status_code == 200
    project = Project.model_validate_json(api_client.get(base).content)
    assert (project.status, project.timezone, project.description) == (
        "active",
        "America/New_York",
        None,
    )


def test_newer_blocked_packages_do_not_replace_a_sites_ready_package(
    api_client: TestClient, tenant: Tenant
) -> None:
    base = f"/v1/projects/{tenant.project}"
    first = PackageDetail.model_validate_json(
        api_client.post(f"{base}/packages", json=submission()).content
    )
    project_file = qgz(
        '<qgis><projectlayers><maplayer type="raster"><layername>Unlicensed</layername>'
        "<provider>wms</provider><datasource>type=xyz&amp;url=https://tiles.example.invalid/xyz</datasource>"
        "</maplayer></projectlayers></qgis>"
    )
    blocked = PackageDetail.model_validate_json(
        api_client.post(
            f"{base}/packages",
            json=submission(project_file={"file_name": "blocked.qgz", "content": project_file}),
        ).content
    )
    assert blocked.state == "blocked"
    assert blocked.version > first.version
    assert (
        api_client.post(
            f"{base}/sites", json={"code": "second-site", "name": "Second site"}
        ).status_code
        == 201
    )
    assert (
        api_client.post(f"{base}/packages", json=submission(site_code="second-site")).status_code
        == 201
    )
    site = Site.model_validate_json(api_client.get(f"{base}/sites/sample-garden").content)
    assert site.package is not None
    assert site.package.package_id == first.package_id
    assert api_client.get(f"{base}/packages/{blocked.package_id}/archive").status_code == 409
    packages = TypeAdapter(list[PackageSummary]).validate_json(
        api_client.get(f"{base}/packages", params={"site": "sample-garden"}).content
    )
    assert [package.package_id for package in packages] == [blocked.package_id, first.package_id]
