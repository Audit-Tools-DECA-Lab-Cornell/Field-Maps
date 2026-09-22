from datetime import UTC, datetime
from typing import Annotated, ClassVar, Literal
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    JsonValue,
    field_validator,
    model_validator,
)

from fieldmaps_api.packages import PreparationCheck

#: A site or form version is named by its code within a project, which is what the collector
#: carries and what an export column is keyed by.
Code = Annotated[str, Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9][\w.-]*$")]

MAX_ANSWERS = 200


class ObservationUpload(BaseModel):
    """One observation, as the collector sends it.

    The envelope is fixed; everything beside it is an answer. That is already the shape the
    collector puts on the wire — it sends `people` and `notes` at the top level — so opening the
    API to a second form changed nothing about the request, only about what validates it. The
    answers are checked against the form version's own field list, so a misspelled key is still
    refused, now by the instrument rather than by a hard-coded pair.
    """

    model_config: ClassVar[ConfigDict] = ConfigDict(
        frozen=True, extra="allow", str_strip_whitespace=True
    )

    site_id: Code
    form_version: Code
    coordinates: tuple[
        Annotated[float, Field(ge=-180, le=180, allow_inf_nan=False)],
        Annotated[float, Field(ge=-90, le=90, allow_inf_nan=False)],
    ]
    observer: Annotated[str, Field(min_length=1, max_length=12)]
    observed_at: AwareDatetime

    @field_validator("observed_at")
    @classmethod
    def normalize_capture_time(cls, value: datetime) -> datetime:
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def limit_answers(self) -> "ObservationUpload":
        if len(self.model_extra or {}) > MAX_ANSWERS:
            message = f"An observation may carry up to {MAX_ANSWERS} answers"
            raise ValueError(message)
        return self

    @property
    def answers(self) -> dict[str, JsonValue]:
        extra: dict[str, JsonValue] = dict(self.model_extra or {})
        return extra


class UploadReceipt(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    observation_id: UUID
    project_id: UUID
    user_id: UUID
    accepted_revision: Literal[1] = 1
    received_at: AwareDatetime


class StoredObservation(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    observation_id: UUID
    project_id: UUID
    observer: str
    coordinates: tuple[float, float]
    answers: dict[str, JsonValue]
    observed_at: AwareDatetime
    revision: int


class ProjectAccess(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    project_id: UUID
    organization_id: UUID
    name: str
    role: Literal["observer", "manager", "viewer"]


class PackageSummary(BaseModel):
    """A prepared package as a list shows it. The archive itself is fetched separately."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    package_id: UUID
    site_code: str
    form_version: str
    version: int
    state: Literal["ready", "blocked"]
    archive_bytes: int
    archive_sha256: str
    prepared_at: AwareDatetime


class PackageDetail(PackageSummary):
    manifest: JsonValue
    checks: list[PreparationCheck]
