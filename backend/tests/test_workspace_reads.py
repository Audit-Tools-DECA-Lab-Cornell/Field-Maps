"""Historical record links and the bounded dataset handed to the web workspace."""

from collections.abc import Iterator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import TypeAdapter

from fieldmaps_api.form_schemas import FormVersionDetail
from fieldmaps_api.schemas import ObservationRow, StoredObservation
from fieldmaps_api.site_schemas import Site
from tests.local_database import admin_sql
from tests.signing import Signer
from tests.tenant_fixtures import Tenant, cleanup_tenant, create_tenant, sign_in
from tests.test_workspace_api import inventory_upload, start_inventory

pytestmark = pytest.mark.integration
ROWS = TypeAdapter(list[ObservationRow])


@pytest.fixture
def tenant(api_client: TestClient, signer: Signer) -> Iterator[Tenant]:
    value = Tenant.new()
    create_tenant(value)
    sign_in(api_client, signer, value.users["manager"])
    try:
        yield value
    finally:
        cleanup_tenant(value)


@pytest.mark.parametrize("total", [499, 500, 501])
def test_bounded_list_keeps_stable_ties_and_old_detail_links(
    api_client: TestClient, tenant: Tenant, total: int
) -> None:
    # All newer rows tie on observed_at. Their IDs decide order, not insertion order.
    admin_sql(
        "INSERT INTO fieldmaps.observations(id,organization_id,project_id,site_id,form_version_id,"
        "observer_code,observed_at,geom,answers,created_by,upload_hash) "
        "SELECT md5(:'project'||n::text)::uuid,organization_id,project_id,site_id,form_version_id,"
        "observer_code,'2999-01-01T00:00:00Z',geom,answers,created_by,upload_hash "
        "FROM fieldmaps.observations CROSS JOIN generate_series(1, :count) n "
        "WHERE id=:'observation';",
        *tenant.variables(),
        f"count={total - 1}",
    )
    base = f"/v1/projects/{tenant.project}"
    rows = ROWS.validate_json(api_client.get(f"{base}/observations").content)
    assert len(rows) == min(total, 500)
    tied = [row.observation_id for row in rows if row.observation_id != tenant.observation]
    assert tied == sorted(tied)
    assert len(set(tied)) == total - 1
    assert (tenant.observation in {row.observation_id for row in rows}) == (total <= 500)
    site = Site.model_validate_json(api_client.get(f"{base}/sites/sample-garden").content)
    assert site.observation_count == total

    detail = StoredObservation.model_validate_json(
        api_client.get(f"{base}/observations/{tenant.observation}").content
    )
    assert (detail.site_code, detail.site_name, detail.form_version) == (
        "sample-garden",
        "Isolation site",
        "shell-v1",
    )
    assert (detail.round_type, detail.zone, detail.first_round, detail.placement) == (
        "standard",
        None,
        None,
        None,
    )
    definition = FormVersionDetail.model_validate_json(
        api_client.get(f"{base}/form-versions/{detail.form_version}").content
    )
    assert definition.code == "shell-v1"
    assert api_client.get(f"{base}/observations", params={"limit": 501}).status_code == 422


def test_detail_uses_its_retired_form_and_matches_list_context(
    api_client: TestClient, tenant: Tenant
) -> None:
    base = f"/v1/projects/{tenant.project}"
    start_inventory(api_client, base)
    assert api_client.post(f"{base}/form-versions/inventory-v1/publish").status_code == 200
    record = uuid4()
    url = f"{base}/observations/{record}"
    payload = inventory_upload(inv_nat_lps_sm_list="松ぼっくり, sticks 🌿")
    assert api_client.put(url, json=payload).status_code == 200
    assert api_client.post(f"{base}/forms/inventory/versions", json={}).status_code == 201
    assert api_client.post(f"{base}/form-versions/inventory-v2/publish").status_code == 200
    assert api_client.post(f"{base}/form-versions/inventory-v1/retire").status_code == 200

    detail = StoredObservation.model_validate_json(api_client.get(url).content)
    rows = ROWS.validate_json(api_client.get(f"{base}/observations").content)
    row = next(item for item in rows if item.observation_id == record)
    assert detail.model_dump(exclude={"project_id"}) == row.model_dump()
    assert detail.form_version == "inventory-v1"
    assert detail.answers["inv_nat_lps_sm_list"] == "松ぼっくり, sticks 🌿"
    version = FormVersionDetail.model_validate_json(
        api_client.get(f"{base}/form-versions/{detail.form_version}").content
    )
    assert version.state == "retired"
    # Retirement does not strand previously collected records on a device.
    assert api_client.put(f"{base}/observations/{uuid4()}", json=payload).status_code == 200


def test_since_uses_received_time_and_filtering_precedes_the_limit(
    api_client: TestClient, tenant: Tenant
) -> None:
    base = f"/v1/projects/{tenant.project}"
    start_inventory(api_client, base)
    assert api_client.post(f"{base}/form-versions/inventory-v1/publish").status_code == 200
    record = uuid4()
    url = f"{base}/observations/{record}"
    # The two 01:30 times at the New York DST fallback remain distinct instants.
    assert (
        api_client.put(
            url, json=inventory_upload(observed_at="2025-11-02T01:30:00-05:00")
        ).status_code
        == 200
    )
    detail = StoredObservation.model_validate_json(api_client.get(url).content)
    assert detail.observed_at == datetime(2025, 11, 2, 6, 30, tzinfo=UTC)
    since = detail.received_at.isoformat()
    rows = ROWS.validate_json(
        api_client.get(
            f"{base}/observations", params={"since": since, "round_type": "inventory", "limit": 1}
        ).content
    )
    assert [row.observation_id for row in rows] == [record]
    # Site filtering also happens before the limit, rather than filtering one unrelated row.
    assert (
        api_client.get(f"{base}/observations", params={"site": "absent", "limit": 1}).json() == []
    )


def test_detail_rejects_wrong_project_and_deleted_records(
    api_client: TestClient, tenant: Tenant
) -> None:
    assert (
        api_client.get(f"/v1/projects/{uuid4()}/observations/{tenant.observation}").status_code
        == 404
    )
    deleted = uuid4()
    admin_sql(
        "INSERT INTO fieldmaps.observations(id,organization_id,project_id,site_id,form_version_id,"
        "observer_code,observed_at,geom,answers,created_by,upload_hash,deleted_at) "
        "SELECT :'deleted',organization_id,project_id,site_id,form_version_id,observer_code,"
        "observed_at,geom,answers,created_by,upload_hash,now() FROM fieldmaps.observations "
        "WHERE id=:'observation';",
        *tenant.variables(),
        f"deleted={deleted}",
    )
    base = f"/v1/projects/{tenant.project}"
    assert api_client.get(f"{base}/observations/{deleted}").status_code == 404
    rows = ROWS.validate_json(api_client.get(f"{base}/observations").content)
    assert [row.observation_id for row in rows] == [tenant.observation]
