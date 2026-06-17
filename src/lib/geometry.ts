import { REGION_BOUNDS } from "@/data/parcels";
import type { PolygonCoordinates } from "@/types/domain";

// GeoJSON stores [lng, lat]; Leaflet wants [lat, lng]. Storage stays GeoJSON;
// convert only at the rendering boundary.

export type Vertex = [number, number]; // [lng, lat]
export type LatLng = [number, number]; // [lat, lng]

const SQM_PER_ACRE = 4046.8564224;
const M_PER_DEG_LAT = 110_540;
const M_PER_DEG_LNG_AT = (latDeg: number) => 111_320 * Math.cos((latDeg * Math.PI) / 180);

export const lngLatToLatLng = ([lng, lat]: Vertex): LatLng => [lat, lng];
export const latLngToLngLat = ([lat, lng]: LatLng): Vertex => [lng, lat];

export const outerRing = (coords: PolygonCoordinates): Vertex[] => (coords[0] ?? []) as Vertex[];

/** Drop the closing duplicate vertex, returning the list of real vertices. */
export function openRing(ring: Vertex[]): Vertex[] {
	if (ring.length < 2) return ring.slice();
	const first = ring[0];
	const last = ring[ring.length - 1];
	if (first[0] === last[0] && first[1] === last[1]) return ring.slice(0, -1);
	return ring.slice();
}

/** Re-close a list of real vertices into a GeoJSON ring. */
export function closeRing(open: Vertex[]): Vertex[] {
	if (open.length === 0) return open;
	return [...open, open[0]];
}

/** Number of distinct (non-closing) vertices in the outer ring. */
export function countRealVertices(coords: PolygonCoordinates): number {
	return openRing(outerRing(coords)).length;
}

/** Build full GeoJSON polygon coordinates from a list of real vertices. */
export function coordsFromOpen(open: Vertex[]): PolygonCoordinates {
	return [closeRing(open)];
}

/** Centroid (average of real vertices) as Leaflet [lat, lng]. */
export function polygonCenterLatLng(coords: PolygonCoordinates): LatLng {
	const open = openRing(outerRing(coords));
	if (open.length === 0) return [0, 0];
	let lng = 0;
	let lat = 0;
	for (const v of open) {
		lng += v[0];
		lat += v[1];
	}
	return [lat / open.length, lng / open.length];
}

/** Shoelace area of the ring in square meters (equirectangular approx). */
export function ringAreaSqMeters(coords: PolygonCoordinates): number {
	const open = openRing(outerRing(coords));
	if (open.length < 3) return 0;
	const lat0 = polygonCenterLatLng(coords)[0];
	const kx = M_PER_DEG_LNG_AT(lat0);
	const ky = M_PER_DEG_LAT;
	let sum = 0;
	for (let i = 0; i < open.length; i++) {
		const [lngA, latA] = open[i];
		const [lngB, latB] = open[(i + 1) % open.length];
		const xA = lngA * kx;
		const yA = latA * ky;
		const xB = lngB * kx;
		const yB = latB * ky;
		sum += xA * yB - xB * yA;
	}
	return Math.abs(sum) / 2;
}

export const sqMetersToAcres = (sqm: number): number => sqm / SQM_PER_ACRE;

/** Raw shoelace acreage of a polygon. */
export function estimateAcreage(coords: PolygonCoordinates): number {
	return sqMetersToAcres(ringAreaSqMeters(coords));
}

/** Acreage change between two polygons (draft minus original), shoelace-based. */
export function areaDeltaAcres(original: PolygonCoordinates, draft: PolygonCoordinates): number {
	return estimateAcreage(draft) - estimateAcreage(original);
}

/** Midpoints of each edge (including the wrap edge) as Leaflet [lat,lng]. */
export function edgeMidpointsLatLng(open: Vertex[]): LatLng[] {
	const mids: LatLng[] = [];
	for (let i = 0; i < open.length; i++) {
		const a = open[i];
		const b = open[(i + 1) % open.length];
		mids.push([(a[1] + b[1]) / 2, (a[0] + b[0]) / 2]);
	}
	return mids;
}

/** Insert a new vertex at the midpoint of edge `edgeIndex` (a → a+1). */
export function insertMidpoint(open: Vertex[], edgeIndex: number): Vertex[] {
	const a = open[edgeIndex];
	const b = open[(edgeIndex + 1) % open.length];
	const mid: Vertex = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
	const next = open.slice();
	next.splice(edgeIndex + 1, 0, mid);
	return next;
}

/** Remove a vertex; refuses if it would drop below 3 real vertices. */
export function removeVertex(open: Vertex[], index: number): Vertex[] {
	if (open.length <= 3) return open;
	const next = open.slice();
	next.splice(index, 1);
	return next;
}

export function moveVertex(open: Vertex[], index: number, position: Vertex): Vertex[] {
	const next = open.slice();
	next[index] = position;
	return next;
}

/** True if every vertex sits inside the demo region bounding box. */
export function withinRegionBounds(coords: PolygonCoordinates): boolean {
	return openRing(outerRing(coords)).every(
		([lng, lat]) =>
			lat >= REGION_BOUNDS.minLat &&
			lat <= REGION_BOUNDS.maxLat &&
			lng >= REGION_BOUNDS.minLng &&
			lng <= REGION_BOUNDS.maxLng
	);
}

/** Cheap segment-intersection self-intersection check for the outer ring. */
export function hasSelfIntersection(coords: PolygonCoordinates): boolean {
	const open = openRing(outerRing(coords));
	const n = open.length;
	if (n < 4) return false;
	for (let i = 0; i < n; i++) {
		const a1 = open[i];
		const a2 = open[(i + 1) % n];
		for (let j = i + 1; j < n; j++) {
			// skip adjacent and shared-endpoint edges
			if (j === i) continue;
			if ((j + 1) % n === i || (i + 1) % n === j) continue;
			const b1 = open[j];
			const b2 = open[(j + 1) % n];
			if (segmentsIntersect(a1, a2, b1, b2)) return true;
		}
	}
	return false;
}

function segmentsIntersect(p1: Vertex, p2: Vertex, p3: Vertex, p4: Vertex): boolean {
	const d = (a: Vertex, b: Vertex, c: Vertex) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
	const d1 = d(p3, p4, p1);
	const d2 = d(p3, p4, p2);
	const d3 = d(p1, p2, p3);
	const d4 = d(p1, p2, p4);
	return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
