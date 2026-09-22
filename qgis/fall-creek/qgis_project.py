"""Write a corrected copy of Weronika's QGIS project into <Ithaca_QGIS>/Corrected.

Same layers and styles as Drawings/DECA_FALCR26001.qgz, but pointed at relocated data (a
GeoPackage and GeoTIFF built with build.py's correction), with the XYZ base maps back in
EPSG:3857. Weronika's files are not modified. The live observations layer is added by hand after
the project opens: QGIS 4.2.2 crashed when its password prompt appeared during project loading.
"""

import copy
import json
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

from osgeo import gdal, ogr, osr

import build

OUT = build.SOURCE / "Corrected"
GPKG = OUT / "fall_creek_playground.gpkg"
TIF = OUT / "fall_creek_orthomosaic.tif"
QGZ = OUT / "DECA_FALCR26001_corrected.qgz"


def relocate_full(coords):
    if isinstance(coords[0], (int, float)):
        u, v = build.MISREAD.transform(*build.TO_MERC.transform(coords[0], coords[1]))
        return list(build.TO_LONLAT.transform(u, v))
    return [relocate_full(c) for c in coords]


def geopackage():
    GPKG.unlink(missing_ok=True)
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    out = ogr.GetDriverByName("GPKG").CreateDataSource(str(GPKG))
    for stem, _, _ in build.LAYERS:
        src_ds = ogr.Open(str(build.SOURCE / "Drawings" / f"{stem}.shp"))
        src = src_ds.GetLayer(0)
        dst = out.CreateLayer(stem, srs, src.GetGeomType())
        defn = src.GetLayerDefn()
        for i in range(defn.GetFieldCount()):
            dst.CreateField(defn.GetFieldDefn(i))
        for feature in src:
            geom = json.loads(feature.GetGeometryRef().ExportToJson())
            geom["coordinates"] = relocate_full(geom["coordinates"])
            copy_ = ogr.Feature(dst.GetLayerDefn())
            copy_.SetFrom(feature)
            copy_.SetGeometry(ogr.CreateGeometryFromJson(json.dumps(geom)))
            dst.CreateFeature(copy_)
    out = None


def orthomosaic():
    tmp = "/vsimem/ortho-2261.tif"
    src = build.SOURCE / "Data" / "georeferenced_Fall_Creek_Playground.tif"
    gdal.Warp(tmp, str(src), dstSRS="EPSG:2261", coordinateOperation=build.MISREAD.definition,
              resampleAlg="bilinear", srcAlpha=True, dstAlpha=True)
    # The grid's EPSG:2261 numbers are the photo's true Web Mercator coordinates: relabel them.
    gdal.Translate(str(TIF), tmp, outputSRS="EPSG:3857",
                   creationOptions=["COMPRESS=DEFLATE", "PREDICTOR=2", "TILED=YES"])
    gdal.Unlink(tmp)
    ds = gdal.Open(str(TIF), gdal.GA_Update)
    ds.BuildOverviews("AVERAGE", [2, 4, 8])
    x0, dx, _, y0, _, dy = ds.GetGeoTransform()
    return x0, y0 + dy * ds.RasterYSize, x0 + dx * ds.RasterXSize, y0


def project(extent):
    with zipfile.ZipFile(build.SOURCE / "Drawings" / "DECA_FALCR26001.qgz") as z:
        qgs_name = next(n for n in z.namelist() if n.endswith(".qgs"))
        others = {n: z.read(n) for n in z.namelist() if n != qgs_name}
        tree = ET.ElementTree(ET.fromstring(z.read(qgs_name)))
    root = tree.getroot()
    merc_srs = None
    for layer in root.iter("maplayer"):
        if layer.findtext("provider") == "gdal":
            merc_srs = layer.find("srs")

    def resource(source, provider):
        if provider == "ogr":
            return f"./{GPKG.name}|layername={Path(source).stem}"
        if provider == "gdal":
            return f"./{TIF.name}"
        return source.replace("crs=EPSG%3A2261", "crs=EPSG%3A3857")

    for layer in root.iter("maplayer"):
        provider = layer.findtext("provider")
        ds = layer.find("datasource")
        ds.text = resource(ds.text, provider)
        if provider == "wms":  # XYZ tiles are always Web Mercator
            layer.remove(layer.find("srs"))
            layer.insert(list(layer).index(ds) + 1, copy.deepcopy(merc_srs))
        else:
            for tag in ("extent", "wgs84extent"):
                for el in layer.findall(tag):
                    layer.remove(el)
    show = {"ESRI World Imagery", "georeferenced_Fall_Creek_Playground"}
    for node in root.iter("layer-tree-layer"):
        node.set("source", resource(node.get("source"), node.get("providerKey")))
        if node.get("name") in show:
            node.set("checked", "Qt::Checked")
    for node in root.iter("legendlayer"):
        if node.get("name") in show:
            node.set("checked", "Qt::Checked")
            for f in node.iter("legendlayerfile"):
                f.set("visible", "1")

    xmin, ymin, xmax, ymax = extent
    for canvas in root.iter("mapcanvas"):
        for el, value in zip(("xmin", "ymin", "xmax", "ymax"), (xmin, ymin, xmax, ymax)):
            node = canvas.find(f"extent/{el}")
            if node is not None:
                node.text = repr(value)

    QGZ.unlink(missing_ok=True)
    with zipfile.ZipFile(QGZ, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr(QGZ.with_suffix(".qgs").name,
                   b"<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>\n"
                   + ET.tostring(root, encoding="utf-8"))
        for name, data in others.items():
            z.writestr(name, data)


def launcher():
    path = OUT / "open-in-qgis.command"
    path.write_text(f"""#!/bin/sh
# Opens the corrected Fall Creek project with the FieldMaps service file, so the live
# observations layer can be added afterwards with service fieldmaps_training (qgis/README.md).
export PGSERVICEFILE="{build.REPO / 'qgis' / 'pg_service.conf'}"
exec /Applications/QGIS-final-4_2_2.app/Contents/MacOS/QGIS-final-4_2_2 --project "{QGZ}"
""")
    path.chmod(0o755)


OUT.mkdir(exist_ok=True)
geopackage()
x0, y0, x1, y1 = orthomosaic()
pad = 40  # metres of Web Mercator around the photo
project((x0 - pad, y0 - pad, x1 + pad, y1 + pad))
launcher()
print("wrote", *sorted(p.name for p in OUT.iterdir()))
