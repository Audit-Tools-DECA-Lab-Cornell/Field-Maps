from dataclasses import dataclass, field
from ssl import VERIFY_X509_STRICT, SSLContext, create_default_context

from sqlalchemy.engine import URL, make_url

from fieldmaps_api.config import Settings


@dataclass(frozen=True, slots=True)
class DatabaseConnection:
    url: URL = field(repr=False)
    ssl: SSLContext | None


def database_connection(settings: Settings) -> DatabaseConnection:
    url = make_url(settings.database_url)
    if settings.database_password_file is not None:
        url = url.set(password=settings.database_password_file.read_text().strip())
    context = (
        create_default_context(cafile=settings.database_ca_file) if settings.database_tls else None
    )
    if context is not None and not settings.database_tls_strict:
        # Supabase's intermediate CA omits keyUsage. Chain and hostname checks remain enabled.
        context.verify_flags &= ~VERIFY_X509_STRICT
    return DatabaseConnection(url, context)
