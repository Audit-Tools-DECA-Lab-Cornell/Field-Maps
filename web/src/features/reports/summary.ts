import {
	countBy,
	DEVICE_RECORDS,
	type Observation,
	observationsFor,
	type PrintableReport,
	type ReviewState,
	type Zone,
	zonesFor
} from "@/fixtures";

/**
 * What a printable summary (proposal U7) says, worked out from the records the server holds for its
 * scope. Every number on the sheet comes from here, so the printout and the screens never disagree.
 */

export type CoverageRow = {
	zone: Zone;
	/** Observations per reported round, in round order. */
	perRound: number[];
	met: boolean[];
	onTarget: number;
	status: "complete" | "roundBelow" | "below";
};

export type ReportSummary = {
	records: Observation[];
	zones: Zone[];
	/** "Riverside · all zones · rounds 1–3". */
	scopeLine: string;
	/** "rounds 1–3", "round 1". */
	roundsLabel: string;
	formVersions: string[];
	mapVersions: string[];
	/** "JL 6 · PS 4 · AK 4". */
	observers: string;
	/** "1 upload rejected, 3 not yet reviewed". */
	reviewFlags: string;
	types: { label: string; value: number }[];
	coverage: CoverageRow[];
};

/** "rounds 1–3", "round 1", "rounds 1, 3". */
export function roundsLabel(rounds: readonly number[]): string {
	const sorted = [...rounds].sort((a, b) => a - b);
	if (sorted.length === 1) return `round ${sorted[0]}`;
	const first = sorted[0] ?? 0;
	const last = sorted[sorted.length - 1] ?? 0;
	const contiguous = sorted.every((round, index) => round === first + index);
	return contiguous ? `rounds ${first}–${last}` : `rounds ${sorted.join(", ")}`;
}

function plural(count: number, one: string, many: string): string {
	return `${count} ${count === 1 ? one : many}`;
}

export function summarise({
	report,
	project,
	siteName,
	target,
	review
}: {
	report: PrintableReport;
	project: string;
	siteName: string;
	target: { roundsPerZone: number; observationsPerRound: number };
	review: (observation: Observation) => ReviewState;
}): ReportSummary {
	const zones = zonesFor(report.siteSlug).filter(zone => !report.zoneSlug || zone.slug === report.zoneSlug);
	const zoneSlugs = zones.map(zone => zone.slug);
	const records = observationsFor(project, report.siteSlug).filter(
		record => zoneSlugs.includes(record.zoneSlug) && report.rounds.includes(record.round)
	);

	const rejected = DEVICE_RECORDS.filter(
		record =>
			record.state === "attention" && zoneSlugs.includes(record.zoneSlug) && report.rounds.includes(record.round)
	).length;
	const notReviewed = records.filter(record => review(record) === "notReviewed").length;
	const flags = [
		rejected > 0 ? plural(rejected, "upload rejected", "uploads rejected") : null,
		notReviewed > 0 ? `${notReviewed} not yet reviewed` : null
	].filter(Boolean);

	const coverage = zones.map(zone => {
		const perRound = report.rounds.map(
			round => records.filter(record => record.zoneSlug === zone.slug && record.round === round).length
		);
		const met = perRound.map(count => count >= target.observationsPerRound);
		const onTarget = met.filter(Boolean).length;
		const status: CoverageRow["status"] =
			onTarget === met.length
				? "complete"
				: met.length > 1 && onTarget === met.length - 1
					? "roundBelow"
					: "below";
		return { zone, perRound, met, onTarget, status };
	});

	const rounds = roundsLabel(report.rounds);
	const zoneWords = report.zoneSlug ? (zones[0]?.name ?? report.zoneSlug) : "all zones";

	return {
		records,
		zones,
		scopeLine: `${siteName} · ${zoneWords} · ${rounds}`,
		roundsLabel: rounds,
		formVersions: [...new Set(records.map(record => record.formVersion))],
		mapVersions: [...new Set(records.map(record => record.mapVersion))],
		observers: countBy(records, record => record.observerInitials)
			.map(entry => `${entry.key} ${entry.count}`)
			.join(" · "),
		reviewFlags: flags.length > 0 ? flags.join(", ") : "None",
		types: countBy(records, record => record.playTypeLabel).map(entry => ({
			label: entry.key,
			value: entry.count
		})),
		coverage
	};
}
