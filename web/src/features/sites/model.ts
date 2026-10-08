import type { PlanObservation, ZonePlanStyle } from "@/components/map/SitePlan";
import {
	coverageFor,
	DEVICE_REPORTS,
	type Observation,
	observationsFor,
	PEOPLE,
	type Person,
	PROJECTS,
	ZONES
} from "@/fixtures";
import { fromPlan, placeInZone, type ProjectedSite } from "@/lib/plan";

/**
 * What the Places screens derive from the fixtures: map markers, zone styles, coverage words and the
 * device roster. Pure, so pages can call it on the server or in the browser and always agree.
 */

/** The site's zone id ("zone-a") for a zone slug. */
export function zoneIdOf(siteSlug: string, zoneSlug: string): string | undefined {
	return ZONES.find(zone => zone.siteSlug === siteSlug && zone.slug === zoneSlug)?.id;
}

export function zoneNameOf(siteSlug: string, zoneSlug: string): string {
	return ZONES.find(zone => zone.siteSlug === siteSlug && zone.slug === zoneSlug)?.name ?? zoneSlug;
}

/** A marker's accessible name: "OBS-0244, Woodland edge, Round 3". */
export function markerLabel(record: Observation): string {
	return `${record.id}, ${zoneNameOf(record.siteSlug, record.zoneSlug)}, Round ${record.round}`;
}

/** Every observation of a site as a map marker, placed inside its zone the way every map places it. */
export function siteMarkers(site: ProjectedSite, records: readonly Observation[]): PlanObservation[] {
	return records.flatMap(record => {
		const zoneId = zoneIdOf(record.siteSlug, record.zoneSlug);
		const zone = site.zones.find(planZone => planZone.id === zoneId);
		if (!zone) return [];
		const [lng, lat] = fromPlan(placeInZone(zone, record.place), site.frame);
		return [{ id: record.id, lng, lat, label: markerLabel(record) }];
	});
}

/** Coverage dots in each zone's map label (project-07). */
export function coverageZoneStyles(projectSlug: string, siteSlug: string): Record<string, ZonePlanStyle> {
	const styles: Record<string, ZonePlanStyle> = {};
	for (const entry of coverageFor(projectSlug, siteSlug)) styles[entry.zone.id] = { dots: entry.met };
	return styles;
}

/** The project's illustrative coverage target. */
export function targetOf(projectSlug: string) {
	return (
		PROJECTS.find(project => project.slug === projectSlug)?.target ?? { roundsPerZone: 3, observationsPerRound: 2 }
	);
}

/** "Target: 3 rounds per zone (illustrative)" */
export function targetLine(projectSlug: string): string {
	const rounds = targetOf(projectSlug).roundsPerZone;
	return `Target: ${rounds} ${rounds === 1 ? "round" : "rounds"} per zone (illustrative)`;
}

/** "3 rounds, 2 or more observations each" */
export function targetFact(projectSlug: string): string {
	const target = targetOf(projectSlug);
	return `${target.roundsPerZone} ${target.roundsPerZone === 1 ? "round" : "rounds"}, ${target.observationsPerRound} or more observations each`;
}

/** "rounds 1 and 2", "round 1", "rounds 1, 2 and 3" */
export function roundsPhrase(rounds: number[]): string {
	const sorted = [...new Set(rounds)].sort((a, b) => a - b);
	if (sorted.length === 0) return "no rounds";
	if (sorted.length === 1) return `round ${sorted[0]}`;
	return `rounds ${sorted.slice(0, -1).join(", ")} and ${sorted[sorted.length - 1]}`;
}

export type ReadinessRow = {
	person: Person;
	mapPackage: { state: "downloaded" | "unknown"; label: string };
	form: { state: "formAvailable" | "unknown"; label: string };
	lastChecked: string;
};

/** Each observer's last device report for a site, in the roster's order. */
export function readinessRows(siteSlug: string): ReadinessRow[] {
	return DEVICE_REPORTS.filter(report => report.siteSlug === siteSlug).flatMap(report => {
		const person = PEOPLE[report.personId];
		return person
			? [{ person, mapPackage: report.mapPackage, form: report.form, lastChecked: report.lastChecked }]
			: [];
	});
}

/** "3 observers on this site" */
export function observersLine(count: number): string {
	return `${count} ${count === 1 ? "observer" : "observers"} on this site`;
}

/** Observations of one zone, newest first. */
export function zoneObservations(projectSlug: string, siteSlug: string, zoneSlug: string): Observation[] {
	return observationsFor(projectSlug, siteSlug)
		.filter(record => record.zoneSlug === zoneSlug)
		.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}
