from datetime import datetime
from typing import Annotated, ClassVar, Literal, Self
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from fieldmaps_api.schemas import ProjectAccess

type Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
type Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$")]
type OrgRole = Literal["owner", "admin", "member"]
type ProjectRole = Literal["manager", "observer", "viewer"]


class Input(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True, extra="forbid")


class Organization(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    id: UUID
    name: str
    slug: str
    plan: str
    data_region: str
    is_platform: bool
    created_at: datetime


class ProjectCreate(Input):
    name: Name
    code: Slug
    timezone: Name = "America/New_York"

    @field_validator("timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            message = "Use a valid IANA timezone"
            raise ValueError(message) from None
        return value


class OrganizationCreate(Input):
    name: Name
    slug: Slug
    project: ProjectCreate


class OrganizationPatch(Input):
    name: Name | None = None
    slug: Slug | None = None

    @model_validator(mode="after")
    def reject_null(self) -> Self:
        if any(getattr(self, key) is None for key in self.model_fields_set):
            message = "Organization fields cannot be null"
            raise ValueError(message)
        return self


class Project(ProjectAccess):
    code: str
    description: str | None
    timezone: str
    status: Literal["active", "archived"]
    is_training: bool


class ProjectPatch(Input):
    name: Name | None = None
    description: Annotated[str, Field(max_length=10000)] | None = None
    timezone: Name | None = None
    status: Literal["active", "archived"] | None = None

    @model_validator(mode="after")
    def validate_fields(self) -> Self:
        if any(getattr(self, key) is None for key in self.model_fields_set - {"description"}):
            message = "Only description may be null"
            raise ValueError(message)
        if self.timezone is not None:
            ProjectCreate.valid_timezone(self.timezone)
        return self


class OrganizationMember(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    user_id: UUID
    organization_id: UUID
    role: OrgRole
    granted_at: datetime


class ProjectMember(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    user_id: UUID
    organization_id: UUID
    project_id: UUID
    role: ProjectRole
    granted_at: datetime


class OrgRolePatch(Input):
    role: OrgRole


class ProjectRolePatch(Input):
    role: ProjectRole


class OwnershipTransfer(Input):
    user_id: UUID
