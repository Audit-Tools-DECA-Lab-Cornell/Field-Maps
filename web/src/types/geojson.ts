/**
 * The slice of GeoJSON this application draws. Positions are [longitude, latitude] in EPSG:4326,
 * as RFC 7946 and the database both require; Leaflet wants [latitude, longitude], so every handoff
 * to the map goes through `toLatLng` in `lib/geometry.ts` rather than reordering by hand.
 */

/** GeoJSON position: [longitude, latitude]. */
export type LngLat = [number, number];

/** Leaflet position: [latitude, longitude]. */
export type LatLng = [number, number];

export type Geometry =
	| { type: "Point"; coordinates: number[] }
	| { type: "LineString"; coordinates: number[][] }
	| { type: "Polygon"; coordinates: number[][][] };

export interface Feature {
	type: "Feature";
	properties: Record<string, unknown>;
	geometry: Geometry;
}

export interface FeatureCollection {
	type: "FeatureCollection";
	features: Feature[];
}
