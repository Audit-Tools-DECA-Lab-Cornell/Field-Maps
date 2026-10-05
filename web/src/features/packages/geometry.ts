import { interiorAnchor, type PlanPoint, polygonCentroid, type ProjectedSite } from "@/lib/plan";

import type { ZoneRing } from "./store";

/**
 * Lays edited zone rings (plan units, from the zone editor) over a projected site, so a draft or a version
 * activated from one draws its own boundaries. Zones without a ring keep the package geometry and their
 * label point.
 */
export function withRings(site: ProjectedSite, rings: Record<string, ZoneRing> | undefined): ProjectedSite {
	if (!rings || Object.keys(rings).length === 0) return site;
	return {
		...site,
		zones: site.zones.map(zone => {
			const ring = rings[zone.id];
			if (!ring || sameRing(ring, zone.points)) return zone;
			const points: PlanPoint[] = ring.map(([x, y]) => [x, y] as const);
			return { ...zone, points, centroid: polygonCentroid(points), labelAnchor: interiorAnchor(points) };
		})
	};
}

/** Plan points rounded to whole map units, as the editor shows and stores them. */
export function roundRing(points: readonly PlanPoint[]): ZoneRing {
	return points.map(([x, y]) => [Math.round(x), Math.round(y)]);
}

export function sameRing(
	a: readonly (readonly [number, number])[],
	b: readonly (readonly [number, number])[]
): boolean {
	if (a.length !== b.length) return false;
	return a.every(([x, y], index) => {
		const other = b[index];
		return other !== undefined && Math.round(other[0]) === Math.round(x) && Math.round(other[1]) === Math.round(y);
	});
}
