import logging
import os
import re
from contextvars import ContextVar
from time import monotonic
from typing import Final, override
from uuid import UUID, uuid4

import orjson
import sentry_sdk
from pydantic import BaseModel, Field
from sentry_sdk.types import Event, Hint
from starlette.datastructures import MutableHeaders
from starlette.types import ASGIApp, Message, Receive, Scope, Send

REQUEST_ID: Final = ContextVar("request_id", default="")
LOGGER: Final = logging.getLogger("fieldmaps.requests")
VALID_ID: Final = re.compile(r"[A-Za-z0-9_-]{1,64}\Z")


class ExceptionType(BaseModel):
    type: str = "Exception"


class ExceptionTypes(BaseModel):
    values: list[ExceptionType] = Field(default_factory=list[ExceptionType])


class DeletionUser(BaseModel):
    id: UUID


def scrub_event(event: Event, _hint: Hint) -> Event:
    """Allow only diagnostic metadata; discard SQL, locals, requests and breadcrumbs."""
    if event.get("message") == "Account deletion pending":
        user = DeletionUser.model_validate(event.get("user", {}))
        return {
            "message": "Account deletion pending",
            "level": "error",
            "user": {"id": str(user.id)},
        }
    kinds = ExceptionTypes.model_validate(event.get("exception", {}))
    return {
        "exception": {"values": [{"type": kind.type} for kind in kinds.values]},
        "event_id": event.get("event_id", uuid4().hex),
        "level": "error",
        "platform": "python",
        "message": "Unhandled API failure",
        "tags": {"request_id": REQUEST_ID.get()},
    }


class SafeServerFormatter(logging.Formatter):
    @override
    def format(self, record: logging.LogRecord) -> str:
        return orjson.dumps(
            {"event": "server_log", "level": record.levelname, "logger": record.name}
        ).decode()


def configure_observability() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    LOGGER.handlers = [handler]
    LOGGER.setLevel(logging.INFO)
    LOGGER.propagate = False
    logging.getLogger("uvicorn.access").disabled = True
    server_handler = logging.StreamHandler()
    server_handler.setFormatter(SafeServerFormatter())
    server_logger = logging.getLogger("uvicorn.error")
    server_logger.handlers = [server_handler]
    server_logger.propagate = False
    # Default integrations may capture request bodies, SQL parameters or exception locals.
    if dsn := os.environ.get("SENTRY_DSN"):
        sentry_sdk.init(
            dsn=dsn,
            default_integrations=False,
            auto_enabling_integrations=False,
            send_default_pii=False,
            include_local_variables=False,
            before_send=scrub_event,
        )


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app: ASGIApp = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        candidate = MutableHeaders(scope=scope).get("x-request-id", "")
        request_id = candidate if VALID_ID.fullmatch(candidate) else uuid4().hex
        scope["fieldmaps_request_id"] = request_id
        token = REQUEST_ID.set(request_id)
        started = monotonic()

        async def send_response(message: Message) -> None:
            if message["type"] == "http.response.start":
                MutableHeaders(scope=message)["X-Request-Id"] = request_id
                # No raw URLs: invitation codes and query strings can be credentials.
                LOGGER.info(
                    orjson.dumps(
                        {
                            "event": "http_response",
                            "request_id": request_id,
                            "status": message["status"],
                            "duration_ms": round((monotonic() - started) * 1000),
                        }
                    ).decode()
                )
            await send(message)

        try:
            await self.app(scope, receive, send_response)
        finally:
            REQUEST_ID.reset(token)
