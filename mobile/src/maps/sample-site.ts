import type { LngLatBounds, StyleSpecification } from "@maplibre/maplibre-react-native";
import type { FeatureCollection } from "geojson";
import type { Coordinate } from "../domain/observation";

/**
 * Hand-authored training geometry, not a QGIS export or a survey. It stands in as the first
 * offline site package so the collection workflow can be exercised before real package
 * ingestion exists; a real package replaces this data without touching the field flow.
 *
 * Everything renders from bundled GeoJSON: no tiles, no fonts, no map account, no network.
 */

export const sampleCenter: Coordinate = [-76.485, 42.448];
export const sampleBounds: LngLatBounds = [-76.487, 42.4466, -76.483, 42.4494];

function ring(west: number, south: number, east: number, north: number) {
  return [
    [
      [west, south],
      [east, south],
      [east, north],
      [west, north],
      [west, south],
    ],
  ];
}

/** The ground the base style paints: the site outline and its built structures. */
const ground: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "site" },
      geometry: { type: "Polygon", coordinates: ring(-76.4865, 42.447, -76.4835, 42.449) },
    },
    {
      type: "Feature",
      properties: { kind: "structure" },
      geometry: { type: "Polygon", coordinates: ring(-76.4861, 42.4481, -76.4852, 42.4487) },
    },
    {
      type: "Feature",
      properties: { kind: "structure" },
      geometry: { type: "Polygon", coordinates: ring(-76.4848, 42.4473, -76.4839, 42.4478) },
    },
  ],
};

export const sitePaths: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "path" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-76.4864, 42.4474],
          [-76.4854, 42.4477],
          [-76.485, 42.448],
          [-76.4846, 42.4485],
          [-76.4836, 42.4486],
        ],
      },
    },
    {
      type: "Feature",
      properties: { kind: "path" },
      geometry: {
        type: "LineString",
        coordinates: [
          [-76.4857, 42.4489],
          [-76.4855, 42.4481],
          [-76.4853, 42.4471],
        ],
      },
    },
  ],
};

export const siteTrees: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    [-76.486, 42.4474],
    [-76.4859, 42.4476],
    [-76.4843, 42.4482],
    [-76.484, 42.4484],
    [-76.485, 42.4488],
  ].map((coordinates) => ({
    type: "Feature" as const,
    properties: { kind: "tree" },
    geometry: { type: "Point" as const, coordinates },
  })),
};

export type SiteZone = {
  readonly id: string;
  readonly label: string;
  readonly centre: Coordinate;
  readonly west: number;
  readonly south: number;
  readonly east: number;
  readonly north: number;
};

export const siteZones: readonly SiteZone[] = [
  {
    id: "A",
    label: "Zone A · West lawn",
    centre: [-76.4857, 42.44835],
    west: -76.4864,
    south: 42.4478,
    east: -76.485,
    north: 42.4489,
  },
  {
    id: "B",
    label: "Zone B · North playground",
    centre: [-76.4843, 42.44845],
    west: -76.485,
    south: 42.448,
    east: -76.4836,
    north: 42.4489,
  },
  {
    id: "C",
    label: "Zone C · South court",
    centre: [-76.4843, 42.44745],
    west: -76.485,
    south: 42.447,
    east: -76.4836,
    north: 42.4479,
  },
];

export const zoneGeometry: FeatureCollection = {
  type: "FeatureCollection",
  features: siteZones.map((zone) => ({
    type: "Feature",
    properties: { kind: "zone", id: zone.id, label: zone.label },
    geometry: { type: "Polygon", coordinates: ring(zone.west, zone.south, zone.east, zone.north) },
  })),
};

function base(
  name: string,
  paint: {
    readonly background: string;
    readonly site: string;
    readonly siteEdge: string;
    readonly structure: string;
    readonly structureEdge: string;
  },
): StyleSpecification {
  return {
    version: 8,
    name,
    sources: { ground: { type: "geojson", data: ground } },
    layers: [
      { id: "background", type: "background", paint: { "background-color": paint.background } },
      {
        id: "site",
        type: "fill",
        source: "ground",
        filter: ["==", "kind", "site"],
        paint: { "fill-color": paint.site, "fill-outline-color": paint.siteEdge },
      },
      {
        id: "structures",
        type: "fill",
        source: "ground",
        filter: ["==", "kind", "structure"],
        paint: { "fill-color": paint.structure, "fill-outline-color": paint.structureEdge },
      },
    ],
  };
}

/**
 * Both bases stay subdued so the observations read first, and markers keep a dark halo and a
 * light ring so they hold their contrast on either one.
 */
export const planStyle = base("FieldOps plan base", {
  background: "#1b1d2b",
  site: "#20233a",
  siteEdge: "#2f3350",
  structure: "#24273a",
  structureEdge: "#4a4e5e",
});

export const aerialStyle = base("FieldOps aerial fixture", {
  background: "#20241d",
  site: "#272d20",
  siteEdge: "#333a29",
  structure: "#3a352b",
  structureEdge: "#4a4437",
});
