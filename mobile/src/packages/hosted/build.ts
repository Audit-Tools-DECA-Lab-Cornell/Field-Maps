import type { StyleSpecification } from "@maplibre/maplibre-react-native";
import type { FeatureCollection } from "geojson";
import type { Coordinate } from "../../domain/observation";
import type { FormDefinition } from "../../forms/definition";
import { hexWithAlpha, type MapPalette, mapPalettes } from "../../maps/palette";
import type { SiteZone } from "../../maps/sample-site";
import type { LayerPaint, PackageLayer, SitePackage } from "../site-package";
import type { LayerData, ManifestZone, StoredPackage } from "./schemas";

/**
 * A downloaded site as the field map draws it. The plan is built from the package's own layers in the
 * shared map palette (`contracts/map-palettes.json`), as the bundled sites are: the ground layer by
 * each feature's `kind` (the site outline, surfaces such as grass or mulch, equipment and structures),
 * then paths, trees and the zones over it. Hosted packages carry no imagery, so Aerial is not offered.
 */

/** Surface kinds the palette colours, drawn in this order so paths sit above the ground under them. */
const SURFACES = ["dirt", "path", "blacktop", "mulch", "grass"] as const;

function plan(name: string, palette: MapPalette, ground: LayerData): StyleSpecification {
  const fill = (id: string, kind: string, paint: { fill: string; edge: string }) => ({
    id,
    type: "fill" as const,
    source: "ground",
    filter: ["==", "kind", kind] as ["==", string, string],
    paint: { "fill-color": paint.fill, "fill-outline-color": paint.edge },
  });
  return {
    version: 8,
    name,
    sources: { ground: { type: "geojson", data: ground as FeatureCollection } },
    layers: [
      { id: "background", type: "background", paint: { "background-color": palette.background } },
      fill("site", "site", palette.site),
      ...SURFACES.map((kind) => fill(`surface-${kind}`, kind, palette.surfaces[kind])),
      fill("equipment", "equipment", palette.equipment),
      fill("structures", "structure", palette.structure),
    ],
  };
}

/** Whether a layer's features are areas, lines or points, from the first one that has a geometry. */
function shape(layer: LayerData): "area" | "line" | "point" {
  const type = layer.features[0]?.geometry.type ?? "";
  if (type.endsWith("Polygon")) return "area";
  if (type.endsWith("LineString")) return "line";
  return "point";
}

function zonePaint(palette: MapPalette): LayerPaint {
  return {
    type: "fill",
    color: hexWithAlpha(palette.zone.fill, palette.zone.fillOpacity),
    outline: palette.zone.edge,
    dashed: true,
  };
}

function treePaint(palette: MapPalette, layer: LayerData): LayerPaint {
  if (shape(layer) === "area") {
    return {
      type: "fill",
      color: hexWithAlpha(palette.tree.fill, palette.tree.opacity),
      outline: palette.tree.edge,
      dashed: false,
    };
  }
  return { type: "circle", color: palette.tree.fill, radius: 9 };
}

function pathPaint(palette: MapPalette, layer: LayerData): LayerPaint {
  return shape(layer) === "area"
    ? { type: "fill", color: palette.path.line, outline: palette.path.line, dashed: false }
    : { type: "line", color: palette.path.line, width: 5 };
}

function overlays(stored: StoredPackage): PackageLayer[] {
  const { paths, trees, zones } = stored.layers;
  const layer = (
    id: string,
    name: string,
    data: LayerData,
    paint: (palette: MapPalette) => LayerPaint,
  ): PackageLayer => ({
    id,
    name,
    data: data as FeatureCollection,
    day: paint(mapPalettes.day),
    night: paint(mapPalettes.night),
    // No imagery: Aerial is never shown for a hosted site, so it repeats the Day paint.
    aerial: paint(mapPalettes.day),
  });
  return [
    ...(paths && paths.features.length > 0
      ? [layer("paths", "Paths", paths, (palette) => pathPaint(palette, paths))]
      : []),
    ...(trees && trees.features.length > 0
      ? [layer("trees", "Trees", trees, (palette) => treePaint(palette, trees))]
      : []),
    layer("zones", "Zone polygons", zones, zonePaint),
  ];
}

function isPosition(value: unknown): value is Coordinate {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  );
}

/** One polygon's rings, an outer ring then its holes, when it has at least a triangle. */
function polygonRings(polygon: unknown): Coordinate[][] | undefined {
  if (!Array.isArray(polygon)) return undefined;
  const parsed = polygon.map((ring) =>
    Array.isArray(ring) ? ring.filter(isPosition).map(([x, y]) => [x, y] as Coordinate) : [],
  );
  return parsed.length > 0 && (parsed[0]?.length ?? 0) >= 3 ? parsed : undefined;
}

/** A zone feature's parts: a Polygon's own rings, or each part of a MultiPolygon. */
function parts(geometry: LayerData["features"][number]["geometry"]): Coordinate[][][] {
  const polygons =
    geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)
      ? geometry.coordinates
      : geometry.type === "Polygon"
        ? [geometry.coordinates]
        : [];
  return polygons.flatMap((polygon) => {
    const rings = polygonRings(polygon);
    return rings ? [rings] : [];
  });
}

function siteZone(zone: ManifestZone, layer: LayerData): SiteZone {
  const feature = layer.features.find(
    (entry) => String(entry.properties?.["id"] ?? "") === zone.id,
  );
  const [polygon, ...moreParts] = feature ? parts(feature.geometry) : [];
  return {
    id: zone.id,
    label: zone.label,
    centre: [(zone.west + zone.east) / 2, (zone.south + zone.north) / 2],
    west: zone.west,
    south: zone.south,
    east: zone.east,
    north: zone.north,
    ...(polygon ? { polygon } : {}),
    ...(moreParts.length > 0 ? { moreParts } : {}),
  };
}

function megabytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function hostedSitePackage(
  stored: StoredPackage,
  forms: { readonly play: FormDefinition; readonly inventory: FormDefinition | null },
): SitePackage {
  const { manifest, layers } = stored;
  const zones = manifest.zones.map((zone) => siteZone(zone, layers.zones));
  const count = `${zones.length} ${zones.length === 1 ? "zone" : "zones"}`;
  return {
    id: stored.packageId,
    name: stored.siteName,
    meta: `${count} · package v${stored.packageVersion}`,
    availability: "on-device",
    formVersion: forms.play.version,
    inventoryFormVersion: forms.inventory?.version ?? "",
    version: `v${stored.packageVersion}`,
    siteId: stored.siteCode,
    sizeOnDevice: `${megabytes(stored.archiveBytes)} on device`,
    zones,
    inheritedContext: forms.inventory
      ? "Climate and the loose parts on hand come from this zone's latest Inventory round."
      : "A round inherits only its zone; this project has no inventory form.",
    centre: manifest.centre,
    bounds: [
      manifest.extent.west,
      manifest.extent.south,
      manifest.extent.east,
      manifest.extent.north,
    ],
    bases: {
      day: plan(`${stored.siteName} plan (day)`, mapPalettes.day, layers.ground),
      night: plan(`${stored.siteName} plan (night)`, mapPalettes.night, layers.ground),
      aerial: plan(`${stored.siteName} plan (day)`, mapPalettes.day, layers.ground),
    },
    layers: overlays(stored),
    projectId: stored.projectId,
    forms,
    aerialAvailable: false,
  };
}
