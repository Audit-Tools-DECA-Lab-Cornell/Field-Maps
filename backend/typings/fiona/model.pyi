from collections.abc import Mapping

from pydantic import JsonValue

class Geometry(Mapping[str, JsonValue]): ...

def to_dict(value: Geometry) -> dict[str, JsonValue]: ...
