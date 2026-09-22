FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:0.10.9 /uv /bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project
COPY src ./src
COPY tests ./tests
COPY certs ./certs
COPY config.local.json config.hosted.json config.render.json ./
# Shell form so PORT is expanded: hosts that assign a port set it, and 8000 is the local default.
CMD /app/.venv/bin/uvicorn --app-dir src fieldmaps_api.main:create_app_from_config --factory --host 0.0.0.0 --port ${PORT:-8000}
