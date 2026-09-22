"""The image is only correct if the Dockerfile and .dockerignore agree about what exists.

They drifted once: a COPY gained two configuration files that .dockerignore still excluded, and
the build failed with "not found" — in the deployment, because no test here could see it.
"""

from fnmatch import fnmatch
from pathlib import Path

DOCKERFILE = Path("Dockerfile")
DOCKERIGNORE = Path(".dockerignore")


def patterns() -> list[tuple[str, bool]]:
    rules: list[tuple[str, bool]] = []
    for raw in DOCKERIGNORE.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        negated = line.startswith("!")
        rules.append((line.removeprefix("!").rstrip("/"), negated))
    return rules


def is_included(path: str) -> bool:
    """Apply the ignore rules the way the build context does: the last match decides."""
    included = True
    for pattern, negated in patterns():
        candidates = (path, *(str(parent) for parent in Path(path).parents if str(parent) != "."))
        if any(fnmatch(candidate, pattern) for candidate in candidates):
            included = negated
    return included


def copied_sources() -> list[str]:
    sources: list[str] = []
    for raw in DOCKERFILE.read_text().splitlines():
        line = raw.strip()
        if not line.startswith("COPY ") or "--from=" in line:
            continue
        sources.extend(line.split()[1:-1])
    return sources


def test_the_dockerfile_copies_something() -> None:
    assert copied_sources()


def test_every_copied_path_exists_and_survives_the_ignore_rules() -> None:
    for source in copied_sources():
        path = Path(source)

        assert path.exists(), source
        assert is_included(source), f"{source} is excluded by .dockerignore; the build would fail"
        if path.is_dir():
            for child in path.rglob("*"):
                if child.is_file() and "__pycache__" not in child.parts:
                    assert is_included(str(child)), child


def test_the_configuration_the_deployment_names_is_in_the_image() -> None:
    # backend/README.md tells a Render deployment to set FIELDMAPS_CONFIG to this file.
    assert "config.render.json" in copied_sources()
