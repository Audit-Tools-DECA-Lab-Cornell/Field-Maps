import { type Observation, ZONES } from "@/fixtures";
import { fromPlan, placeInZone, type PlanPoint, type PlanZone, pointInPolygon, type ProjectedSite } from "@/lib/plan";

import { zoneName } from "./filters";

/** Where an observation sits on its site, in the site's longitude and latitude. */
export type MarkerPosition = { lng: number; lat: number };

/** Room a marker keeps from its zone's name pill, in plan units: about the pill's size plus a marker. */
const PILL_CLEARANCE = { charWidth: 9, padX: 30, halfHeight: 27 } as const;

/**
 * A marker that would sit under its zone's name pill moves just above or below it, staying in the zone, so
 * the pill stays readable. With nowhere to go inside the zone it stays where it was.
 */
function clearOfLabel(point: PlanPoint, zone: PlanZone): PlanPoint {
	const [ax, ay] = zone.labelAnchor;
	const halfWidth = (zone.name.length * PILL_CLEARANCE.charWidth) / 2 + PILL_CLEARANCE.padX;
	const { halfHeight } = PILL_CLEARANCE;
	if (Math.abs(point[0] - ax) >= halfWidth || Math.abs(point[1] - ay) >= halfHeight) return point;
	const below = point[1] >= ay;
	const candidates: PlanPoint[] = [
		[point[0], ay + (below ? halfHeight : -halfHeight)],
		[point[0], ay + (below ? -halfHeight : halfHeight)]
	];
	return candidates.find(candidate => pointInPolygon(candidate, zone.points)) ?? point;
}

/**
 * Places each observation inside its zone from its fixture position, the way every map in the workspace
 * places it, so the Data map, the observation page and the export agree on the point. Pure: pages call it
 * on the server and hand the positions to the map.
 */
export function markerPositions(site: ProjectedSite, records: readonly Observation[]): Record<string, MarkerPosition> {
	const positions: Record<string, MarkerPosition> = {};
	for (const record of records) {
		const zoneId = ZONES.find(zone => zone.siteSlug === record.siteSlug && zone.slug === record.zoneSlug)?.id;
		const zone = site.zones.find(planZone => planZone.id === zoneId);
		if (!zone) continue;
		const [lng, lat] = fromPlan(clearOfLabel(placeInZone(zone, record.place), zone), site.frame);
		positions[record.id] = { lng, lat };
	}
	return positions;
}

/** A marker's accessible name: "OBS-0244, Woodland edge, Round 3". */
export function markerLabel(record: Observation): string {
	return `${record.id}, ${zoneName(record.zoneSlug)}, Round ${record.round}`;
}

/** The site's zone id ("zone-b") for a zone slug, for the plan's per-zone styles. */
export function zoneIdOf(siteSlug: string, zoneSlug: string): string | undefined {
	return ZONES.find(zone => zone.siteSlug === siteSlug && zone.slug === zoneSlug)?.id;
}
