from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from fieldmaps_api.schemas import ProjectAccess, StoredObservation, UploadReceipt
from tests.signing import PROJECT, USER

pytestmark = pytest.mark.integration


def test_upload_is_committed_and_identical_retry_has_same_receipt(api_client: TestClient) -> None:
    observation_id = uuid4()
    url = f"/v1/projects/{PROJECT}/observations/{observation_id}"
    payload = {
        "site_id": "sample-garden",
        "form_version": "shell-v1",
        "coordinates": [-76.485, 42.448],
        "observer": "QA",
        "people": 3,
        "notes": "Offline café",
        "observed_at": "2026-09-17T12:00:00Z",
    }
    first = api_client.put(url, json=payload)
    assert first.status_code == 200, first.text
    replay = api_client.put(url, json=payload)
    assert replay.status_code == 200, replay.text
    receipt = UploadReceipt.model_validate_json(first.content)
    assert receipt == UploadReceipt.model_validate_json(replay.content)
    assert receipt.user_id == USER
    stored = StoredObservation.model_validate_json(api_client.get(url).content)
    assert (stored.coordinates, stored.people, stored.notes, stored.revision) == (
        (-76.485, 42.448),
        3,
        "Offline café",
        1,
    )


def test_changed_retry_cannot_overwrite_original(api_client: TestClient) -> None:
    url = f"/v1/projects/{PROJECT}/observations/{uuid4()}"
    payload = {
        "site_id": "sample-garden",
        "form_version": "shell-v1",
        "coordinates": [1, 2],
        "observer": "QA",
        "people": 3,
        "notes": "original",
        "observed_at": "2026-09-17T12:00:00Z",
    }
    assert api_client.put(url, json=payload).status_code == 200
    conflict = api_client.put(url, json={**payload, "people": 7})
    assert conflict.status_code == 409
    assert StoredObservation.model_validate_json(api_client.get(url).content).people == 3


def test_simultaneous_retries_create_one_record(api_client: TestClient) -> None:
    url = f"/v1/projects/{PROJECT}/observations/{uuid4()}"
    payload = {
        "site_id": "sample-garden",
        "form_version": "shell-v1",
        "coordinates": [1, 2],
        "observer": "QA",
        "people": 3,
        "notes": "race",
        "observed_at": "2026-09-17T12:00:00Z",
    }
    with ThreadPoolExecutor(max_workers=2) as workers:
        first = workers.submit(api_client.put, url, json=payload)
        second = workers.submit(api_client.put, url, json=payload)
        responses = [first.result(), second.result()]
    assert [response.status_code for response in responses] == [200, 200]
    assert responses[0].text == responses[1].text


def test_projects_come_from_membership_not_user_input(api_client: TestClient) -> None:
    response = api_client.get("/v1/projects")
    assert response.status_code == 200
    projects = TypeAdapter(list[ProjectAccess]).validate_json(response.content)
    assert [project.project_id for project in projects] == [PROJECT]


@pytest.mark.parametrize("people", [-1, 1000, 1.5, True, "3"])
def test_invalid_count_never_reaches_storage(api_client: TestClient, people: float | str) -> None:
    response = api_client.put(
        f"/v1/projects/{PROJECT}/observations/{uuid4()}",
        json={
            "site_id": "sample-garden",
            "form_version": "shell-v1",
            "coordinates": [1, 2],
            "observer": "QA",
            "people": people,
            "notes": "",
            "observed_at": "2026-09-17T12:00:00Z",
        },
    )
    assert response.status_code == 422
