"""Read only explicitly uploaded vector datasets through a restricted GDAL driver list."""

import json
from itertools import islice
from pathlib import Path
from typing import Final

import fiona
from fiona.model import to_dict
from fiona.transform import transform_geom

from fieldmaps_api.domain.geojson import Feature, FeatureCollection
from fieldmaps_api.domain.packages import MAX_FEATURES_PER_LAYER
from fieldmaps_api.domain.qgis_project import ProjectFileError

DRIVERS: Final = {
    ".gpkg": "GPKG",
    ".shp": "ESRI Shapefile",
    ".geojson": "GeoJSON",
    ".json": "GeoJSON",
}


def convert_vector(
    path: Path, layer: str | int | None, assigned_crs: str | None = None
) -> FeatureCollection:
    driver = DRIVERS.get(path.suffix.lower())
    if driver is None:
        message = "Include this layer as a GeoPackage, shapefile or GeoJSON."
        raise ProjectFileError(message)
    features: list[Feature] = []
    with fiona.open(path, enabled_drivers=[driver], layer=layer) as source:
        crs = assigned_crs or source.crs_wkt
        if not crs:
            message = (
                "This layer has no coordinate reference. "
                "Assign its correct CRS in QGIS and save it again."
            )
            raise ProjectFileError(message)
        for item in islice(source, MAX_FEATURES_PER_LAYER + 1):
            if len(features) >= MAX_FEATURES_PER_LAYER:
                message = "A layer may contain at most 20,000 features."
                raise ProjectFileError(message)
            if item.geometry is None:
                message = "This layer contains a feature without a shape. Fix it in QGIS."
                raise ProjectFileError(message)
            geometry = transform_geom(crs, "EPSG:4326", item.geometry)
            features.append(
                Feature.model_validate_json(
                    json.dumps(
                        {
                            "type": "Feature",
                            "geometry": to_dict(geometry),
                            "properties": {"id": item.id, **dict(item.properties)},
                        }
                    )
                )
            )
    return FeatureCollection(type="FeatureCollection", features=features)
