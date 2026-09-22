#!/bin/sh
# Regenerate mobile/src/maps/sites/fall-creek from Ithaca_QGIS using QGIS's bundled Python.
# Usage: qgis/fall-creek/build.sh [path/to/Ithaca_QGIS]
set -eu
here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
app=${QGIS_APP:-/Applications/QGIS-final-4_2_2.app}/Contents
export PYTHONHOME="$app/Resources"
export PYTHONPATH="$app/Resources/python3.12:$app/Resources/python3.12/site-packages:$app/Resources/python3.12/lib-dynload"
export PROJ_DATA="$app/Resources/qgis/proj"
"$app/MacOS/python3.12" "$here/build.py" "$@"
"$app/MacOS/python3.12" "$here/qgis_project.py" "$@"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" && nvm use 24 >/dev/null
pnpm --dir "$here/../../mobile" exec biome format --write src/maps/sites/fall-creek >/dev/null
