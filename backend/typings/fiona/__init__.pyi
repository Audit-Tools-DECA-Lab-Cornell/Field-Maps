from collections.abc import Iterator, Mapping
from os import PathLike
from types import TracebackType
from typing import Self

from pydantic import JsonValue

from .model import Geometry

class Feature:
    geometry: Geometry | None
    properties: Mapping[str, JsonValue]
    id: str

class Collection:
    crs_wkt: str
    def __enter__(self) -> Self: ...
    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None: ...
    def __iter__(self) -> Iterator[Feature]: ...
    def write(self, record: Mapping[str, JsonValue]) -> None: ...

def open(  # noqa: A001
    fp: str | PathLike[str],
    mode: str = "r",
    *,
    driver: str | None = None,
    enabled_drivers: list[str] | None = None,
    layer: str | int | None = None,
    crs: str | None = None,
    schema: Mapping[str, JsonValue] | None = None,
) -> Collection: ...
