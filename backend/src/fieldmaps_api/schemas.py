from datetime import UTC, datetime
from typing import Annotated, ClassVar, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator


class ObservationUpload(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(
        frozen=True, extra="forbid", str_strip_whitespace=True
    )

    site_id: Literal["sample-garden"]
    form_version: Literal["shell-v1"]
    coordinates: tuple[
        Annotated[float, Field(ge=-180, le=180, allow_inf_nan=False)],
        Annotated[float, Field(ge=-90, le=90, allow_inf_nan=False)],
    ]
    observer: Annotated[str, Field(min_length=1, max_length=12)]
    people: Annotated[int, Field(strict=True, ge=0, le=999)]
    notes: Annotated[str, Field(max_length=1000)]
    observed_at: AwareDatetime

    @field_validator("observed_at")
    @classmethod
    def normalize_capture_time(cls, value: datetime) -> datetime:
        return value.astimezone(UTC)


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
    people: int
    notes: str
    observed_at: AwareDatetime
    revision: int


class ProjectAccess(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    project_id: UUID
    organization_id: UUID
    name: str
    role: Literal["observer", "manager", "viewer"]
