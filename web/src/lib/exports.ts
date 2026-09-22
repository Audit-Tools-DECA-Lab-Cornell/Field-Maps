import { VARIABLES } from "@/data/instrument";
import type { Observation } from "@/types/domain";

/**
 * Exports are for analysis, backup and interoperability. They are not the sync path — QGIS reads
 * the live database directly, so nothing here is on the way to anywhere.
 *
 * Two rules the format has to keep: longitude and latitude are explicit numeric columns in
 * EPSG:4326, and a hidden answer stays distinguishable from an empty one. A flagged record is
 * never silently dropped — its flag travels as a column.
 */

export interface ExportOptions {
	readonly codebook: boolean;
	readonly includeFlagged: boolean;
}

function escapeCsv(value: string): string {
	return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function columnsOf(records: readonly Observation[]): readonly { code: string; header: string }[] {
	const seen = new Map<string, string>();
	for (const record of records)
		for (const answer of record.answers)
			if (!seen.has(answer.code))
				seen.set(answer.code, answer.exportColumn === "" ? answer.code : answer.exportColumn);
	return [...seen].map(([code, header]) => ({ code, header }));
}

export function toCsv(records: readonly Observation[], options: ExportOptions): string {
	const rows = options.includeFlagged ? records : records.filter(record => record.flagId === null);
	const columns = columnsOf(rows);
	const header = [
		"observation_id",
		"site_code",
		"zone_id",
		"round",
		"observer_initials",
		"observed_at",
		"received_at",
		"form_version",
		"revision",
		"record_state",
		"quality_flag",
		"longitude",
		"latitude",
		...columns.map(column => column.header)
	];
	const lines = [header.join(",")];
	for (const record of rows) {
		const answers = new Map(record.answers.map(answer => [answer.code, answer.value]));
		lines.push(
			[
				record.id,
				record.siteId,
				record.zoneId,
				String(record.round),
				record.observerCode,
				record.observedAt,
				record.receivedAt,
				record.formVersionCode,
				String(record.revision),
				record.state,
				record.flagId ?? "",
				record.longitude.toFixed(6),
				record.latitude.toFixed(6),
				// An empty cell is an unanswered field; a hidden question exports as the literal n/a.
				...columns.map(column => {
					const value = answers.get(column.code);
					return value === undefined ? "" : (value ?? "n/a");
				})
			]
				.map(escapeCsv)
				.join(",")
		);
	}
	return lines.join("\n");
}

export function toGeoJson(records: readonly Observation[], options: ExportOptions): string {
	const rows = options.includeFlagged ? records : records.filter(record => record.flagId === null);
	return JSON.stringify(
		{
			type: "FeatureCollection",
			features: rows.map(record => ({
				type: "Feature",
				// RFC 7946: longitude first, and no CRS member, because 4326 is the only option.
				geometry: {
					type: "Point",
					coordinates: [Number(record.longitude.toFixed(6)), Number(record.latitude.toFixed(6))]
				},
				properties: {
					observation_id: record.id,
					zone_id: record.zoneId,
					round: record.round,
					observer_initials: record.observerCode,
					observed_at: record.observedAt,
					received_at: record.receivedAt,
					form_version: record.formVersionCode,
					revision: record.revision,
					record_state: record.state,
					quality_flag: record.flagId,
					...Object.fromEntries(
						record.answers.map(answer => [
							answer.exportColumn === "" ? answer.code : answer.exportColumn,
							answer.value
						])
					)
				}
			}))
		},
		null,
		2
	);
}

/** The codebook is what makes a coded export readable a year later. */
export function toCodebook(): string {
	const lines = ["variable_code,export_column,label,scope,format,open_question"];
	for (const variable of VARIABLES.filter(entry => entry.included))
		lines.push(
			[variable.code, variable.exportColumn, variable.label, variable.scope, variable.format, variable.flag ?? ""]
				.map(escapeCsv)
				.join(",")
		);
	return lines.join("\n");
}

export function download(name: string, mime: string, body: string): void {
	const url = URL.createObjectURL(new Blob([body], { type: mime }));
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = name;
	anchor.click();
	URL.revokeObjectURL(url);
}
