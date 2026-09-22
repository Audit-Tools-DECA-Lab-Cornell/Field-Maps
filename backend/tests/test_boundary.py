from fastapi.testclient import TestClient

from fieldops_api.main import create_app


def test_upload_requires_authentication() -> None:
    # Given an unauthenticated client with no database connection.
    with TestClient(create_app()) as client:
        # When it attempts an upload.
        response = client.put(
            "/v1/projects/10000000-0000-4000-8000-000000000002/observations/"
            "30000000-0000-4000-8000-000000000001",
            json={},
        )
        # Then authentication rejects it before persistence.
        assert response.status_code == 401
