import type { LatLng, LngLat } from "@/types/geojson";

/** GeoJSON stores [longitude, latitude]; Leaflet wants [latitude, longitude]. */
export function toLatLng([longitude, latitude]: LngLat): LatLng {
	return [latitude, longitude];
}

/** A rectangular zone as the four Leaflet corners of its ring. */
export function boxToLatLngs(box: {
	readonly west: number;
	readonly south: number;
	readonly east: number;
	readonly north: number;
}): LatLng[] {
	return [
		[box.south, box.west],
		[box.south, box.east],
		[box.north, box.east],
		[box.north, box.west]
	];
}

/** Six decimal places is roughly 0.1 m at this latitude — past the precision of a tapped point. */
export function formatCoordinate(longitude: number, latitude: number): string {
	return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
