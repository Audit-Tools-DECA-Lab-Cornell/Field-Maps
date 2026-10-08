"""The ids a form question may not take are the upload envelope's own fields."""

from fieldmaps_api.domain.form_references import RESERVED_QUESTION_IDS
from fieldmaps_api.schemas import ObservationUpload


def test_reserved_ids_are_the_upload_envelope() -> None:
    # Every envelope field but the observer, which the practice form asks as its own question.
    assert frozenset(ObservationUpload.model_fields) - {"observer"} == RESERVED_QUESTION_IDS
