#!/bin/sh
# FieldMaps: use the EXISTING local-only, seeded Playwright/E2E stack.
set -eu
cd "$(dirname "$0")/.."
if [ "${1:-}" = "--help" ]; then
  echo 'Usage: sh scripts/screenshots-web.sh [--skip-seed] [additional Playwright arguments]'
  echo 'Default: retina desktop 1728 × 1117 @2x, tablet 1024/768 @2x, phone 390 @2x; Day and Dusk.'
  echo 'Capture output: assets/screenshots/web/raw/<device-project>/<theme>/<role>/...'
  exit 0
fi
if [ "${1:-}" = "--skip-seed" ]; then
  shift
  exec sh scripts/e2e-local.sh --skip-seed --project=screenshots-retina-1728 --project=tablet-1024 --project=tablet-768 --project=phone-390 e2e/screenshots.spec.ts "$@"
fi
exec sh scripts/e2e-local.sh --project=screenshots-retina-1728 --project=tablet-1024 --project=tablet-768 --project=phone-390 e2e/screenshots.spec.ts "$@"
