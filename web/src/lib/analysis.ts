import { PLAY_TYPES } from "@/data/instrument";
import { ACTIVE_SITE } from "@/data/project";
import type { Observation } from "@/types/domain";

/**
 * The two questions the protocol asks of a running study, computed over whatever set the reader
 * has filtered to. Both are counts — there is no model here, and no number on these screens is
 * anything but a tally of the rows in view.
 */

export interface CoverageCell {
	readonly zoneId: string;
	readonly round: number;
	readonly count: number;
	/** True when the cell is under the protocol target, which is a prompt to go back, not an error. */
	readonly thin: boolean;
}

export interface CoverageMatrix {
	readonly rounds: readonly number[];
	readonly rows: readonly {
		readonly zoneId: string;
		readonly label: string;
		readonly cells: readonly CoverageCell[];
	}[];
	readonly max: number;
	readonly thinCells: number;
}

export function coverage(records: readonly Observation[], target: number): CoverageMatrix {
	const rounds = ACTIVE_SITE.rounds;
	let max = 0;
	let thinCells = 0;
	const rows = ACTIVE_SITE.zones.map(zone => ({
		zoneId: zone.id,
		label: zone.label,
		cells: rounds.map(round => {
			const count = records.filter(record => record.zoneId === zone.id && record.round === round).length;
			if (count > max) max = count;
			const thin = count < target;
			if (thin) thinCells += 1;
			return { zoneId: zone.id, round, count, thin };
		})
	}));
	return { rounds, rows, max, thinCells };
}

export interface TypeTally {
	readonly type: string;
	readonly count: number;
}

export function typeDistribution(records: readonly Observation[]): readonly TypeTally[] {
	return PLAY_TYPES.map(type => ({ type, count: records.filter(record => record.playType === type).length }));
}

export function typeDistributionByZone(records: readonly Observation[]): readonly {
	readonly zoneId: string;
	readonly label: string;
	readonly tallies: readonly TypeTally[];
	readonly total: number;
}[] {
	return ACTIVE_SITE.zones.map(zone => {
		const inZone = records.filter(record => record.zoneId === zone.id);
		return { zoneId: zone.id, label: zone.label, tallies: typeDistribution(inZone), total: inZone.length };
	});
}

export function countBy<T extends string>(
	records: readonly Observation[],
	read: (record: Observation) => T
): Record<T, number> {
	const out = {} as Record<T, number>;
	for (const record of records) {
		const key = read(record);
		out[key] = (out[key] ?? 0) + 1;
	}
	return out;
}
