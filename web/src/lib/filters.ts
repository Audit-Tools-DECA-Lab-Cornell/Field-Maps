import type { Observation, RecordState } from "@/types/domain";

/**
 * One filter set for the whole section. The map, the table and the counts all read it, so the two
 * views can never show different records — the thing that makes a coordinated map and table worth
 * having in the first place.
 *
 * It lives in the URL rather than in a store: a filtered view is something a manager sends to a
 * colleague, opens in a second tab, or comes back to tomorrow.
 */
export interface Filters {
	readonly zone: string | null;
	readonly round: number | null;
	readonly observer: string | null;
	readonly type: string | null;
	readonly state: RecordState | null;
	readonly flag: string | null;
}

export const EMPTY_FILTERS: Filters = { zone: null, round: null, observer: null, type: null, state: null, flag: null };

export function readFilters(params: URLSearchParams): Filters {
	const round = params.get("round");
	const parsedRound = round === null ? Number.NaN : Number.parseInt(round, 10);
	return {
		zone: params.get("zone"),
		round: Number.isFinite(parsedRound) ? parsedRound : null,
		observer: params.get("observer"),
		type: params.get("type"),
		state: (params.get("state") as RecordState | null) ?? null,
		flag: params.get("flag")
	};
}

export function writeFilters(filters: Filters, record: string | null): URLSearchParams {
	const params = new URLSearchParams();
	if (filters.zone !== null) params.set("zone", filters.zone);
	if (filters.round !== null) params.set("round", String(filters.round));
	if (filters.observer !== null) params.set("observer", filters.observer);
	if (filters.type !== null) params.set("type", filters.type);
	if (filters.state !== null) params.set("state", filters.state);
	if (filters.flag !== null) params.set("flag", filters.flag);
	if (record !== null) params.set("record", record);
	return params;
}

export function applyFilters(records: readonly Observation[], filters: Filters): readonly Observation[] {
	return records.filter(record => {
		if (filters.zone !== null && record.zoneId !== filters.zone) return false;
		if (filters.round !== null && record.round !== filters.round) return false;
		if (filters.observer !== null && record.observerCode !== filters.observer) return false;
		if (filters.type !== null && record.playType !== filters.type) return false;
		if (filters.state !== null && record.state !== filters.state) return false;
		if (filters.flag !== null && record.flagId !== filters.flag) return false;
		return true;
	});
}

export function activeCount(filters: Filters): number {
	return Object.values(filters).filter(value => value !== null).length;
}

/** A sentence a reader can check against what they see, rather than a row of opaque pills. */
export function describeFilters(filters: Filters): string {
	const parts: string[] = [];
	if (filters.zone !== null) parts.push(`zone ${filters.zone}`);
	if (filters.round !== null) parts.push(`round ${filters.round}`);
	if (filters.observer !== null) parts.push(`observer ${filters.observer}`);
	if (filters.type !== null) parts.push(filters.type.toLowerCase());
	if (filters.state !== null) parts.push(filters.state.replace("-", " "));
	if (filters.flag !== null) parts.push("one flag");
	if (parts.length === 0) return "every record in this site";
	if (parts.length === 1) return parts[0]!;
	return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)!}`;
}
