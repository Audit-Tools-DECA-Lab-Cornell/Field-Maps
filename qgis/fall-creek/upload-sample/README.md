# Fall Creek Elementary — web upload sample

Three GeoJSON files for dragging into the web upload screen
(`web/src/components/basemaps/PackageUpload.tsx`), built so the server's own package preparation
(`backend/src/fieldmaps_api/domain/packages.py`) accepts them, not just the browser's pre-flight
checks.

| File              | What it is                                               |
| ------------------ | --------------------------------------------------------- |
| `ground.geojson`  | One Polygon, `properties.kind = "site"` — the playground outline the server requires exactly one of. |
| `zones.geojson`   | One Polygon, the single zone the mobile app defines (`id: "A"`, `label: "Zone A · Whole playground"`). |
| `trees.geojson`   | 12 Points, the centroid of each tree canopy polygon, carrying the source's `kind: "tree"` property. |

`paths.geojson` is not included: the only "path" geometry in the source (`surfaces.json`,
`kind: "path"`) is two paved-area Polygons, not LineStrings. There is no line data to export, and
`paths` is not a required layer.

## Provenance

Derived from the mobile app's already-relocated bundled export at
`mobile/src/maps/sites/fall-creek/{site.json,trees.json}`, which `qgis/fall-creek/build.py`
generates from the real QGIS project named in `site.json`:

```
Ithaca_QGIS/Drawings/DECA_FALCR26001.qgz, relocated by qgis/fall-creek/build.py
```

That source `.qgz` (Weronika Kosciolek's drawings and drone orthomosaic for the Fall Creek
Elementary playground) is not committed to this repository — `build.py` reads it from a local
`Ithaca_QGIS/` checkout and writes the relocated GeoJSON this script starts from.

## How ground and zones were derived

`mobile/src/maps/fall-creek.ts` defines no separate "ground outline" of its own — there's no
polygon anywhere in the bundled export that plays that role. The closest analogue is `site.json`'s
`zone` box (`west`/`south`/`east`/`north`), which is also exactly what the mobile app uses for
`fallCreekZone`, its one observation zone, commented there as "the whole playground." That box is
used for both `ground.geojson` and `zones.geojson` here — they are the same rectangle. This mirrors
`mobile/src/maps/sample-site.ts`, whose training-fixture `ground` layer is likewise a `kind = site`
rectangle.

`site.json`'s other extent, `bounds`, is **not** used for ground: `build.py`'s own output labels it
the "pan bounds," a padded box (a 100 m margin baked in for map panning) rather than the
playground's actual footprint.

## Regenerate

```sh
python3 qgis/fall-creek/export_upload_sample.py
```

Deterministic and stdlib-only (reads the bundled JSON directly; does not touch `build.py`, does not
need QGIS or GDAL). Re-running produces byte-identical files.

## Caveat

This is derived from the mobile app's bundled, already-relocated data — not a fresh export taken
directly from QGIS for this purpose. It exercises the same shapes a real QGIS "Save Features As…"
GeoJSON export would produce (FeatureCollections, WGS 84 lon/lat, the `kind`/`id`/`label`
properties the server and browser both look for), but nobody opened QGIS and exported these three
files by hand.

## Validated against

- `backend/src/fieldmaps_api/domain/packages.py` — `prepare()` called directly with these three
  layers as a `PackageSubmission`: all five server checks pass, `blocked` is `False`.
- `web/src/lib/packages.ts` — the browser checks' logic (`EXPECTED_GEOMETRY`, `zoneLabelKey`,
  `bboxContains`, `looksProjected`) walked by hand against this data: every check passes.

## Drag these into the upload screen

```
qgis/fall-creek/upload-sample/ground.geojson
qgis/fall-creek/upload-sample/zones.geojson
qgis/fall-creek/upload-sample/trees.geojson
```
