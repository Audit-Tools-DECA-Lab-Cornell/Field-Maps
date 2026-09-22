import type { Zone } from "@/types/domain";
import type { FeatureCollection } from "@/types/geojson";

/**
 * The same hand-authored training geometry the collector carries in
 * `mobile/src/maps/sample-site.ts`, to the coordinate. A manager looking at a zone on this map is
 * looking at the polygon the observer tapped inside; if the two drift, the web map is lying.
 *
 * It is not a survey or a QGIS export. A real site package replaces it without either application
 * changing, which is what `Base maps` is for.
 */

export const SITE_CENTRE: readonly [number, number] = [42.448, -76.485];
export const SITE_BOUNDS: readonly [[number, number], [number, number]] = [
	[42.4466, -76.487],
	[42.4494, -76.483]
];

/**
 * The zones' own extent, in Leaflet order. The map opens on this rather than on `SITE_BOUNDS`,
 * which is padded well past the geometry and would leave the site floating in an empty pane.
 */
export const ZONE_EXTENT: readonly [[number, number], [number, number]] = [
	[42.447, -76.4864],
	[42.4489, -76.4836]
];

function ring(west: number, south: number, east: number, north: number): number[][][] {
	return [
		[
			[west, south],
			[east, south],
			[east, north],
			[west, north],
			[west, south]
		]
	];
}

export const ZONES: readonly Zone[] = [
	{ id: "A", label: "Zone A · West lawn", west: -76.4864, south: 42.4478, east: -76.485, north: 42.4489 },
	{ id: "B", label: "Zone B · North playground", west: -76.485, south: 42.448, east: -76.4836, north: 42.4489 },
	{ id: "C", label: "Zone C · South court", west: -76.485, south: 42.447, east: -76.4836, north: 42.4479 }
];

/** The ground the collector's plan base paints: the site outline and its built structures. */
export const GROUND: FeatureCollection = {
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			properties: { kind: "site" },
			geometry: { type: "Polygon", coordinates: ring(-76.4865, 42.447, -76.4835, 42.449) }
		},
		{
			type: "Feature",
			properties: { kind: "structure" },
			geometry: { type: "Polygon", coordinates: ring(-76.4861, 42.4481, -76.4852, 42.4487) }
		},
		{
			type: "Feature",
			properties: { kind: "structure" },
			geometry: { type: "Polygon", coordinates: ring(-76.4848, 42.4473, -76.4839, 42.4478) }
		}
	]
};

export const PATHS: FeatureCollection = {
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
					[-76.4836, 42.4486]
				]
			}
		},
		{
			type: "Feature",
			properties: { kind: "path" },
			geometry: {
				type: "LineString",
				coordinates: [
					[-76.4857, 42.4489],
					[-76.4855, 42.4481],
					[-76.4853, 42.4471]
				]
			}
		}
	]
};

export const TREES: readonly (readonly [number, number])[] = [
	[-76.486, 42.4474],
	[-76.4859, 42.4476],
	[-76.4843, 42.4482],
	[-76.484, 42.4484],
	[-76.485, 42.4488]
];

export const ZONE_GEOMETRY: FeatureCollection = {
	type: "FeatureCollection",
	features: ZONES.map(zone => ({
		type: "Feature",
		properties: { kind: "zone", id: zone.id, label: zone.label },
		geometry: { type: "Polygon", coordinates: ring(zone.west, zone.south, zone.east, zone.north) }
	}))
};

/**
 * The plan base paint, copied from the collector's `planStyle`. Both bases stay subdued so the
 * observations read first.
 *
 * These are literals for one reason: Leaflet's path options are passed to canvas and SVG
 * attributes by JavaScript and cannot read a CSS custom property, so the map cannot reach the
 * Nocturne tokens the rest of the application uses. This object is therefore the single place the
 * plan palette is written down — anything that paints the plan reads it from here rather than
 * repeating a hex. The zone values are the `--color-accent` ramp at the steps named beside them.
 */
export const PLAN_PAINT = {
	site: "#20233a",
	siteEdge: "#2f3350",
	structure: "#24273a",
	structureEdge: "#4a4e5e",
	path: "#2f3243",
	tree: "#2b3527",
	/** --color-accent */
	zone: "#9184d9",
	/** --color-accent-600 */
	zoneEdge: "#796cbf",
	/** --color-accent-400 */
	zoneEdgeStrong: "#b5abfc",
	zoneFillOpacity: 0.06
} as const;
