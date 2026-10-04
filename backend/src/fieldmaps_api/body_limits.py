"""Bound ASGI request bytes before FastAPI parses JSON, including chunked bodies."""

import re
from typing import ClassVar, Final, Literal

from pydantic import BaseModel, ConfigDict
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from fieldmaps_api.errors import ErrorDetail, ErrorEnvelope

KIB: Final = 1024
MIB: Final = 1024 * KIB


class BodyFrame(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    type: Literal["http.request", "http.disconnect"]
    body: bytes = b""
    more_body: bool = False


def body_limit(method: str, path: str) -> int:
    path = path.rstrip("/")
    if method == "POST":
        if path == "/v1/sync/upload":
            return 4 * MIB
        if re.fullmatch(r"/v1/projects/[^/]+/packages", path):
            return 24 * MIB
    return 256 * KIB


class BodySizeMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app: ASGIApp = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request = Request(scope)
        limit = body_limit(request.method, request.url.path)
        buffer = bytearray()
        while True:
            message = BodyFrame.model_validate(await receive())
            if message.type == "http.disconnect":
                return
            if len(buffer) + len(message.body) > limit:
                envelope = ErrorEnvelope(
                    error=ErrorDetail(
                        code="validation_failed",
                        message="Request body exceeds the size limit",
                        details={
                            "fields": [
                                {"id": "body", "problem": "Request body exceeds the size limit"}
                            ]
                        },
                    )
                )
                await JSONResponse(envelope.model_dump(mode="json"), status_code=413)(
                    scope, receive, send
                )
                return
            buffer.extend(message.body)
            if not message.more_body:
                break
        body = bytes(buffer)
        delivered = False

        async def replay() -> Message:
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": body, "more_body": False}

        await self.app(scope, replay, send)
