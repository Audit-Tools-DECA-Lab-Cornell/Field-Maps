import type { ObservationRow } from "../../lib/api/types";
import { isRoundType, roundLabel, roundName, roundOf, shortLabel, zoneName } from "../../lib/labels";
import { answerRows, playTypeQuestion } from "../../lib/observations/answers";
import type { Clock } from "../../lib/time";
import type { RoundType } from "../../lib/workspace/types";

/**
 * Data's one view: which observations the page loads, which of those it shows, and how a row reads.
 * Pure, with relative imports only, so the unit tests load it directly.
 *
 * The address carries the whole view, so a link to it opens the same rows:
 *   ?site=<code>&round=<type>   chosen on the server: they decide which observations load (the list
 *                               query takes only these, plus a cap of 500);
 *   ?zone=&observer=&from=&to=&q=   applied in the browser, to what loaded.
 */

/** The zone filter value for records without a zone. */
export const NO_ZONE_KEY = "~none";

/** Longest answer shown in a table cell, in characters. The observation page has the whole answer. */
export const SUMMARY_LIMIT = 140;

export type ServerScope = { site: string | null; round: RoundType | null };

export type ClientFilters = {
	zone: string | null;
	observer: string | null;
	/** First day to show, "2026-10-07", in the project's timezone. */
	from: string | null;
	/** Last day to show. */
	to: string | null;
	q: string;
};

export type DataView = ServerScope & ClientFilters;

export const EMPTY_CLIENT_FILTERS: ClientFilters = { zone: null, observer: null, from: null, to: null, q: "" };
export const EMPTY_SCOPE: ServerScope = { site: null, round: null };

/** A reader of address parameters: `URLSearchParams.get`, or a lookup into Next's `searchParams` object. */
export type ParamGetter = (key: string) => string | null | undefined;

/** A getter over Next's `searchParams` object (a value may be a list when a key repeats; the first wins). */
export function paramsGetter(params: Readonly<Record<string, string | string[] | undefined>>): ParamGetter {
	return key => {
		const value = params[key];
		return Array.isArray(value) ? value[0] : value;
	};
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A day key that is a real calendar day, or null. */
function dayOrNull(value: string | null | undefined): string | null {
	if (!value || !DAY.test(value)) return null;
	const date = new Date(`${value}T00:00:00Z`);
	return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

const text = (value: string | null | undefined): string | null => {
	const found = value?.trim();
	return found ? found : null;
};

/** The server-side choices from the address. A round type the API does not know is ignored. */
export function parseScope(get: ParamGetter): ServerScope {
	const round = get("round");
	return { site: text(get("site")), round: round && isRoundType(round) ? round : null };
}

/** The browser-side filters from the address. */
export function parseClientFilters(get: ParamGetter): ClientFilters {
	return {
		zone: text(get("zone")),
		observer: text(get("observer")),
		from: dayOrNull(get("from")),
		to: dayOrNull(get("to")),
		q: get("q")?.trim() ?? ""
	};
}

export function parseView(get: ParamGetter): DataView {
	return { ...parseScope(get), ...parseClientFilters(get) };
}

const CLIENT_KEYS = ["zone", "observer", "from", "to", "q"] as const;
export const DATA_PARAM_KEYS: readonly string[] = ["site", "round", ...CLIENT_KEYS];

/** The address query for a view: "" for the plain page, otherwise "?site=…&round=…". Defaults are left out. */
export function viewQuery(view: Partial<DataView>): string {
	const params = new URLSearchParams();
	if (view.site) params.set("site", view.site);
	if (view.round) params.set("round", view.round);
	if (view.zone) params.set("zone", view.zone);
	if (view.observer) params.set("observer", view.observer);
	if (view.from) params.set("from", view.from);
	if (view.to) params.set("to", view.to);
	if (view.q?.trim()) params.set("q", view.q.trim());
	const query = params.toString();
	return query ? `?${query}` : "";
}

/** Whether any browser-side filter narrows the rows. */
export function hasClientFilters(filters: ClientFilters): boolean {
	return Boolean(filters.zone || filters.observer || filters.from || filters.to || filters.q.trim());
}

/* ── Rows ─────────────────────────────────────────────────────────────────── */

/** What the screen needs to know about a site to name a record's zone. */
export type SiteZones = {
	readonly code: string;
	readonly name: string;
	readonly zones: readonly { readonly id: string; readonly label: string }[];
};

export type AnswerSummary = { label: string; value: string };

/** One observation prepared for the table, the filters and the search. */
export type DataRecord = {
	/** The observation's UUID: its address and its export row. */
	id: string;
	/** "OBS-3F2A1B". */
	label: string;
	row: ObservationRow;
	/** "Oct 07, 2026 · 14:05" in the project's timezone. */
	when: string;
	/** "Oct 07, 2026" and "14:05": the same moment in two parts, for a narrow column. */
	day: string;
	time: string;
	/** "2026-10-07" in the project's timezone. */
	dayKey: string;
	siteCode: string;
	siteName: string;
	/** The stored zone id, or null. */
	zone: string | null;
	/** The zone filter's value: the zone id, or `NO_ZONE_KEY`. */
	zoneKey: string;
	/** "Zone A · Whole playground", or "No zone". */
	zoneLabel: string;
	round: RoundType;
	/** "Standard". */
	roundName: string;
	observer: string;
	summary: AnswerSummary | null;
	/** Lowercase words a search can find. */
	search: string;
};

/** An answer on one line, cut at `limit` characters (whole characters, so an emoji is never split). */
export function clip(value: string, limit = SUMMARY_LIMIT): string {
	const line = value.replace(/\s+/g, " ").trim();
	const characters = Array.from(line);
	return characters.length <= limit ? line : `${characters.slice(0, limit).join("").trimEnd()}…`;
}

/**
 * The one answer a table row shows: the play type when the form has one and it was answered, otherwise
 * the first answer in the form's order. Null when the record has no answers.
 */
export function summaryOf(definition: unknown, answers: Readonly<Record<string, unknown>>): AnswerSummary | null {
	const rows = answerRows(definition, answers);
	if (rows.length === 0) return null;
	const play = playTypeQuestion(definition);
	const chosen = (play && rows.find(row => row.questionId === play.id)) ?? rows[0]!;
	return { label: chosen.label, value: clip(chosen.value) };
}

function zoneNames(sites: readonly SiteZones[]): Map<string, Map<string, string>> {
	return new Map(sites.map(site => [site.code, new Map(site.zones.map(zone => [zone.id, zone.label]))]));
}

/**
 * The rows prepared for display. Each record is read with the form version it was collected with
 * (`definitions` is keyed by version code); a version that is missing leaves its answers labelled by
 * their question ids.
 */
export function prepareRecords(
	rows: readonly ObservationRow[],
	definitions: Readonly<Record<string, unknown>>,
	sites: readonly SiteZones[],
	clock: Clock
): DataRecord[] {
	const names = zoneNames(sites);
	return rows.map(row => {
		const definition = definitions[row.form_version];
		const answers = answerRows(definition, row.answers);
		const zone = row.zone ? row.zone : null;
		const zoneLabel = zoneName(zone, names.get(row.site_code));
		const round = roundOf(row.round_type);
		const label = shortLabel(row.observation_id);
		return {
			id: row.observation_id,
			label,
			row,
			when: clock.dayTime(row.observed_at),
			day: clock.day(row.observed_at),
			time: clock.time(row.observed_at),
			dayKey: clock.dayKey(row.observed_at),
			siteCode: row.site_code,
			siteName: row.site_name,
			zone,
			zoneKey: zone ?? NO_ZONE_KEY,
			zoneLabel,
			round,
			roundName: roundName(round),
			observer: row.observer,
			summary: summaryOf(definition, row.answers),
			search: [
				label,
				row.observation_id,
				row.observer,
				row.site_name,
				row.site_code,
				zoneLabel,
				zone ?? "",
				roundLabel(round),
				...answers.flatMap(answer => [answer.label, answer.value])
			]
				.join(" ")
				.toLowerCase()
		};
	});
}

/** The records that pass the browser-side filters, in the order given. */
export function applyFilters(records: readonly DataRecord[], filters: ClientFilters): DataRecord[] {
	const terms = filters.q.toLowerCase().split(/\s+/).filter(Boolean);
	return records.filter(record => {
		if (filters.zone && record.zoneKey !== filters.zone) return false;
		if (filters.observer && record.observer !== filters.observer) return false;
		if (filters.from && record.dayKey < filters.from) return false;
		if (filters.to && record.dayKey > filters.to) return false;
		return terms.every(term => record.search.includes(term));
	});
}

export type Option = { value: string; label: string };

/**
 * The choices the zone and observer filters offer: those in the loaded rows, plus the one already chosen,
 * so a link to a zone with no rows still shows that zone in the filter. "No zone" comes last.
 */
export function filterOptions(
	records: readonly DataRecord[],
	filters: Pick<ClientFilters, "zone" | "observer">,
	sites: readonly SiteZones[] = []
): { zones: Option[]; observers: Option[] } {
	const zones = new Map<string, string>();
	for (const record of records) zones.set(record.zoneKey, record.zoneLabel);
	if (filters.zone && !zones.has(filters.zone)) {
		const known = sites.flatMap(site => site.zones).find(zone => zone.id === filters.zone);
		zones.set(filters.zone, filters.zone === NO_ZONE_KEY ? zoneName(null) : (known?.label ?? filters.zone));
	}
	const observers = new Set(records.map(record => record.observer));
	if (filters.observer) observers.add(filters.observer);
	return {
		zones: [...zones.entries()]
			.map(([value, label]) => ({ value, label }))
			.sort((a, b) =>
				a.value === NO_ZONE_KEY ? 1 : b.value === NO_ZONE_KEY ? -1 : a.label.localeCompare(b.label)
			),
		observers: [...observers].sort((a, b) => a.localeCompare(b)).map(value => ({ value, label: value }))
	};
}

/* ── What the view is about ───────────────────────────────────────────────── */

/**
 * The exact number of observations in the server scope, when the sites' counts answer it: the chosen
 * site's own count, or every site's added up. A round type has no exact count, so it returns null.
 */
export function exactTotal(
	sites: readonly { readonly code: string; readonly observationCount: number }[],
	scope: ServerScope
): number | null {
	if (scope.round) return null;
	if (scope.site) return sites.find(site => site.code === scope.site)?.observationCount ?? null;
	return sites.reduce((sum, site) => sum + site.observationCount, 0);
}

/**
 * The site whose plan the page draws: the chosen site, or else the only site that holds observations.
 * Null when several sites hold some, since then no single plan is in scope.
 */
export function planSiteCode(
	sites: readonly { readonly code: string; readonly observationCount: number }[],
	scope: ServerScope
): string | null {
	if (scope.site) return sites.some(site => site.code === scope.site) ? scope.site : null;
	if (sites.length === 1) return sites[0]!.code;
	const holding = sites.filter(site => site.observationCount > 0);
	return holding.length === 1 ? holding[0]!.code : null;
}
