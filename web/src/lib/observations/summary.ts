import { NO_ZONE, plural, ROUND_TYPES, roundLabel, roundOf } from "../labels";
import { addDays, type Clock, dayKeysBetween } from "../time";
import type { RoundType } from "../workspace/types";
import { allOptions, findQuestion, isAnswered, NOT_ANSWERED } from "./answers";

/**
 * Counts for Overview and Reports, computed from the observation list the API returns: the newest 500 at
 * most, filtered by site and round on the server and by anything else here. Every function is pure.
 *
 * Rules (backend/WEB-FLOW-HANDOFF.md § Bounded reports and exports):
 * - days are calendar days of `observed_at` in the project's timezone;
 * - a record without a round (made before rounds existed) counts as Standard;
 * - a record without a zone stays in a "No zone" bucket, and zones the newest package no longer has are
 *   kept under their id;
 * - coverage is which zones have records in which rounds, never completion against a target;
 * - activity is read from timestamps and is not an audit log.
 */

/** The parts of an observation these counts read. `ObservationRow` and `StoredObservation` both fit. */
export type ObservationLike = {
	readonly observation_id: string;
	readonly site_code: string;
	readonly site_name: string;
	readonly zone: string | null;
	readonly round_type: RoundType | null;
	readonly observer: string;
	readonly observed_at: string;
	readonly received_at?: string | null;
	readonly form_version: string;
	readonly answers: Readonly<Record<string, unknown>>;
};

export type Count<K = string> = { readonly key: K; readonly label: string; readonly count: number };
export type ZoneRef = { readonly id: string; readonly label: string };

const byCountThenLabel = <K>(a: Count<K>, b: Count<K>) => b.count - a.count || a.label.localeCompare(b.label, "en");

/** Rows counted by a key, most frequent first, then by label. A null key is its own bucket. */
export function countBy<T, K extends string | null>(
	rows: readonly T[],
	keyOf: (row: T) => K,
	labelOf: (key: K) => string = key => (key === null ? "None" : key)
): Count<K>[] {
	const counts = new Map<K, number>();
	for (const row of rows) {
		const key = keyOf(row);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return [...counts].map(([key, count]) => ({ key, label: labelOf(key), count })).sort(byCountThenLabel);
}

/**
 * Records per zone: the site's zones in their own order (a zone without records counts 0), then any
 * other zone the records name, by id, then "No zone" when some records have none.
 */
export function byZone(rows: readonly ObservationLike[], zones: readonly ZoneRef[] = []): Count<string | null>[] {
	const counts = new Map<string | null, number>();
	for (const row of rows) counts.set(row.zone || null, (counts.get(row.zone || null) ?? 0) + 1);
	const known = zones.map(zone => ({
		key: zone.id as string | null,
		label: zone.label,
		count: counts.get(zone.id) ?? 0
	}));
	const knownIds = new Set(zones.map(zone => zone.id));
	const others = [...counts]
		.filter(([key]) => key !== null && !knownIds.has(key))
		.map(([key, count]) => ({ key, label: key as string, count }))
		.sort((a, b) => a.label.localeCompare(b.label, "en"));
	const none = counts.get(null) ?? 0;
	return [...known, ...others, ...(none > 0 ? [{ key: null, label: NO_ZONE, count: none }] : [])];
}

/** Records per round type, always all three in order. A record without a round counts as Standard. */
export function byRound(rows: readonly ObservationLike[]): Count<RoundType>[] {
	const counts = new Map<RoundType, number>();
	for (const row of rows) counts.set(roundOf(row.round_type), (counts.get(roundOf(row.round_type)) ?? 0) + 1);
	return ROUND_TYPES.map(type => ({ key: type, label: roundLabel(type), count: counts.get(type) ?? 0 }));
}

/** Records per observer, most first. */
export function byObserver(rows: readonly ObservationLike[]): Count<string>[] {
	return countBy(rows, row => row.observer);
}

/**
 * Records per calendar day of `observed_at` in the clock's timezone, oldest first. With `fill`, every day
 * between the first and the last appears, at 0 when nothing was recorded.
 */
export function byDay(
	rows: readonly ObservationLike[],
	clock: Clock,
	options: { readonly fill?: boolean } = {}
): Count<string>[] {
	const counts = new Map<string, number>();
	for (const row of rows) {
		const key = clock.dayKey(row.observed_at);
		if (key !== "") counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	const keys = [...counts.keys()].sort();
	const days = options.fill && keys.length > 0 ? dayKeysBetween(keys[0]!, keys[keys.length - 1]!) : keys;
	return days.map(key => ({ key, label: clock.keyLabel(key), count: counts.get(key) ?? 0 }));
}

/**
 * Answers to one question across records: each option in the form's order (0 when never chosen), then
 * values the form does not list, then "Not answered". A multi-select answer counts once for each option
 * chosen. Pass only the records the question applies to (records of the same form).
 */
export function byQuestion(
	definition: unknown,
	questionId: string,
	rows: readonly ObservationLike[]
): Count<string | null>[] {
	const question = findQuestion(definition, questionId);
	const options = question ? allOptions(question) : [];
	const counts = new Map<string, number>();
	let unanswered = 0;
	for (const row of rows) {
		const value = row.answers[questionId];
		if (!isAnswered(value)) {
			unanswered += 1;
			continue;
		}
		const values = Array.isArray(value) ? value : [value];
		for (const entry of values) {
			const key = typeof entry === "string" ? entry : JSON.stringify(entry);
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
	}
	const listed = options.map(option => ({
		key: option.code as string | null,
		label: option.label,
		count: counts.get(option.code) ?? 0
	}));
	const listedCodes = new Set(options.map(option => option.code));
	const others = [...counts]
		.filter(([key]) => !listedCodes.has(key))
		.map(([key, count]) => ({ key: key as string | null, label: key, count }))
		.sort(byCountThenLabel);
	return [...listed, ...others, ...(unanswered > 0 ? [{ key: null, label: NOT_ANSWERED, count: unanswered }] : [])];
}

/* ── Coverage ─────────────────────────────────────────────────────────────── */

export type CoverageRow = {
	/** The zone id, or null for records without a zone. */
	readonly zone: string | null;
	readonly label: string;
	/** False for a zone the site's current package does not have, and for "No zone". */
	readonly known: boolean;
	readonly counts: Readonly<Record<RoundType, number>>;
	readonly total: number;
};

export type Coverage = {
	readonly rows: readonly CoverageRow[];
	readonly totals: Readonly<Record<RoundType, number>>;
	readonly total: number;
	/** The largest single cell, for shading. */
	readonly max: number;
};

const zeroRounds = (): Record<RoundType, number> => ({ standard: 0, reliability: 0, inventory: 0 });

/** Records by zone × round type: which zones have been observed in which rounds. Not completion. */
export function coverageMatrix(rows: readonly ObservationLike[], zones: readonly ZoneRef[] = []): Coverage {
	const cells = new Map<string | null, Record<RoundType, number>>();
	const totals = zeroRounds();
	for (const zone of zones) cells.set(zone.id, zeroRounds());
	for (const row of rows) {
		const key = row.zone || null;
		const round = roundOf(row.round_type);
		const cell = cells.get(key) ?? zeroRounds();
		cell[round] += 1;
		cells.set(key, cell);
		totals[round] += 1;
	}
	const knownIds = new Set(zones.map(zone => zone.id));
	const label = new Map(zones.map(zone => [zone.id, zone.label]));
	const row = (zone: string | null, counts: Record<RoundType, number>): CoverageRow => ({
		zone,
		label: zone === null ? NO_ZONE : (label.get(zone) ?? zone),
		known: zone !== null && knownIds.has(zone),
		counts,
		total: counts.standard + counts.reliability + counts.inventory
	});
	const known = zones.map(zone => row(zone.id, cells.get(zone.id)!));
	const others = [...cells]
		.filter(([zone]) => zone !== null && !knownIds.has(zone))
		.sort(([a], [b]) => (a as string).localeCompare(b as string, "en"))
		.map(([zone, counts]) => row(zone, counts));
	const none = cells.get(null);
	const all = [...known, ...others, ...(none ? [row(null, none)] : [])];
	return {
		rows: all,
		totals,
		total: rows.length,
		max: Math.max(0, ...all.flatMap(entry => ROUND_TYPES.map(type => entry.counts[type])))
	};
}

/* ── Field return ─────────────────────────────────────────────────────────── */

export type SiteLike = {
	readonly code: string;
	readonly name: string;
	readonly observation_count: number;
	readonly created_at?: string;
};

export type FieldReturn = {
	/** Every accessible record: the sum of each site's exact count, not limited to the list. */
	readonly total: number;
	readonly bySite: readonly { readonly code: string; readonly name: string; readonly count: number }[];
	/** The project's today, as a day key. */
	readonly todayKey: string;
	/** Records observed today and over the last 7 days (today and the 6 before), from the list. */
	readonly today: number;
	readonly last7Days: number;
	/**
	 * Whether `today` and `last7Days` are complete. False only when the list was cut at 500 records and
	 * all of them fall inside the 7 days, so older ones in the window may be missing.
	 */
	readonly recentIsExact: boolean;
	/** The newest `received_at` and `observed_at` among the listed records. */
	readonly lastReceivedAt: string | null;
	readonly lastObservedAt: string | null;
};

/** The size of the observation list the API returns at most. */
export const OBSERVATION_LIMIT = 500;

export function fieldReturn(
	sites: readonly SiteLike[],
	rows: readonly ObservationLike[],
	nowIso: string,
	clock: Clock
): FieldReturn {
	const todayKey = clock.dayKey(nowIso);
	const weekStart = addDays(todayKey, -6);
	let today = 0;
	let last7Days = 0;
	let oldestKey: string | null = null;
	let lastReceivedAt: string | null = null;
	let lastObservedAt: string | null = null;
	for (const row of rows) {
		const key = clock.dayKey(row.observed_at);
		if (key === todayKey) today += 1;
		if (key >= weekStart && key <= todayKey) last7Days += 1;
		if (key !== "" && (oldestKey === null || key < oldestKey)) oldestKey = key;
		if (row.received_at && (lastReceivedAt === null || Date.parse(row.received_at) > Date.parse(lastReceivedAt)))
			lastReceivedAt = row.received_at;
		if (lastObservedAt === null || Date.parse(row.observed_at) > Date.parse(lastObservedAt))
			lastObservedAt = row.observed_at;
	}
	const limited = rows.length >= OBSERVATION_LIMIT;
	return {
		total: sites.reduce((sum, site) => sum + site.observation_count, 0),
		bySite: sites.map(site => ({ code: site.code, name: site.name, count: site.observation_count })),
		todayKey,
		today,
		last7Days,
		recentIsExact: !limited || (oldestKey !== null && oldestKey < weekStart),
		lastReceivedAt,
		lastObservedAt
	};
}

/* ── Activity ─────────────────────────────────────────────────────────────── */

export type PackageLike = {
	readonly package_id: string;
	readonly site_code: string;
	readonly version: number;
	readonly state: "ready" | "blocked";
	readonly prepared_at: string;
};

export type FormLike = {
	readonly code: string;
	readonly name: string;
	readonly versions: readonly {
		readonly code: string;
		readonly version: number;
		readonly state: "draft" | "published" | "retired";
		readonly created_at: string;
		readonly published_at: string | null;
	}[];
};

export type ActivityKind = "observations" | "package" | "form-published" | "form-draft" | "site";

export type ActivityEntry = {
	readonly id: string;
	readonly kind: ActivityKind;
	/** When it happened (the newest record of an observation group). */
	readonly at: string;
	readonly dayKey: string;
	/** One plain sentence: "4 observations by JL", "Map package v2 prepared for Fall Creek". */
	readonly title: string;
	/** A second line, when there is one: the sites of an observation group. */
	readonly detail?: string;
	readonly count?: number;
	readonly observer?: string;
	readonly siteCode?: string;
	readonly formCode?: string;
	readonly versionCode?: string;
	readonly packageId?: string;
	readonly state?: "ready" | "blocked";
};

/**
 * What happened recently, newest first, read from timestamps: observations grouped by day and observer,
 * map packages prepared, form versions published and drafts started, sites added. It is a summary of
 * what the records say, not an audit log.
 */
export function activity(
	input: {
		readonly rows: readonly ObservationLike[];
		readonly packages?: readonly PackageLike[];
		readonly forms?: readonly FormLike[];
		readonly sites?: readonly SiteLike[];
	},
	clock: Clock,
	options: { readonly limit?: number } = {}
): ActivityEntry[] {
	const entries: ActivityEntry[] = [];
	const siteName = new Map((input.sites ?? []).map(site => [site.code, site.name]));
	for (const row of input.rows) if (!siteName.has(row.site_code)) siteName.set(row.site_code, row.site_name);

	const groups = new Map<string, { day: string; observer: string; at: string; count: number; sites: Set<string> }>();
	for (const row of input.rows) {
		const day = clock.dayKey(row.observed_at);
		if (day === "") continue;
		const id = `${day}\u0000${row.observer}`;
		const group = groups.get(id) ?? {
			day,
			observer: row.observer,
			at: row.observed_at,
			count: 0,
			sites: new Set()
		};
		group.count += 1;
		group.sites.add(siteName.get(row.site_code) ?? row.site_code);
		if (Date.parse(row.observed_at) > Date.parse(group.at)) group.at = row.observed_at;
		groups.set(id, group);
	}
	for (const group of groups.values())
		entries.push({
			id: `observations-${group.day}-${group.observer}`,
			kind: "observations",
			at: group.at,
			dayKey: group.day,
			title: `${plural(group.count, "observation")} by ${group.observer || "an observer"}`,
			detail: [...group.sites].sort((a, b) => a.localeCompare(b, "en")).join(", "),
			count: group.count,
			observer: group.observer
		});

	for (const pkg of input.packages ?? []) {
		const site = siteName.get(pkg.site_code) ?? pkg.site_code;
		entries.push({
			id: `package-${pkg.package_id}`,
			kind: "package",
			at: pkg.prepared_at,
			dayKey: clock.dayKey(pkg.prepared_at),
			title:
				pkg.state === "ready"
					? `Map package v${pkg.version} prepared for ${site}`
					: `Map package v${pkg.version} for ${site} was blocked`,
			siteCode: pkg.site_code,
			packageId: pkg.package_id,
			state: pkg.state
		});
	}

	for (const form of input.forms ?? [])
		for (const version of form.versions) {
			if (version.published_at)
				entries.push({
					id: `published-${version.code}`,
					kind: "form-published",
					at: version.published_at,
					dayKey: clock.dayKey(version.published_at),
					title: `${form.name} v${version.version} published`,
					formCode: form.code,
					versionCode: version.code
				});
			else if (version.state === "draft")
				entries.push({
					id: `draft-${version.code}`,
					kind: "form-draft",
					at: version.created_at,
					dayKey: clock.dayKey(version.created_at),
					title: `Draft v${version.version} of ${form.name} started`,
					formCode: form.code,
					versionCode: version.code
				});
		}

	for (const site of input.sites ?? [])
		if (site.created_at)
			entries.push({
				id: `site-${site.code}`,
				kind: "site",
				at: site.created_at,
				dayKey: clock.dayKey(site.created_at),
				title: `Site ${site.name} added`,
				siteCode: site.code
			});

	entries.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
	return entries.slice(0, options.limit ?? 20);
}
