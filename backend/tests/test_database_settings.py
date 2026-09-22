from pathlib import Path
from ssl import CERT_REQUIRED, VERIFY_X509_STRICT

from fieldmaps_api.config import Settings
from fieldmaps_api.database import database_connection


def test_local_database_uses_socket_without_remote_tls() -> None:
    connection = database_connection(Settings())
    assert connection.url.username == "fieldmaps_api"
    assert connection.ssl is None


def test_hosted_password_is_loaded_separately_and_tls_is_verified(tmp_path: Path) -> None:
    password_file = tmp_path / "database-password"
    password_file.write_text("test-password-with-@:/characters")
    settings = Settings.model_validate(
        {
            "database_url": "postgresql+asyncpg://fieldmaps_api.project@pooler.example.test:5432/postgres",
            "database_password_file": str(password_file),
            "database_tls": True,
        }
    )
    connection = database_connection(settings)
    assert connection.url.password == password_file.read_text()
    assert "test-password" not in repr(connection)
    assert connection.ssl is not None
    assert connection.ssl.verify_mode == CERT_REQUIRED
    assert connection.ssl.check_hostname
    assert connection.ssl.verify_flags & VERIFY_X509_STRICT


def test_hosted_database_trusts_supabase_ca_without_disabling_verification() -> None:
    certificate = Path(__file__).resolve().parents[1] / "certs" / "supabase-root-2021.crt"
    settings = Settings.model_validate(
        {
            "database_tls": True,
            "database_ca_file": str(certificate),
            "database_tls_strict": False,
        }
    )
    connection = database_connection(settings)
    assert connection.ssl is not None
    assert connection.ssl.verify_mode == CERT_REQUIRED
    assert connection.ssl.check_hostname
    assert connection.ssl.cert_store_stats()["x509_ca"] >= 1
    assert not connection.ssl.verify_flags & VERIFY_X509_STRICT
