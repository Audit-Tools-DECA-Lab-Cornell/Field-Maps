import type { Observation, ReviewState } from "@/fixtures";
import { personByInitials, ZONES } from "@/fixtures";

/**
 * Data's one filter set (project-02): the map, the table, the counts and the export all read it, so they can
 * never disagree. It lives in the address (`?zone=&round=&type=&q=&review=&sort=&record=`), so a filtered
 * view can be sent to a colleague or opened again tomorrow; the page rewrites the address in place, without
 * a request to the server.
 */

export type DataSort = "newest" | "oldest" | "zone";

export type DataFilters = {
	zone: string | null;
	round: number | null;
	type: string | null;
	q: string;
	review: ReviewState | null;
	sort: DataSort;
	/** The selected observation, as OBS-0244. */
	record: string | null;
};

export const EMPTY_FILTERS: DataFilters = {
	zone: null,
	round: null,
	type: null,
	q: "",
	review: null,
	sort: "newest",
	record: null
};

export const SORT_OPTIONS: { value: DataSort; label: string }[] = [
	{ value: "newest", label: "Newest first" },
	{ value: "oldest", label: "Oldest first" },
	{ value: "zone", label: "Zone" }
];

const REVIEW_KEYS: readonly ReviewState[] = ["notReviewed", "approved", "excluded"];

type Readable = { get: (key: string) => string | null };

export function readFilters(params: Readable): DataFilters {
	const round = Number.parseInt(params.get("round") ?? "", 10);
	const review = params.get("review");
	const sort = params.get("sort");
	const record = params.get("record");
	return {
		zone: params.get("zone") || null,
		round: Number.isInteger(round) && round > 0 ? round : null,
		type: params.get("type") || null,
		q: params.get("q") ?? "",
		review: REVIEW_KEYS.includes(review as ReviewState) ? (review as ReviewState) : null,
		sort: SORT_OPTIONS.some(option => option.value === sort) ? (sort as DataSort) : "newest",
		record: record ? record.toUpperCase() : null
	};
}

/** The address's query for a filter set. Defaults are left out, so a clean view has a clean address. */
export function writeFilters(filters: DataFilters): string {
	const params = new URLSearchParams();
	if (filters.zone) params.set("zone", filters.zone);
	if (filters.round !== null) params.set("round", String(filters.round));
	if (filters.type) params.set("type", filters.type);
	if (filters.q.trim()) params.set("q", filters.q);
	if (filters.review) params.set("review", filters.review);
	if (filters.sort !== "newest") params.set("sort", filters.sort);
	if (filters.record) params.set("record", filters.record);
	const query = params.toString();
	return query ? `?${query}` : "";
}

/** Whether any filter narrows the records. Sort and selection do not. */
export function hasFilters(filters: DataFilters): boolean {
	return Boolean(filters.zone || filters.round !== null || filters.type || filters.q.trim() || filters.review);
}

export function clearFilters(filters: DataFilters): DataFilters {
	return { ...EMPTY_FILTERS, sort: filters.sort, record: filters.record };
}

/** Lowercase words a search can find in a record: its ID, observer, zone, play type and every answer. */
function searchText(observation: Observation): string {
	const observer = personByInitials(observation.observerInitials)?.name ?? "";
	const zone = zoneName(observation.zoneSlug);
	const answers = (observation.answers ?? []).map(answer => answer.value ?? "").join(" ");
	return [
		observation.id,
		observation.observerInitials,
		observer,
		zone,
		observation.playTypeLabel,
		observation.summary ?? "",
		answers
	]
		.join(" ")
		.toLowerCase();
}

/** The records that match, in the chosen order. `review` reads the session's review decisions. */
export function applyFilters(
	records: readonly Observation[],
	filters: DataFilters,
	review: (observation: Observation) => ReviewState
): Observation[] {
	const terms = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
	const matching = records.filter(record => {
		if (filters.zone && record.zoneSlug !== filters.zone) return false;
		if (filters.round !== null && record.round !== filters.round) return false;
		if (filters.type && record.playType !== filters.type) return false;
		if (filters.review && review(record) !== filters.review) return false;
		if (terms.length > 0) {
			const text = searchText(record);
			if (!terms.every(term => text.includes(term))) return false;
		}
		return true;
	});
	return sortRecords(matching, filters.sort);
}

function sortRecords(records: Observation[], sort: DataSort): Observation[] {
	const byTime = (a: Observation, b: Observation) => a.capturedAt.localeCompare(b.capturedAt);
	const sorted = [...records];
	if (sort === "oldest") return sorted.sort(byTime);
	if (sort === "zone")
		return sorted.sort(
			(a, b) => zoneName(a.zoneSlug).localeCompare(zoneName(b.zoneSlug)) || a.round - b.round || byTime(b, a)
		);
	return sorted.sort((a, b) => byTime(b, a));
}

export function zoneName(slug: string): string {
	return ZONES.find(zone => zone.slug === slug)?.name ?? slug;
}

/** The choices the filter selects offer, from the records themselves. */
export function filterOptions(records: readonly Observation[]) {
	const zoneSlugs = [...new Set(records.map(record => record.zoneSlug))];
	const zones = ZONES.filter(zone => zoneSlugs.includes(zone.slug)).map(zone => ({
		value: zone.slug,
		label: zone.name
	}));
	const rounds = [...new Set(records.map(record => record.round))]
		.sort((a, b) => a - b)
		.map(round => ({ value: String(round), label: `Round ${round}` }));
	const typeMap = new Map(records.map(record => [record.playType, record.playTypeLabel]));
	const types = [...typeMap.entries()]
		.sort((a, b) => a[1].localeCompare(b[1]))
		.map(([value, label]) => ({ value, label }));
	return { zones, rounds, types };
}

const REVIEW_WORDS: Record<ReviewState, string> = {
	notReviewed: "not yet reviewed",
	approved: "approved",
	excluded: "excluded"
};

function typeLabel(records: readonly Observation[], code: string): string {
	return records.find(record => record.playType === code)?.playTypeLabel ?? code;
}

/** "all zones · all rounds · all types", or the chosen ones: "Woodland edge · Round 3 · all types". */
export function scopeParts(records: readonly Observation[], filters: DataFilters): string[] {
	const parts = [
		filters.zone ? zoneName(filters.zone) : "all zones",
		filters.round !== null ? `Round ${filters.round}` : "all rounds",
		filters.type ? typeLabel(records, filters.type) : "all types"
	];
	if (filters.review) parts.push(REVIEW_WORDS[filters.review]);
	if (filters.q.trim()) parts.push(`matching “${filters.q.trim()}”`);
	return parts;
}

/** A saved view's suggested name: "Woodland edge · Round 3", or "All observations" with nothing chosen. */
export function suggestedViewName(records: readonly Observation[], filters: DataFilters): string {
	const parts: string[] = [];
	if (filters.zone) parts.push(zoneName(filters.zone));
	if (filters.round !== null) parts.push(`Round ${filters.round}`);
	if (filters.type) parts.push(`${typeLabel(records, filters.type)} play`);
	if (filters.q.trim()) parts.push(`“${filters.q.trim()}”`);
	return parts.length > 0 ? parts.join(" · ") : "All observations";
}

/** "3", "three": counts up to ten in a sentence are words. */
export function countWord(count: number): string {
	const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
	return WORDS[count] ?? String(count);
}

export function plural(count: number, one: string, many = `${one}s`): string {
	return count === 1 ? one : many;
}
