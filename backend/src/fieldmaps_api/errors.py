from http import HTTPStatus
from typing import ClassVar, Final, Literal
from uuid import uuid4

import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, JsonValue, TypeAdapter
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException as FrameworkError

from fieldmaps_api.database_errors import database_error
from fieldmaps_api.observability import REQUEST_ID

type ErrorCode = Literal[
    "bad_request",
    "unauthenticated",
    "token_invalid",
    "account_deleted",
    "membership_required",
    "role_required",
    "limit_reached",
    "not_found",
    "method_not_allowed",
    "invitation_invalid",
    "conflict",
    "sole_owner",
    "invitation_expired",
    "archive_unavailable",
    "validation_failed",
    "unsupported_operation",
    "rate_limited",
    "internal",
    "storage_unavailable",
]


class ErrorDetail(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    code: ErrorCode
    message: str
    details: dict[str, JsonValue] = Field(default_factory=dict[str, JsonValue])


class ErrorEnvelope(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    error: ErrorDetail


class DomainError(Exception):
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status: int,
        details: dict[str, JsonValue] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.headers: dict[str, str] = headers or {}
        self.code: ErrorCode = code
        self.message: str = message
        self.status: int = status
        self.details: dict[str, JsonValue] = details if details is not None else {}


class UnauthenticatedError(DomainError):
    def __init__(self, message: str = "Sign in to synchronize") -> None:
        super().__init__("unauthenticated", message, 401)


class TokenInvalidError(DomainError):
    def __init__(self, message: str = "Sign in again to synchronize") -> None:
        super().__init__("token_invalid", message, 401)


class AccountDeletedError(DomainError):
    def __init__(self) -> None:
        super().__init__("account_deleted", "This account is no longer available", 403)


class RoleRequiredError(DomainError):
    def __init__(self, message: str) -> None:
        super().__init__("role_required", message, 403)


class NotFoundError(DomainError):
    def __init__(self, message: str) -> None:
        super().__init__("not_found", message, 404)


class ConflictError(DomainError):
    def __init__(self, message: str) -> None:
        super().__init__("conflict", message, 409)


class ValidationFailedError(DomainError):
    def __init__(self, message: str, field: str = "body") -> None:
        super().__init__(
            "validation_failed",
            message,
            422,
            {
                "fields": [{"id": field, "problem": message}],
            },
        )


class StorageUnavailableError(DomainError):
    def __init__(self, message: str = "Storage unavailable; retry later") -> None:
        super().__init__("storage_unavailable", message, 503)


class ValidationIssue(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True)
    loc: tuple[str | int, ...]
    msg: str


VALIDATION_ISSUES: Final = TypeAdapter(list[ValidationIssue])
ERROR_RESPONSES: Final[dict[int | str, dict[str, type[BaseModel] | str]]] = {
    status: {"model": ErrorEnvelope}
    for status in (400, 401, 403, 404, 405, 409, 410, 413, 422, 429, 500, 503)
}
HTTP_CODES: Final[dict[int, ErrorCode]] = {
    400: "bad_request",
    401: "unauthenticated",
    403: "role_required",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "validation_failed",
    422: "validation_failed",
    429: "rate_limited",
    500: "internal",
    503: "storage_unavailable",
}


async def error_response(request: Request, error: Exception) -> JSONResponse:
    headers: dict[str, str] = {}
    match error:
        case DomainError():
            failure = error
        case RequestValidationError():
            issues = VALIDATION_ISSUES.validate_python(error.errors())
            fields: list[JsonValue] = [
                {
                    "id": ".".join(str(part) for part in issue.loc[1:]) or "body",
                    "problem": issue.msg,
                }
                for issue in issues
            ]
            failure = DomainError(
                "validation_failed", "Request validation failed", 422, {"fields": fields}
            )
        case SQLAlchemyError():
            mapped = database_error(error)
            failure = (
                ValidationFailedError(mapped.message)
                if mapped.status == HTTPStatus.UNPROCESSABLE_ENTITY
                else DomainError(
                    TypeAdapter[ErrorCode](ErrorCode).validate_python(mapped.code),
                    mapped.message,
                    mapped.status,
                )
            )
        case FrameworkError():
            headers = dict(error.headers or {})
            message = (
                error.detail
                if error.status_code < HTTPStatus.INTERNAL_SERVER_ERROR
                else "Internal server error"
            )
            failure = DomainError(
                HTTP_CODES.get(error.status_code, "internal"),
                message,
                error.status_code,
            )
        case _:
            failure = DomainError("internal", "Internal server error", 500)
    headers.update(failure.headers)
    headers["X-Request-Id"] = TypeAdapter(str).validate_python(
        request.scope.get("fieldmaps_request_id", REQUEST_ID.get() or uuid4().hex)
    )
    if failure.status == HTTPStatus.INTERNAL_SERVER_ERROR:
        token = REQUEST_ID.set(headers["X-Request-Id"])
        try:
            sentry_sdk.capture_exception(error)
        finally:
            REQUEST_ID.reset(token)
    if failure.status == HTTPStatus.UNAUTHORIZED:
        headers.setdefault("WWW-Authenticate", "Bearer")
    envelope = ErrorEnvelope(
        error=ErrorDetail(
            code=failure.code,
            message=failure.message,
            details=failure.details,
        )
    )
    return JSONResponse(
        status_code=failure.status, content=envelope.model_dump(mode="json"), headers=headers
    )


def register_error_handlers(app: FastAPI) -> None:
    for exception_type in (
        DomainError,
        RequestValidationError,
        SQLAlchemyError,
        FrameworkError,
    ):
        app.add_exception_handler(exception_type, error_response)
