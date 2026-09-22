import type { LngLatBounds, StyleSpecification } from "@maplibre/maplibre-react-native";
import type { FeatureCollection } from "geojson";
import type { Coordinate } from "../domain/observation";

export const sampleCenter: Coordinate = [-76.485, 42.448];
export const sampleBounds: LngLatBounds = [-76.487, 42.4466, -76.483, 42.4494];

const sampleGeometry: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { kind: "garden" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-76.4865, 42.447],
            [-76.4835, 42.447],
            [-76.4835, 42.449],
            [-76.4865, 42.449],
            [-76.4865, 42.447],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { kind: "play" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-76.4861, 42.4481],
            [-76.4852, 42.4481],
            [-76.4852, 42.4487],
            [-76.4861, 42.4487],
            [-76.4861, 42.4481],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { kind: "court" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-76.4848, 42.4473],
            [-76.4839, 42.4473],
            [-76.4839, 42.4478],
            [-76.4848, 42.4478],
            [-76.4848, 42.4473],
          ],
        ],
      },
    },
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
    ...[
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
  ],
};

export const sampleStyle: StyleSpecification = {
  version: 8,
  name: "FieldOps bundled training site",
  sources: { site: { type: "geojson", data: sampleGeometry } },
  layers: [
    { id: "background", type: "background", paint: { "background-color": "#EDEEE7" } },
    {
      id: "garden",
      type: "fill",
      source: "site",
      filter: ["==", "kind", "garden"],
      paint: { "fill-color": "#D2DFC6", "fill-outline-color": "#A7BEA0" },
    },
    {
      id: "play",
      type: "fill",
      source: "site",
      filter: ["==", "kind", "play"],
      paint: { "fill-color": "#E8D8B6", "fill-outline-color": "#C9B58C" },
    },
    {
      id: "court",
      type: "fill",
      source: "site",
      filter: ["==", "kind", "court"],
      paint: { "fill-color": "#B8CEC5", "fill-outline-color": "#8AAFA2" },
    },
    {
      id: "path-outline",
      type: "line",
      source: "site",
      filter: ["==", "kind", "path"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#C5C4B4", "line-width": 20 },
    },
    {
      id: "path",
      type: "line",
      source: "site",
      filter: ["==", "kind", "path"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#F5F1DF", "line-width": 16 },
    },
    {
      id: "trees",
      type: "circle",
      source: "site",
      filter: ["==", "kind", "tree"],
      paint: {
        "circle-color": "#8AAE86",
        "circle-radius": 13,
        "circle-stroke-color": "#759B72",
        "circle-stroke-width": 1,
      },
    },
  ],
};
