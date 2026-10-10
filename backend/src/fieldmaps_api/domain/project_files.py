"""Unpack only supplied files, with bounded expansion and no filesystem source lookups."""

import posixpath
import re
import stat
from io import BytesIO
from pathlib import PurePosixPath
from typing import Final
from urllib.parse import unquote
from zipfile import BadZipFile, ZipFile

from fieldmaps_api.domain.packages import ProjectFile
from fieldmaps_api.domain.qgis_project import ProjectFileError

MAX_BYTES: Final = 64 * 1024 * 1024
MAX_FILES: Final = 256
MAX_DEPTH: Final = 2
SUFFIXES: Final = frozenset(
    {".qgs", ".gpkg", ".geojson", ".json", ".shp", ".shx", ".dbf", ".prj", ".cpg"}
)


def safe_path(name: str) -> str:
    path = PurePosixPath(name.replace("\\", "/"))
    if path.is_absolute() or ".." in path.parts or ":" in name or "\x00" in name:
        message = "A supplied file has an unsafe path. Zip the project folder itself."
        raise ProjectFileError(message)
    return str(path)


class _ArchiveFiles:
    """Accumulate uploaded members while accounting for every expansion."""

    def __init__(self) -> None:
        self.contents: dict[str, bytes] = {}
        self.expanded: int = 0
        self.members: int = 0

    def add(self, name: str, payload: bytes, depth: int = 0) -> None:
        name = safe_path(name)
        self.members += 1
        self.expanded += len(payload)
        if self.members > MAX_FILES or self.expanded > MAX_BYTES:
            message = "The project expands beyond 64 MB or 256 files. Include only the site layers."
            raise ProjectFileError(message)
        path = PurePosixPath(name)
        if path.suffix.lower() in {".zip", ".qgz"}:
            self.archive(path, payload, depth)
        elif path.suffix.lower() in SUFFIXES:
            if any(key.casefold() == name.casefold() for key in self.contents):
                message = f"The upload contains more than one file named {name}."
                raise ProjectFileError(message)
            self.contents[name] = payload

    def archive(self, path: PurePosixPath, payload: bytes, depth: int) -> None:
        if depth >= MAX_DEPTH:
            message = "Nested archives are not supported. Zip the project with its source files."
            raise ProjectFileError(message)
        try:
            with ZipFile(BytesIO(payload)) as archive:
                entries = archive.infolist()
                if (
                    len(entries) + self.members > MAX_FILES
                    or sum(item.file_size for item in entries) + self.expanded > MAX_BYTES
                ):
                    message = "The project archive expands beyond the import limit."
                    raise ProjectFileError(message)
                for entry in entries:
                    safe_path(entry.filename)
                    if stat.S_ISLNK(entry.external_attr >> 16) or entry.flag_bits & 1:
                        message = (
                            "Linked or encrypted files are not supported in a project archive."
                        )
                        raise ProjectFileError(message)
                    if not entry.is_dir():
                        self.add(str(path.parent / entry.filename), archive.read(entry), depth + 1)
        except (BadZipFile, RuntimeError, NotImplementedError) as error:
            message = "The project archive could not be opened. Save it again in QGIS."
            raise ProjectFileError(message) from error


def unpack(files: list[ProjectFile]) -> dict[str, bytes]:
    if sum(len(file.content) for file in files) > 16 * 1024 * 1024:
        message = "Choose at most 16 MB of project and source files."
        raise ProjectFileError(message)
    archive = _ArchiveFiles()
    for file in files:
        archive.add(file.file_name, file.content)
    return archive.contents


def resolve_source(source: str, project: str, files: dict[str, bytes]) -> str | None:
    source = unquote(source.replace("\\", "/")).removeprefix("attachment:///")
    # All matches stay in this upload. Absolute paths may match an uploaded basename only.
    if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", source) or source.startswith("/vsi"):
        return None
    relative = posixpath.normpath(str(PurePosixPath(project).parent / source))
    if relative in files:
        return relative
    matches = [
        name
        for name in files
        if PurePosixPath(name).name.casefold() == PurePosixPath(source).name.casefold()
    ]
    return matches[0] if len(matches) == 1 else None
