from fastapi.testclient import TestClient
from pydantic import HttpUrl

from fieldmaps_api.config import Settings
from fieldmaps_api.main import create_app

WEB = "https://fieldmaps-web.invalid"
PREFLIGHT = {
    "Origin": WEB,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "authorization,content-type",
}
PACKAGES = "/v1/projects/10000000-0000-4000-8000-000000000002/packages"


def test_a_named_origin_may_preflight_a_package_upload() -> None:
    client = TestClient(create_app(Settings(browser_origins=(HttpUrl(WEB),))))

    response = client.options(PACKAGES, headers=PREFLIGHT)

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == WEB


def test_an_unnamed_origin_is_not_allowed() -> None:
    client = TestClient(create_app(Settings(browser_origins=(HttpUrl(WEB),))))

    response = client.options(
        PACKAGES, headers={**PREFLIGHT, "Origin": "https://elsewhere.invalid"}
    )

    assert "access-control-allow-origin" not in response.headers


def test_without_configured_origins_nothing_is_allowed() -> None:
    # The default is a closed door: an API reachable from any page is not the default anyone
    # should get by forgetting to configure one.
    client = TestClient(create_app(Settings()))

    response = client.options(PACKAGES, headers=PREFLIGHT)

    assert "access-control-allow-origin" not in response.headers
