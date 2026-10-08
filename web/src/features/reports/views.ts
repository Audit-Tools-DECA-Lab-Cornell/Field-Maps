import { applyFilters, type DataFilters, EMPTY_FILTERS, writeFilters, zoneName } from "@/features/data/filters";
import type { Observation, ReviewState, SavedView } from "@/fixtures";

/**
 * Saved views (proposal U7) as the reports pages read them: a view is a filter set, never a copy of the
 * records, so its count is worked out now, from the records the server holds, with Data's own filter.
 */

export function viewFilters(view: SavedView): DataFilters {
	return { ...EMPTY_FILTERS, zone: view.zone, round: view.round, type: view.playType, q: view.query };
}

/** Data, opened with the view's filters: "…/data?zone=north-meadow&round=1". */
export function viewHref(dataHref: string, view: SavedView): string {
	return `${dataHref}${writeFilters(viewFilters(view))}`;
}

export type ViewParts = { zone: string; round: string; type: string };

/** What the view keeps, in words: "North meadow", "Round 1", "All types". */
export function viewParts(view: SavedView, records: readonly Observation[]): ViewParts {
	const type = view.playType
		? (records.find(record => record.playType === view.playType)?.playTypeLabel ?? view.playType)
		: "All types";
	return {
		zone: view.zone ? zoneName(view.zone) : "All zones",
		round: view.round !== null ? `Round ${view.round}` : "All rounds",
		type
	};
}

/** "North meadow · Round 1 · All types", with any search text after it. */
export function viewDetail(view: SavedView, records: readonly Observation[]): string {
	const parts = viewParts(view, records);
	const words = [parts.zone, parts.round, parts.type];
	if (view.query.trim()) words.push(`“${view.query.trim()}”`);
	return words.join(" · ");
}

/** How many records match the view right now. */
export function matchesNow(
	view: SavedView,
	records: readonly Observation[],
	review: (observation: Observation) => ReviewState
): number {
	return applyFilters(records, viewFilters(view), review).length;
}
