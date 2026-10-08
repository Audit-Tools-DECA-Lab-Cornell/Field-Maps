from datetime import datetime
from typing import Annotated, ClassVar, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from fieldmaps_api.tenancy_schemas import Input, Name, Slug

type Description = Annotated[str, StringConstraints(strip_whitespace=True, max_length=2000)]


class ManifestZone(BaseModel):
    """A zone as the site's current package draws it: its id, its name and its box."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    id: str
    label: str
    west: float
    south: float
    east: float
    north: float


class Extent(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    west: float
    south: float
    east: float
    north: float


class SitePackageInfo(BaseModel):
    """The site's current package: the newest one whose checks all passed."""

    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    package_id: UUID
    version: int
    form_version: str | None
    archive_bytes: int
    archive_sha256: str
    prepared_at: datetime


class Site(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    site_id: UUID
    code: str
    name: str
    description: str | None
    created_at: datetime
    package: SitePackageInfo | None
    zones: list[ManifestZone] = Field(default_factory=list[ManifestZone])
    extent: Extent | None = None
    centre: tuple[float, float] | None = None
    observation_count: int


class SiteCreate(Input):
    code: Slug
    name: Name
    description: Description | None = None


class SitePatch(Input):
    name: Name | None = None
    description: Description | None = None

    @model_validator(mode="after")
    def name_not_null(self) -> Self:
        if "name" in self.model_fields_set and self.name is None:
            message = "A site needs a name"
            raise ValueError(message)
        return self
