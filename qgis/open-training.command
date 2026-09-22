#!/bin/sh
set -eu

qgis_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
qgis_binary=/Applications/QGIS-final-4_2_2.app/Contents/MacOS/QGIS-final-4_2_2

if [ ! -x "$qgis_binary" ]; then
  printf '%s\n' 'QGIS 4.2.2 was not found. Update qgis_binary in this launcher to your installed QGIS executable.' >&2
  exit 1
fi

export PGSERVICEFILE="$qgis_dir/pg_service.conf"
exec "$qgis_binary" --project "$qgis_dir/fieldmaps-training.qgs"
