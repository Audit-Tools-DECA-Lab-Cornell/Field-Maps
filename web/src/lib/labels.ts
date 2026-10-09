import type { RoundType } from "./workspace/types";

/**
 * The short words the web shares with the collector: record labels (`mobile/src/domain/labels.ts`) and
 * round names (`mobile/src/domain/rounds.ts`). Keep them identical, so a manager and an observer read the
 * same "OBS-3F2A1B" and "Reliability round" for one record.
 */

/** The short record label people read aloud: "OBS-3F2A1B", from the record's UUID. */
export function shortLabel(id: string): string {
	return `OBS-${id.slice(0, 6).toUpperCase()}`;
}

export const ROUND_TYPES: readonly RoundType[] = ["standard", "reliability", "inventory"];

const ROUND_LABELS: Record<RoundType, string> = {
	standard: "Standard round",
	reliability: "Reliability round",
	inventory: "Inventory round"
};

const ROUND_NAMES: Record<RoundType, string> = {
	standard: "Standard",
	reliability: "Reliability",
	inventory: "Inventory"
};

/** A record's round. Records made before rounds existed carry none and read as Standard. */
export function roundOf(type: RoundType | null | undefined): RoundType {
	return type ?? "standard";
}

/** "Standard round", "Reliability round", "Inventory round". */
export function roundLabel(type: RoundType | null | undefined): string {
	return ROUND_LABELS[roundOf(type)];
}

/** "Standard", for table cells and column headers where "round" is already said. */
export function roundName(type: RoundType | null | undefined): string {
	return ROUND_NAMES[roundOf(type)];
}

export function isRoundType(value: unknown): value is RoundType {
	return value === "standard" || value === "reliability" || value === "inventory";
}

/** The bucket for records without a zone. */
export const NO_ZONE = "No zone";

/** A record's zone as a table shows it: the zone's name when known, its id otherwise, or "No zone". */
export function zoneName(zone: string | null | undefined, names?: ReadonlyMap<string, string>): string {
	if (zone === null || zone === undefined || zone === "") return NO_ZONE;
	return names?.get(zone) ?? zone;
}

const COUNT = new Intl.NumberFormat("en-US");

/** "1 site", "26 observations", "1,204 observations": an exact count with the right word. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
	return `${COUNT.format(count)} ${count === 1 ? singular : pluralForm}`;
}

/** A count with digit grouping: "1,204". */
export function formatCount(count: number): string {
	return COUNT.format(count);
}

/** "12 KB", "3.4 MB": a file size as a person reads it. */
export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
