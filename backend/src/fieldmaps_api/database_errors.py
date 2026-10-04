from dataclasses import dataclass
from typing import Final

from pydantic import BaseModel, ValidationError
from sqlalchemy.exc import (
    DBAPIError,
    InterfaceError,
    SQLAlchemyError,
)
from sqlalchemy.exc import (
    TimeoutError as PoolTimeoutError,
)


@dataclass(frozen=True, slots=True)
class DatabaseFailure:
    code: str
    message: str
    status: int


class DriverState(BaseModel):
    sqlstate: str | None = None


DOMAIN_STATES: Final[dict[str, tuple[str, int, str]]] = {
    "FM001": ("limit_reached", 403, "Organization limit reached"),
    "FM002": ("sole_owner", 409, "The organization must retain an owner"),
    "FM003": ("invitation_invalid", 404, "Invitation not found"),
    "FM004": ("invitation_expired", 410, "Invitation expired"),
    "FM005": ("account_deleted", 403, "This account is no longer available"),
    "FM006": ("role_required", 403, "You do not have permission for this action"),
    "FM007": ("not_found", 404, "Record not found"),
    "FM008": ("conflict", 409, "The request conflicts with existing data"),
    "23505": ("conflict", 409, "The request conflicts with existing data"),
    "42501": ("role_required", 403, "You do not have permission for this action"),
}


def database_error(error: SQLAlchemyError) -> DatabaseFailure:
    """Classify driver SQLSTATE without returning database messages or parameters."""
    state = ""
    if isinstance(error, DBAPIError):
        try:
            state = DriverState.model_validate(error.orig, from_attributes=True).sqlstate or ""
        except ValidationError:
            state = ""
    if state in DOMAIN_STATES:
        code, status, message = DOMAIN_STATES[state]
        return DatabaseFailure(code, message, status)
    if state in {"23514", "23502", "23503"} or state.startswith("22"):
        return DatabaseFailure("validation_failed", "Request violates data constraints", 422)
    if (
        state.startswith(("08", "53"))
        or state in {"57P01", "40001", "40P01", "55P03", "57014"}
        or isinstance(error, (PoolTimeoutError, InterfaceError))
        or (isinstance(error, DBAPIError) and error.connection_invalidated)
    ):
        return DatabaseFailure("storage_unavailable", "Storage unavailable; retry later", 503)
    return DatabaseFailure("internal", "Internal server error", 500)
