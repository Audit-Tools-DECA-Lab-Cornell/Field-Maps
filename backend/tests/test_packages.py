import json
import zipfile
from base64 import b64encode
from io import BytesIO
from typing import cast

import pytest
from pydantic import ValidationError

from fieldmaps_api.packages import (
    PackageError,
    PackageSubmission,
    PreparationCheck,
    prepare,
)

Json = dict[str, object]


def read_json(payload: bytes) -> Json:
    parsed = cast("object", json.loads(payload))
    assert isinstance(parsed, dict)
    return cast("Json", parsed)


def collection(*features: Json) -> Json:
    return {"type": "FeatureCollection", "features": list(features)}


def polygon(west: float, south: float, east: float, north: float, **properties: object) -> Json:
    return {
        "type": "Feature",
        "properties": properties,
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[west, south], [east, south], [east, north], [west, north], [west, south]]
            ],
        },
    }


def ground_layer() -> Json:
    return collection(
        polygon(-76.4865, 42.447, -76.4835, 42.449, kind="site"),
        polygon(-76.4861, 42.4481, -76.4852, 42.4487, kind="structure"),
    )


def zones_layer() -> Json:
    return collection(
        polygon(-76.4864, 42.4478, -76.485, 42.4489, id="A", label="Zone A · West lawn"),
        polygon(-76.485, 42.448, -76.4836, 42.4489, id="B"),
    )


def layers(**overrides: Json) -> Json:
    return {"ground": ground_layer(), "zones": zones_layer(), **overrides}


def submission(**overrides: object) -> PackageSubmission:
    payload: Json = {
        "site_code": "NORTH",
        "form_version": "janet-test-v1",
        "layers": layers(),
    }
    payload.update(overrides)
    return PackageSubmission.model_validate(payload)


def project_file(document: str, *, name: str = "riverside_north.qgz") -> Json:
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("riverside_north.qgs", document)
    return {"file_name": name, "content": b64encode(buffer.getvalue()).decode()}


def qgis_document(layers: str = "", *, title: str = "Riverside north") -> str:
    return (
        '<qgis version="3.40"><title>' + title + "</title>"
        "<projectCrs><spatialrefsys><authid>EPSG:26910</authid></spatialrefsys></projectCrs>"
        "<projectlayers>" + layers + "</projectlayers></qgis>"
    )


def vector_layer(name: str) -> str:
    return (
        f'<maplayer type="vector"><layername>{name}</layername>'
        f"<provider>ogr</provider><datasource>./my-site.gpkg|layername={name}</datasource>"
        "</maplayer>"
    )


def raster_layer(name: str, provider: str, datasource: str) -> str:
    return (
        f'<maplayer type="raster"><layername>{name}</layername>'
        f"<provider>{provider}</provider><datasource>{datasource}</datasource></maplayer>"
    )


def find(checks: tuple[PreparationCheck, ...], step: str) -> PreparationCheck:
    return next(check for check in checks if check.step == step)


def test_a_valid_submission_prepares_a_readable_archive() -> None:
    prepared = prepare(submission())

    assert not prepared.blocked
    with zipfile.ZipFile(BytesIO(prepared.archive)) as archive:
        assert sorted(archive.namelist()) == [
            "layers/ground.json",
            "layers/zones.json",
            "manifest.json",
        ]
        manifest = read_json(archive.read("manifest.json"))
        ground = read_json(archive.read("layers/ground.json"))
    assert manifest["site_code"] == "NORTH"
    assert manifest["form_version"] == "janet-test-v1"
    assert manifest["format"] == 1
    assert ground["type"] == "FeatureCollection"
    assert ground["features"] == ground_layer()["features"]


def test_preparing_the_same_submission_twice_yields_the_same_bytes() -> None:
    # No clock is injected: the archive carries no timestamp, so its digest is a content
    # identity and the same submission prepared tomorrow is byte-identical to today's.
    first = prepare(submission())
    second = prepare(submission())

    assert first.archive == second.archive
    assert first.archive_sha256 == second.archive_sha256


def test_zones_become_their_drawn_bounds_and_fall_back_to_their_id_for_a_label() -> None:
    zones = prepare(submission()).manifest.zones

    assert [zone.id for zone in zones] == ["A", "B"]
    assert zones[0].label == "Zone A · West lawn"
    assert zones[1].label == "B"
    assert (zones[0].west, zones[0].south, zones[0].east, zones[0].north) == (
        -76.4864,
        42.4478,
        -76.485,
        42.4489,
    )


def test_the_extent_covers_every_layer_with_a_margin() -> None:
    extent = prepare(submission()).manifest.extent

    assert extent.west < -76.4865
    assert extent.east > -76.4835
    assert extent.south < 42.447
    assert extent.north > 42.449
    assert extent.centre() == pytest.approx((-76.485, 42.448), abs=1e-3)


def test_a_projected_export_is_refused_before_it_can_be_packaged() -> None:
    # Metres in a UTM zone, which is what "Save Features As" writes when the CRS is left alone.
    projected = collection(polygon(541_000, 4_700_000, 541_200, 4_700_200, kind="site"))

    with pytest.raises(ValidationError, match="EPSG:4326"):
        submission(layers={"ground": projected, "zones": zones_layer()})


def test_a_declared_non_wgs84_crs_blocks_the_coordinate_check() -> None:
    zones = collection(polygon(-76.4864, 42.4478, -76.485, 42.4489, id="A"))
    zones["crs"] = {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::26910"}}

    prepared = prepare(submission(layers=layers(zones=zones)))

    check = find(prepared.checks, "coordinate-reference")
    assert check.state == "blocked"
    assert "EPSG:4326" in check.detail
    assert prepared.blocked


def test_a_package_needs_a_ground_and_a_zones_layer() -> None:
    with pytest.raises(PackageError, match="zones"):
        prepare(submission(layers={"ground": collection(polygon(0, 0, 1, 1, kind="site"))}))


def test_a_site_needs_exactly_one_outline() -> None:
    two_outlines = collection(
        polygon(-76.4865, 42.447, -76.4835, 42.449, kind="site"),
        polygon(-76.486, 42.4471, -76.484, 42.4489, kind="site"),
    )
    with pytest.raises(PackageError, match="exactly one feature with kind = site"):
        prepare(submission(layers=layers(ground=two_outlines)))


def test_every_zone_needs_a_distinct_id() -> None:
    repeated = collection(
        polygon(-76.4864, 42.4478, -76.485, 42.4489, id="A"),
        polygon(-76.485, 42.448, -76.4836, 42.4489, id="A"),
    )
    with pytest.raises(PackageError, match="distinct"):
        prepare(submission(layers=layers(zones=repeated)))

    unnamed = collection(polygon(-76.4864, 42.4478, -76.485, 42.4489, label="West lawn"))
    with pytest.raises(PackageError, match="has no id"):
        prepare(submission(layers=layers(zones=unnamed)))


def test_without_a_project_file_the_source_step_says_so_rather_than_claiming_a_pass() -> None:
    check = find(prepare(submission()).checks, "source-project")

    assert check.state == "skipped"
    assert "No QGIS project was supplied" in check.detail


def test_a_tile_service_blocks_the_licence_check() -> None:
    document = qgis_document(
        raster_layer(
            "Google Satellite",
            "wms",
            "type=xyz&amp;url=https://mt1.google.com/vt/lyrs%3Ds%26x%3D{x}&amp;zmax=19",
        )
    )

    prepared = prepare(submission(project_file=project_file(document)))

    check = find(prepared.checks, "imagery-licence")
    assert check.state == "blocked"
    assert "mt1.google.com" in check.detail
    assert prepared.blocked


def test_a_named_host_is_permitted_and_a_held_file_needs_no_naming() -> None:
    tiles = qgis_document(
        raster_layer("Orthoimagery", "wms", "type=xyz&amp;url=https://gis.ny.gov/t")
    )
    allowed = prepare(
        submission(project_file=project_file(tiles)), permitted_tile_hosts=frozenset({"gis.ny.gov"})
    )
    assert find(allowed.checks, "imagery-licence").state == "passed"

    own_file = qgis_document(raster_layer("Drone survey", "gdal", "/srv/imagery/riverside.tif"))
    held = prepare(submission(project_file=project_file(own_file)))
    assert find(held.checks, "imagery-licence").state == "passed"
    assert not held.blocked


def test_a_project_layer_with_no_export_warns_without_blocking() -> None:
    document = qgis_document(vector_layer("ground") + vector_layer("zones") + vector_layer("paths"))

    prepared = prepare(submission(project_file=project_file(document)))

    check = find(prepared.checks, "layer-sources")
    assert check.state == "warning"
    assert "paths" in check.detail
    assert not prepared.blocked


def test_the_source_step_reports_what_it_read() -> None:
    document = qgis_document(vector_layer("ground") + vector_layer("zones"))

    prepared = prepare(submission(project_file=project_file(document)))

    assert find(prepared.checks, "source-project").state == "passed"
    assert prepared.manifest.source_project is not None
    assert prepared.manifest.source_project.title == "Riverside north"
    assert prepared.manifest.source_project.crs == "EPSG:26910"


def test_a_project_declaring_entities_is_refused() -> None:
    hostile = (
        '<?xml version="1.0"?><!DOCTYPE qgis [<!ENTITY a "aaaaaaaaaa">]>'
        "<qgis><title>&a;</title></qgis>"
    )

    with pytest.raises(PackageError, match="entities"):
        prepare(submission(project_file=project_file(hostile)))


def test_the_coordinate_step_reports_the_projects_own_crs_without_blocking_on_it() -> None:
    # Drawing over Web Mercator tiles is the documented way to trace a site, so a project CRS
    # that is not WGS 84 is recorded, not refused. The exported geometry is what ships.
    document = qgis_document(vector_layer("ground") + vector_layer("zones"))

    prepared = prepare(submission(project_file=project_file(document)))

    check = find(prepared.checks, "coordinate-reference")
    assert check.state == "passed"
    assert "EPSG:26910" in check.detail
