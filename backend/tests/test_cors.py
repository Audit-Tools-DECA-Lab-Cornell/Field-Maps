import pytest
from fastapi.testclient import TestClient
from pydantic import HttpUrl, ValidationError

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


# Vercel names a preview deployment <project>-git-<branch>-<team>.vercel.app, so the team slug
# is what makes the pattern safe: nobody outside the team can produce a host that matches it.
PREVIEWS = r"https://field-maps-[a-z0-9-]+-audit-tools-web-apps-deca-lab-at-cornell\.vercel\.app"
PREVIEW = "https://field-maps-git-somebranch-audit-tools-web-apps-deca-lab-at-cornell.vercel.app"


def previewing_app() -> TestClient:
    return TestClient(create_app(Settings(browser_origin_pattern=PREVIEWS)))


def test_a_preview_deployment_matching_the_pattern_may_preflight() -> None:
    response = previewing_app().options(PACKAGES, headers={**PREFLIGHT, "Origin": PREVIEW})

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == PREVIEW


def test_the_pattern_matches_the_whole_origin_and_not_a_prefix() -> None:
    # The classic CORS regex hole: a host that merely starts or ends with the real one.
    impostors = (
        f"{PREVIEW}.evil.invalid",
        "https://evil.invalid/https://field-maps-git-x-audit-tools-web-apps-deca-lab-at-cornell.vercel.app",
        "https://field-maps-git-x-audit-tools-web-apps-deca-lab-at-cornell.vercel.app.evil.invalid",
    )

    for origin in impostors:
        response = previewing_app().options(PACKAGES, headers={**PREFLIGHT, "Origin": origin})

        assert "access-control-allow-origin" not in response.headers, origin


def test_a_pattern_the_engine_cannot_compile_is_refused_at_startup() -> None:
    with pytest.raises(ValidationError, match="not a valid regular expression"):
        Settings(browser_origin_pattern="https://field-maps-[")
