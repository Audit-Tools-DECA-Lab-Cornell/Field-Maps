import { OBSERVATIONS } from "./observations";
import { PROJECTS } from "./org";
import { ZONES } from "./sites";
import type { Observation, Zone } from "./types";

/**
 * Every number a screen shows is computed here from the observation rows, so the overview, the site, the
 * zone, the report and the org home can never disagree.
 */

export function observationsFor(projectSlug: string, siteSlug?: string): Observation[] {
	return OBSERVATIONS.filter(obs => obs.projectSlug === projectSlug && (!siteSlug || obs.siteSlug === siteSlug));
}

export type ZoneCoverage = {
	zone: Zone;
	/** Observations per round, in round order. */
	perRound: number[];
	/** Whether each round met the target. */
	met: boolean[];
	onTarget: number;
	status: "complete" | "roundBelow" | "below";
	total: number;
};

export function coverageFor(projectSlug: string, siteSlug: string): ZoneCoverage[] {
	const project = PROJECTS.find(p => p.slug === projectSlug);
	const rounds = project?.target.roundsPerZone ?? 3;
	const minimum = project?.target.observationsPerRound ?? 2;
	const records = observationsFor(projectSlug, siteSlug);
	return ZONES.filter(zone => zone.siteSlug === siteSlug).map(zone => {
		const perRound = Array.from(
			{ length: rounds },
			(_, index) => records.filter(obs => obs.zoneSlug === zone.slug && obs.round === index + 1).length
		);
		const met = perRound.map(count => count >= minimum);
		const onTarget = met.filter(Boolean).length;
		const status = onTarget === rounds ? "complete" : onTarget === rounds - 1 ? "roundBelow" : "below";
		return { zone, perRound, met, onTarget, status, total: perRound.reduce((sum, n) => sum + n, 0) };
	});
}

export function coverageSummary(projectSlug: string, siteSlug: string) {
	const zones = coverageFor(projectSlug, siteSlug);
	const met = zones.flatMap(zone => zone.met);
	return { met: met.filter(Boolean).length, total: met.length, dots: met };
}

export function countBy<T>(items: T[], key: (item: T) => string): { key: string; count: number }[] {
	const counts = new Map<string, number>();
	for (const item of items) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1);
	return [...counts.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count);
}

/** "Physical 2 · Imaginative 1 · Restorative 1" */
export function typeBreakdown(records: Observation[]): string {
	return countBy(records, obs => obs.playTypeLabel)
		.map(entry => `${entry.key} ${entry.count}`)
		.join(" · ");
}

export function reviewCounts(records: Observation[]) {
	return {
		notReviewed: records.filter(obs => obs.review === "notReviewed").length,
		approved: records.filter(obs => obs.review === "approved").length,
		excluded: records.filter(obs => obs.review === "excluded").length
	};
}

export type RoundSummary = { round: number; count: number; zones: string; observers: string[] };

/** Rounds recorded so far, from uploaded observations (project-18). */
export function roundsRecorded(projectSlug: string): RoundSummary[] {
	const records = observationsFor(projectSlug);
	const rounds = [...new Set(records.map(obs => obs.round))].sort();
	return rounds.map(round => {
		const inRound = records.filter(obs => obs.round === round);
		const zones = countBy(inRound, obs => ZONES.find(zone => zone.slug === obs.zoneSlug)?.name ?? obs.zoneSlug)
			.map(entry => `${entry.key} ${entry.count}`)
			.join(" · ");
		// Most active observer first, as the rounds table reads ("PS JL AK").
		const observers = countBy(inRound, obs => obs.observerInitials).map(entry => entry.key);
		return { round, count: inRound.length, zones, observers };
	});
}
