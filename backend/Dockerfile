FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.10.9 /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project
COPY src ./src
COPY tests ./tests
COPY certs ./certs
COPY config.local.json ./config.local.json
CMD ["/app/.venv/bin/uvicorn", "--app-dir", "src", "fieldmaps_api.main:create_app_from_config", "--factory", "--host", "0.0.0.0", "--port", "8000"]
