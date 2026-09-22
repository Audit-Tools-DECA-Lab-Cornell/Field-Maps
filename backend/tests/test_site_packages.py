from base64 import b64encode
from io import BytesIO
from typing import cast
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient

from fieldmaps_api.schemas import PackageDetail
from tests.signing import MANAGER, Signer

pytestmark = pytest.mark.integration

Json = dict[str, object]


def polygon(west: float, south: float, east: float, north: float, **properties: object) -> Json:
    return {
        "type": "Feature",
        "properties": properties,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[west, south], [east, south], [east, north], [west, north], [west, south]]
            ],
        },
    }


def submission(**overrides: object) -> Json:
    payload: Json = {
        "site_code": "sample-garden",
        "form_version": "shell-v1",
        "layers": {
            "ground": {
                "type": "FeatureCollection",
                "features": [polygon(-76.4865, 42.447, -76.4835, 42.449, kind="site")],
            },
            "zones": {
                "type": "FeatureCollection",
                "features": [polygon(-76.4864, 42.4478, -76.485, 42.4489, id="A", label="Lawn")],
            },
        },
    }
    payload.update(overrides)
    return payload


def qgz(document: str) -> str:
    buffer = BytesIO()
    with ZipFile(buffer, "w") as archive:
        archive.writestr("site.qgs", document)
    return b64encode(buffer.getvalue()).decode()


def as_manager(client: TestClient, signer: Signer) -> TestClient:
    client.headers["Authorization"] = f"Bearer {signer.issue(MANAGER)}"
    return client


def test_a_manager_prepares_a_package_and_a_device_can_fetch_it(
    api_client: TestClient, signer: Signer
) -> None:
    client = as_manager(api_client, signer)
    created = client.post(
        "/v1/projects/10000000-0000-4000-8000-000000000002/packages", json=submission()
    )
    assert created.status_code == 201, created.text
    package = PackageDetail.model_validate_json(created.content)
    assert package.state == "ready"
    assert package.site_code == "sample-garden"
    assert [check.step for check in package.checks] == [
        "source-project",
        "layer-sources",
        "coordinate-reference",
        "imagery-licence",
        "archive",
    ]

    listed = client.get("/v1/projects/10000000-0000-4000-8000-000000000002/packages")
    assert listed.status_code == 200
    rows = cast("list[Json]", listed.json())
    assert any(row["package_id"] == str(package.package_id) for row in rows)

    archive = client.get(
        f"/v1/projects/10000000-0000-4000-8000-000000000002/packages/{package.package_id}/archive"
    )
    assert archive.status_code == 200
    assert archive.headers["content-type"] == "application/zip"
    assert archive.headers["etag"].strip('"') == package.archive_sha256
    with ZipFile(BytesIO(archive.content)) as opened:
        assert "manifest.json" in opened.namelist()


def test_versions_increment_rather_than_overwrite(api_client: TestClient, signer: Signer) -> None:
    client = as_manager(api_client, signer)
    url = "/v1/projects/10000000-0000-4000-8000-000000000002/packages"
    first = PackageDetail.model_validate_json(client.post(url, json=submission()).content)
    second = PackageDetail.model_validate_json(client.post(url, json=submission()).content)

    assert second.version == first.version + 1
    assert second.package_id != first.package_id


def test_a_blocked_package_is_kept_with_its_reason_but_not_served(
    api_client: TestClient, signer: Signer
) -> None:
    client = as_manager(api_client, signer)
    google = (
        '<qgis><projectlayers><maplayer type="raster"><layername>Satellite</layername>'
        "<provider>wms</provider>"
        "<datasource>type=xyz&amp;url=https://mt1.google.com/vt</datasource>"
        "</maplayer></projectlayers></qgis>"
    )
    created = client.post(
        "/v1/projects/10000000-0000-4000-8000-000000000002/packages",
        json=submission(project_file={"file_name": "site.qgz", "content": qgz(google)}),
    )
    assert created.status_code == 201, created.text
    package = PackageDetail.model_validate_json(created.content)
    assert package.state == "blocked"
    licence = next(check for check in package.checks if check.step == "imagery-licence")
    assert licence.state == "blocked"
    assert "mt1.google.com" in licence.detail

    refused = client.get(
        f"/v1/projects/10000000-0000-4000-8000-000000000002/packages/{package.package_id}/archive"
    )
    assert refused.status_code == 409


def test_an_observer_may_read_packages_but_not_prepare_one(api_client: TestClient) -> None:
    # The default client signs in as the seeded observer.
    listed = api_client.get("/v1/projects/10000000-0000-4000-8000-000000000002/packages")
    assert listed.status_code == 200
    refused = api_client.post(
        "/v1/projects/10000000-0000-4000-8000-000000000002/packages", json=submission()
    )
    assert refused.status_code == 403


def test_a_submission_the_format_refuses_is_a_422(api_client: TestClient, signer: Signer) -> None:
    client = as_manager(api_client, signer)
    refused = client.post(
        "/v1/projects/10000000-0000-4000-8000-000000000002/packages",
        json=submission(layers={"ground": {"type": "FeatureCollection", "features": []}}),
    )
    assert refused.status_code == 422
