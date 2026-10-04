.PHONY: openapi

openapi:
	uv run --frozen --no-sync --offline --directory . -- python -m fieldmaps_api.openapi > ../contracts/openapi.json.tmp
	mv ../contracts/openapi.json.tmp ../contracts/openapi.json

export PYTHONPATH := src
