import re
from pathlib import Path
from typing import ClassVar, Self

from pydantic import BaseModel, ConfigDict, HttpUrl, model_validator


class Settings(BaseModel):
    model_config: ClassVar[ConfigDict] = ConfigDict(frozen=True, extra="forbid")
    database_url: str = "postgresql+asyncpg://fieldmaps_api@/fieldmaps?host=/var/run/postgresql"
    issuer: HttpUrl | None = None
    jwks_url: HttpUrl | None = None
    audience: str = "authenticated"
    database_password_file: Path | None = None
    database_tls: bool = False
    database_ca_file: Path | None = None
    database_tls_strict: bool = True
    browser_origins: tuple[HttpUrl, ...] = ()
    browser_origin_pattern: str | None = None

    @property
    def allowed_origins(self) -> list[str]:
        """Origins the browser may call this API from, without the trailing slash a URL carries."""
        return [str(origin).rstrip("/") for origin in self.browser_origins]

    @model_validator(mode="after")
    def validate_browser_origin_pattern(self) -> Self:
        """Refuse a pattern the regex engine cannot compile, at startup rather than mid-request."""
        if self.browser_origin_pattern is not None:
            try:
                re.compile(self.browser_origin_pattern)
            except re.error as error:
                msg = f"browser_origin_pattern is not a valid regular expression: {error}"
                raise ValueError(msg) from error
        return self

    @model_validator(mode="after")
    def validate_identity_provider(self) -> Self:
        if (self.issuer is None) != (self.jwks_url is None):
            msg = "Configure both issuer and jwks_url, or neither"
            raise ValueError(msg)
        for url in (self.issuer, self.jwks_url):
            if url is not None and url.scheme != "https":
                msg = "Identity provider URLs must use HTTPS"
                raise ValueError(msg)
        return self


def read_local_settings() -> Settings:
    return Settings.model_validate_json(Path("config.local.json").read_bytes())
