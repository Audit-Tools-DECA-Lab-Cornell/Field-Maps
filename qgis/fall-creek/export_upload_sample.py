"""Derive a web-upload sample package for the Fall Creek Elementary playground.

The mobile app already bundles a relocated QGIS export at
`mobile/src/maps/sites/fall-creek/{site.json,surfaces.json,equipment.json,trees.json}` (written by
`qgis/fall-creek/build.py`, which corrects the Montana/Ithaca CRS mix-up described in its
docstring). This script does not touch that export or `build.py`. It re-shapes the *already
relocated* data the mobile package itself reads (see `mobile/src/maps/fall-creek.ts`) into the four
GeoJSON layers the web upload screen's slots expect: `ground`, `zones`, `trees` and (optionally)
`paths` — see `web/src/components/basemaps/PackageUpload.tsx` and `web/src/lib/packages.ts`, and the
server-side shape the archive must satisfy in `backend/src/fieldmaps_api/domain/packages.py`.

What each output layer is and how it is derived:

- `ground.geojson` — one Polygon, one feature, `properties.kind == "site"` (the server's
  `_require_layers` rejects a ground layer that does not have exactly one `kind = site` feature).
  `fall-creek.ts` defines no separate "ground outline" concept of its own — there is no polygon in
  the source data that plays that role. The closest analogue is `site.json`'s `zone` box
  (west/south/east/north), which is also what `fallCreekZone` uses as "the whole playground" and
  what the plan style's surfaces are clipped to visually. `site.json`'s `bounds` field is instead
  the *padded* pan extent (a 100 m margin for map panning, per `build.py`), not the playground's
  footprint, so it is not used here. This mirrors `mobile/src/maps/sample-site.ts`, where the
  training fixture's `ground` layer is likewise a `kind = site` rectangle.
- `zones.geojson` — the one zone the mobile package defines: `fallCreekZone` in
  `mobile/src/maps/fall-creek.ts`, built from the same `site.json` `zone` box, with `id: "A"` and
  `label: "Zone A · Whole playground"` carried over verbatim so the browser's zone-label check
  (`zoneLabelKey` in `web/src/lib/packages.ts`) reads the same label a manager would see on device.
- `trees.geojson` — one Point per tree canopy polygon in `trees.json`, at the polygon's
  area-weighted centroid (not a vertex average), carrying over each feature's source properties
  (only `kind: "tree"` exists in the source).
- `paths.geojson` is omitted. The only "path" geometry in `surfaces.json` is two Polygon features
  (`kind: "path"`, paved areas), not LineStrings — there is no line data in this source to export,
  and `paths` is not a required layer.

All coordinates are already WGS 84 longitude/latitude (that is what `build.py` relocates them
into); this script only rounds them to 7 decimal places and drops the source `kind`/zoom scaffolding
that does not belong in these four layers. No `crs` member is written (RFC 7946 has none, and the
server only tolerates one on a layer that names WGS 84 anyway).

Deterministic and stdlib-only: given the same bundled source files, it writes byte-identical output
every run. Regenerate with:

    python3 qgis/fall-creek/export_upload_sample.py
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROUND_DIGITS = 7

REPO_ROOT = Path(__file__).resolve().parents[2]
SITE_DIR = REPO_ROOT / "mobile" / "src" / "maps" / "sites" / "fall-creek"
OUT_DIR = Path(__file__).resolve().parent / "upload-sample"

Position = list[float]
Json = dict[str, Any]


def round_pos(position: list[float]) -> Position:
    return [round(position[0], ROUND_DIGITS), round(position[1], ROUND_DIGITS)]


def rectangle_ring(west: float, south: float, east: float, north: float) -> list[Position]:
    """A closed four-corner ring for a west/south/east/north box, CCW from the SW corner."""
    corners = [(west, south), (east, south), (east, north), (west, north), (west, south)]
    return [round_pos([lon, lat]) for lon, lat in corners]


def polygon_centroid(ring: list[list[float]]) -> Position:
    """Area-weighted centroid of a closed polygon ring (shoelace formula).

    Treats longitude/latitude as planar, which is accurate enough at the scale of a single tree
    canopy (a few metres across); it is not a geodesic solver. Coordinates are translated to the
    ring's first vertex before accumulating: at raw longitude/latitude magnitudes (~-76, ~42) the
    shoelace cross products lose almost all precision to catastrophic cancellation, which silently
    produced centroids tens of metres off before this translate-compute-translate-back step was
    added (caught by comparing against the source layers' own bounding box during validation).
    """
    points = ring[:-1] if ring[0] == ring[-1] else ring
    origin_x, origin_y = points[0][0], points[0][1]
    relative = [(x - origin_x, y - origin_y) for x, y in points]
    area = 0.0
    cx = 0.0
    cy = 0.0
    n = len(relative)
    for i in range(n):
        x0, y0 = relative[i]
        x1, y1 = relative[(i + 1) % n]
        cross = x0 * y1 - x1 * y0
        area += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    area *= 0.5
    if area == 0:
        # Degenerate ring (shouldn't happen for a traced canopy): fall back to a vertex average.
        avg_x = sum(x for x, _ in relative) / n
        avg_y = sum(y for _, y in relative) / n
        return round_pos([origin_x + avg_x, origin_y + avg_y])
    return round_pos([origin_x + cx / (6 * area), origin_y + cy / (6 * area)])


def feature_collection(features: list[Json]) -> Json:
    return {"type": "FeatureCollection", "features": features}


def write_json(path: Path, payload: Json) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def build_ground(zone: Json) -> Json:
    ring = rectangle_ring(zone["west"], zone["south"], zone["east"], zone["north"])
    return feature_collection(
        [
            {
                "type": "Feature",
                "properties": {"kind": "site"},
                "geometry": {"type": "Polygon", "coordinates": [ring]},
            }
        ]
    )


def build_zones(zone: Json) -> Json:
    ring = rectangle_ring(zone["west"], zone["south"], zone["east"], zone["north"])
    return feature_collection(
        [
            {
                "type": "Feature",
                # Matches fallCreekZone in mobile/src/maps/fall-creek.ts exactly.
                "properties": {"id": "A", "label": "Zone A · Whole playground"},
                "geometry": {"type": "Polygon", "coordinates": [ring]},
            }
        ]
    )


def build_trees(trees_source: Json) -> Json:
    features: list[Json] = []
    for feature in trees_source["features"]:
        ring = feature["geometry"]["coordinates"][0]
        centroid = polygon_centroid(ring)
        features.append(
            {
                "type": "Feature",
                "properties": dict(feature.get("properties") or {}),
                "geometry": {"type": "Point", "coordinates": centroid},
            }
        )
    return feature_collection(features)


def main() -> None:
    site = json.loads((SITE_DIR / "site.json").read_text())
    trees_source = json.loads((SITE_DIR / "trees.json").read_text())

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(OUT_DIR / "ground.geojson", build_ground(site["zone"]))
    write_json(OUT_DIR / "zones.geojson", build_zones(site["zone"]))
    write_json(OUT_DIR / "trees.geojson", build_trees(trees_source))

    print(f"Wrote ground.geojson, zones.geojson, trees.geojson to {OUT_DIR}")


if __name__ == "__main__":
    main()
