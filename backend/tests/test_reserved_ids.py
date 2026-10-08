"""The upload envelope: the ids a form question may not take, and the round fields it carries."""

import pytest
from pydantic import JsonValue, ValidationError

from fieldmaps_api.domain.form_references import RESERVED_QUESTION_IDS
from fieldmaps_api.schemas import ObservationUpload

ENVELOPE: dict[str, JsonValue] = {
    "site_id": "fall-creek",
    "form_version": "behaviour-mapping-v1",
    "coordinates": [-76.4857, 42.4483],
    "observer": "QA",
    "observed_at": "2026-10-07T14:00:00Z",
}


def test_reserved_ids_are_the_upload_envelope() -> None:
    # Every envelope field but the observer, which the practice form asks as its own question.
    assert frozenset(ObservationUpload.model_fields) - {"observer"} == RESERVED_QUESTION_IDS


@pytest.mark.parametrize(
    "round_fields",
    [
        {},
        {"zone": "A", "round_type": "standard", "first_round": True, "placement": "hand"},
        {"zone": "A", "round_type": "reliability", "first_round": False, "placement": "hand"},
        {"zone": "A", "round_type": "inventory", "placement": "zone"},
    ],
)
def test_round_fields_that_agree_are_accepted(round_fields: dict[str, JsonValue]) -> None:
    ObservationUpload.model_validate({**ENVELOPE, **round_fields})


@pytest.mark.parametrize(
    "round_fields",
    [
        {"zone": "A"},
        {"round_type": "standard", "first_round": True, "placement": "hand"},
        {"zone": "A", "round_type": "reliability", "placement": "hand"},
        {"zone": "A", "round_type": "standard", "first_round": True, "placement": "zone"},
        {"zone": "A", "round_type": "inventory", "first_round": True, "placement": "zone"},
        {"zone": "A", "round_type": "inventory", "placement": "hand"},
    ],
)
def test_contradictory_round_fields_are_refused(round_fields: dict[str, JsonValue]) -> None:
    with pytest.raises(ValidationError):
        ObservationUpload.model_validate({**ENVELOPE, **round_fields})
