"""Rebuild the Fall Creek Elementary playground base map for the mobile app.

Weronika's drawings and orthomosaic (Ithaca_QGIS/) agree with each other but sit in Montana
(-114.855, 47.550). Their reference XYZ layers were given the layer CRS EPSG:2261, while XYZ tiles
are always EPSG:3857, so QGIS drew the tiles far west and everything traced over them followed.
The PDF's georeferencer points confirm it: labelled EPSG:2261, holding Web Mercator values for Ithaca.

Undoing it is exact per coordinate: project the saved Web Mercator position into EPSG:2261 (the
operation QGIS applied when drawing the tiles) and read the numbers as Web Mercator again.
Run through ./build.sh, which supplies QGIS's bundled Python (GDAL, pyproj, numpy, Pillow).
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
from osgeo import gdal, ogr
from PIL import Image
from pyproj import Transformer
from pyproj.transformer import TransformerGroup

gdal.UseExceptions()

REPO = Path(__file__).resolve().parents[2]
SOURCE = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else REPO / "Ithaca_QGIS"
OUT = REPO / "mobile" / "src" / "maps" / "sites" / "fall-creek"
MATTE = (0x20, 0x24, 0x1D)  # the aerial base background; fills the photo where the drone saw nothing
MAX_SIDE = 2048

# Shapefile, app file, kind — QGIS drawing order, bottom first.
LAYERS = (
    ("dirt", "surfaces", "dirt"),
    ("paths", "surfaces", "path"),
    ("blacktop", "surfaces", "blacktop"),
    ("mulch", "surfaces", "mulch"),
    ("grass", "surfaces", "grass"),
    ("play_structure", "equipment", "play-structure"),
    ("small_play_structure", "equipment", "small-play-structure"),
    ("swings", "equipment", "swings"),
    ("mini_amphitheater", "equipment", "amphitheater"),
    ("picnic_tables", "equipment", "picnic-table"),
    ("boxes", "equipment", "box"),
    ("Trees", "trees", "tree"),
)


def misread() -> Transformer:
    # PROJ offers only the null NAD83 -> WGS 84 shift for Montana coordinates; pin it.
    for t in TransformerGroup("EPSG:3857", "EPSG:2261", always_xy=True).transformers:
        if "Inverse of NAD83 to WGS 84 (1)" in t.description.split(" + "):
            return t
    raise SystemExit("PROJ lacks the null NAD83 to WGS 84 operation (EPSG:1188).")


MISREAD = misread()
TO_MERC = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
TO_LONLAT = Transformer.from_crs("EPSG:3857", "EPSG:4326", always_xy=True)


def relocate(coords):
    if isinstance(coords[0], (int, float)):
        u, v = MISREAD.transform(*TO_MERC.transform(coords[0], coords[1]))
        lon, lat = TO_LONLAT.transform(u, v)
        return [round(lon, 7), round(lat, 7)]
    return [relocate(c) for c in coords]


def vectors():
    files: dict[str, list] = {}
    xs, ys = [], []
    for stem, file, kind in LAYERS:
        ds = ogr.Open(str(SOURCE / "Drawings" / f"{stem}.shp"))
        for feature in ds.GetLayer(0):
            geom = json.loads(feature.GetGeometryRef().ExportToJson())
            geom["coordinates"] = relocate(geom["coordinates"])
            files.setdefault(file, []).append(
                {"type": "Feature", "properties": {"kind": kind}, "geometry": geom}
            )
            polygons = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
            for lon, lat in (point for rings in polygons for ring in rings for point in ring):
                xs.append(lon)
                ys.append(lat)
    for file, features in files.items():
        (OUT / f"{file}.json").write_text(
            json.dumps({"type": "FeatureCollection", "features": features}) + "\n"
        )
    return min(xs), min(ys), max(xs), max(ys)


def aerial():
    src = SOURCE / "Data" / "georeferenced_Fall_Creek_Playground.tif"
    tmp = "/vsimem/fall-creek-2261.tif"
    # Output grid numbers in EPSG:2261 are the photo's true Web Mercator coordinates.
    gdal.Warp(tmp, str(src), dstSRS="EPSG:2261", coordinateOperation=MISREAD.definition,
              resampleAlg="bilinear", srcAlpha=True, dstAlpha=True)
    ds = gdal.Open(tmp)
    x0, dx, _, y0, _, dy = ds.GetGeoTransform()
    rgba = np.dstack([ds.GetRasterBand(i).ReadAsArray() for i in range(1, 5)])
    rows, cols = np.nonzero(rgba[:, :, 3])
    r0, r1, c0, c1 = rows.min(), rows.max() + 1, cols.min(), cols.max() + 1
    rgba = rgba[r0:r1, c0:c1].astype(np.float32)
    alpha = rgba[:, :, 3:4] / 255
    rgb = rgba[:, :, :3] * alpha + np.array(MATTE, np.float32) * (1 - alpha)
    image = Image.fromarray(rgb.round().astype(np.uint8))
    image.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
    image.save(OUT / "aerial.jpg", quality=82, optimize=True, progressive=True)
    west, north = TO_LONLAT.transform(x0 + c0 * dx, y0 + r0 * dy)
    east, south = TO_LONLAT.transform(x0 + c1 * dx, y0 + r1 * dy)
    gdal.Unlink(tmp)
    return [[west, north], [east, north], [east, south], [west, south]]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    west, south, east, north = vectors()
    corners = [[round(a, 7), round(b, 7)] for a, b in aerial()]
    lat = (south + north) / 2
    m_lon = 111_320 * math.cos(math.radians(lat))
    span = max((east - west) * m_lon, (north - south) * 110_574)
    # Frame the playground's larger side across ~320 map points (MapLibre uses 512 px tiles).
    zoom = round(math.log2(320 * 40_075_016.686 * math.cos(math.radians(lat)) / (512 * span)), 1)
    margin = 100  # metres of pan room around the playground
    site = {
        "source": "Ithaca_QGIS/Drawings/DECA_FALCR26001.qgz, relocated by qgis/fall-creek/build.py",
        "centre": [round((west + east) / 2, 7), round(lat, 7)],
        "bounds": [round(west - margin / m_lon, 7), round(south - margin / 110_574, 7),
                   round(east + margin / m_lon, 7), round(north + margin / 110_574, 7)],
        "zone": {"west": west, "south": south, "east": east, "north": north, "zoom": zoom},
        "aerial": {"corners": corners, "matte": "#{:02x}{:02x}{:02x}".format(*MATTE)},
    }
    (OUT / "site.json").write_text(json.dumps(site, indent=2) + "\n")
    print(json.dumps(site, indent=2))


if __name__ == "__main__":
    main()
