// Lightweight GeoJSON helper aliases used across the map layer.
// Leaflet expects [lat, lng] tuples while GeoJSON stores [lng, lat] — the
// helpers in lib/geometry.ts handle the conversion.

import type { FieldMarkerAsset, ParcelAsset } from "./domain";

/** GeoJSON position: [longitude, latitude]. */
export type LngLat = [number, number];

/** Leaflet position: [latitude, longitude]. */
export type LatLng = [number, number];

export type AnyFeature = ParcelAsset | FieldMarkerAsset;

export interface FeatureCollection<T> {
	type: "FeatureCollection";
	features: T[];
}
