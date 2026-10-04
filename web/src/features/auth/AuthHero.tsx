import { Island } from "@/components/contour/Island";
import { StateBadge } from "@/components/contour/StateBadge";
import { type PlanObservation, SitePlan } from "@/components/map/SitePlan";
import { OBSERVATIONS, ZONES } from "@/fixtures";
import { fromPlan, placeInZone, type PlanPoint, type PlanZone, pointInPolygon, type ProjectedSite } from "@/lib/plan";
import { loadProjectedSite } from "@/lib/plan-sites";

/**
 * The part of the Riverside plan the hero shows, in plan units: the whole site across, and the three zones
 * top to bottom, at the island's 2:1 (System 12).
 */
const HERO_VIEW = [0, 70, 720, 360] as const;

/** Room a marker keeps from a zone's name pill, in plan units: about the pill's size plus a marker. */
const PILL_CLEARANCE = { charWidth: 9, padX: 22, halfHeight: 23 } as const;

/**
 * A marker that would sit under its zone's name pill moves just above or below it, staying in the zone, so
 * the hero reads like the drawn plan. A marker with nowhere to go is left out of this illustration.
 */
function clearOfLabel(point: PlanPoint, zone: PlanZone): PlanPoint | undefined {
	const [ax, ay] = zone.labelAnchor;
	const halfWidth = (zone.name.length * PILL_CLEARANCE.charWidth) / 2 + PILL_CLEARANCE.padX;
	const { halfHeight } = PILL_CLEARANCE;
	if (Math.abs(point[0] - ax) >= halfWidth || Math.abs(point[1] - ay) >= halfHeight) return point;
	const candidates: PlanPoint[] = [
		[point[0], ay + (point[1] >= ay ? halfHeight : -halfHeight)],
		[point[0], ay + (point[1] >= ay ? -halfHeight : halfHeight)]
	];
	return candidates.find(candidate => pointInPolygon(candidate, zone.points));
}

/** Play Study's Riverside observations as plain markers, placed in their zones the way every map places them. */
function heroMarkers(site: ProjectedSite): PlanObservation[] {
	return OBSERVATIONS.filter(observation => observation.siteSlug === "riverside").flatMap(observation => {
		const zoneId = ZONES.find(zone => zone.siteSlug === "riverside" && zone.slug === observation.zoneSlug)?.id;
		const zone = site.zones.find(planZone => planZone.id === zoneId);
		if (!zone) return [];
		const point = clearOfLabel(placeInZone(zone, observation.place), zone);
		if (!point) return [];
		const [lng, lat] = fromPlan(point, site.frame);
		return [{ id: observation.id, lng, lat }];
	});
}

/**
 * The field-operations island beside the auth forms (System 12): the Riverside plan in the Day palette,
 * with its zones and observations and no controls, over the promise FieldMaps makes about every record.
 * The plan keeps the map palette in Dusk too; the screen theme never recolours a map.
 */
export function AuthHero() {
	const site = loadProjectedSite("riverside");
	return (
		<Island flush aria-labelledby="auth-hero-title">
			<div className="aspect-2/1 border-b border-line">
				<SitePlan
					site={site}
					palette="day"
					observations={heroMarkers(site)}
					title="Riverside · Day plan, a sample site"
					viewBox={HERO_VIEW}
					fit="slice"
					className="size-full"
				/>
			</div>
			<div className="px-6 pt-8 pb-6 xl:px-8 xl:pb-8">
				<p className="type-mono-label text-ink-2">Field operations</p>
				<h2 id="auth-hero-title" className="mt-3 type-section text-ink xl:type-page">
					<span className="block">Observe with confidence.</span>
					<span className="block">Keep every record.</span>
				</h2>
				<p className="mt-4 type-body text-ink-2">
					Place a point. Record what you see. Keep the map and the observation together, even without signal.
				</p>
				<dl className="mt-5">
					<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule py-3">
						<dt>
							<StateBadge kind="queue" state="onDevice" label="Saved on this device" />
						</dt>
						<dd className="type-body text-ink-2">
							The moment an observer taps Save, with or without signal.
						</dd>
					</div>
					<div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-rule py-3">
						<dt>
							<StateBadge kind="queue" state="uploaded" />
						</dt>
						<dd className="type-body text-ink-2">Only after the server acknowledges the record.</dd>
					</div>
				</dl>
			</div>
		</Island>
	);
}
