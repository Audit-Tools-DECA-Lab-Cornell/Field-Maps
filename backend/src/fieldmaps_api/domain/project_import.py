"""The contract for a temporary QGIS import preview; importing never saves a site package."""

from typing import ClassVar

from pydantic import BaseModel, ConfigDict, Field

from fieldmaps_api.domain.geojson import FeatureCollection
from fieldmaps_api.domain.packages import ProjectFile


class ProjectImportRequest(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True, extra="forbid")

    files: list[ProjectFile] = Field(min_length=1, max_length=64)


class ImportedLayer(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    name: str
    collection: FeatureCollection


class ImportIssue(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    layer: str
    message: str


class ProjectImportResult(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    project_file: ProjectFile
    layers: list[ImportedLayer]
    issues: list[ImportIssue]


class ImportFailure(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)

    error: str
