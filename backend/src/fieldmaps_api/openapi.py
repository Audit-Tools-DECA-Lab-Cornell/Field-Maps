import sys

import orjson

from fieldmaps_api.auth import UnconfiguredVerifier
from fieldmaps_api.config import Settings
from fieldmaps_api.main import create_app


def export_openapi() -> bytes:
    """Build the contract without loading configuration or entering the app lifespan."""
    app = create_app(
        Settings(database_url="postgresql+asyncpg://fieldmaps_api@127.0.0.1:1/openapi"),
        UnconfiguredVerifier(),
    )
    return orjson.dumps(app.openapi(), option=orjson.OPT_SORT_KEYS | orjson.OPT_INDENT_2) + b"\n"


if __name__ == "__main__":
    sys.stdout.buffer.write(export_openapi())
