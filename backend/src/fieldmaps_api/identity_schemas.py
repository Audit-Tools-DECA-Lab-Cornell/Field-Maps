from datetime import datetime
from typing import Annotated, ClassVar, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints

type DisplayName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)
]
type ObserverInitials = Annotated[str, StringConstraints(pattern=r"^[A-Z0-9]{1,10}$")]
type Locale = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class Profile(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    user_id: UUID
    display_name: str | None
    observer_initials: str | None
    locale: str | None
    created_at: datetime


class ProfilePatch(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True, extra="forbid")
    display_name: DisplayName | None = None
    observer_initials: ObserverInitials | None = None
    locale: Locale | None = None


class OrganizationMembership(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    organization_id: UUID
    slug: str
    name: str
    role: Literal["owner", "admin", "member"]


class ProjectMembership(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    project_id: UUID
    code: str
    name: str
    organization_id: UUID
    role: Literal["manager", "observer", "viewer"]
    is_training: bool


class Identity(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    profile: Profile
    organization_memberships: list[OrganizationMembership]
    project_memberships: list[ProjectMembership]
