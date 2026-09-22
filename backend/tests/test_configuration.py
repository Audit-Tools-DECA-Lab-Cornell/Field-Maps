import re
from pathlib import Path

import pytest

from fieldmaps_api.config import (
    CONFIG_VARIABLE,
    DEFAULT_CONFIG,
    Settings,
    configured_path,
    read_local_settings,
)

HOSTED = '{"database_url": "postgresql+asyncpg://api@db/fieldmaps", "audience": "authenticated"}'


def test_without_the_variable_the_local_development_file_is_read() -> None:
    assert configured_path() == DEFAULT_CONFIG


def test_the_variable_names_the_file_the_service_reads(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # A deployed container reads its own configuration; the image carries several.
    deployed = tmp_path / "config.render.json"
    _ = deployed.write_text(HOSTED)
    monkeypatch.setenv(CONFIG_VARIABLE, str(deployed))

    settings = read_local_settings()

    assert settings.database_url == "postgresql+asyncpg://api@db/fieldmaps"


def test_an_empty_variable_falls_back_rather_than_reading_the_working_directory(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv(CONFIG_VARIABLE, "   ")

    assert configured_path() == DEFAULT_CONFIG


def test_a_missing_file_says_which_one_and_how_to_name_it(monkeypatch: pytest.MonkeyPatch) -> None:
    # Failing at startup with the path in the message beats an empty-settings service that
    # answers /health and refuses every real request.
    monkeypatch.setenv(CONFIG_VARIABLE, "/nowhere/config.json")

    with pytest.raises(FileNotFoundError, match=re.escape("/nowhere/config.json")):
        _ = read_local_settings()


def test_every_configuration_the_image_carries_parses() -> None:
    for name in ("config.local.json", "config.hosted.json", "config.render.json"):
        settings = Settings.model_validate_json(Path(name).read_bytes())

        assert settings.database_url, name
