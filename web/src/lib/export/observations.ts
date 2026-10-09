import { roundOf, shortLabel } from "../labels";
import { allOptions, type FormQuestion, readDefinition } from "../observations/answers";
import type { RoundType } from "../workspace/types";
import { answerHeader, csvLine, RECORD_COLUMNS, repeatsRecordColumn } from "./columns";

/**
 * Observation exports for analysis in R, Excel or QGIS: CSV, GeoJSON and a codebook, from the list the
 * API returns and each record's own historical form definition.
 *
 * - Coordinates are EPSG:4326. CSV has explicit `longitude` and `latitude` columns; GeoJSON points are
 *   [longitude, latitude] (RFC 7946).
 * - A missing answer and an empty one stay distinct. CSV: an empty cell means the record has no answer to
 *   that question; `n/a` means the record stores an empty (null) answer. GeoJSON: the property is absent,
 *   or null.
 * - A multi-select answer is its option codes joined with ";". Yes/no answers are "yes" and "no".
 * - Nothing the record holds is dropped: an answer whose question is not in its definition gets a column
 *   under its own id.
 */

/** The parts of an observation an export writes. `ObservationRow` and `StoredObservation` both fit. */
export type ExportRow = {
	readonly observation_id: string;
	readonly site_code: string;
	readonly site_name: string;
	readonly zone: string | null;
	readonly round_type: RoundType | null;
	readonly first_round: boolean | null;
	readonly placement: "hand" | "zone" | null;
	readonly observer: string;
	readonly observed_at: string;
	readonly received_at?: string | null;
	readonly form_version: string;
	readonly revision: number;
	readonly coordinates: readonly [number, number] | readonly number[];
	readonly answers: Readonly<Record<string, unknown>>;
};

/** Form version code → its definition, as `GET …/form-versions/{code}` returns it. */
export type Definitions = Readonly<Record<string, unknown>>;

/** What a null answer is written as in CSV. */
export const NULL_ANSWER = "n/a";

/** One sentence for the export dialog about empty cells. */
export const EMPTY_CELL_NOTE =
	"In the CSV, an empty answer cell means the question was not answered, and n/a means the record stores an empty answer.";

export type ExportColumn = {
	readonly header: string;
	/** The question id (or the answer's own key when its question is unknown). */
	readonly questionId: string;
	readonly label: string;
	/** "one option", "options separated by ;", "text", "number", "yes or no", or "unknown". */
	readonly type: string;
	/** "code = Label; …" for choice questions. */
	readonly values: string;
	/** The form versions whose records fill this column. */
	readonly formVersions: readonly string[];
};

type Plan = {
	readonly columns: ExportColumn[];
	/** Per form version: header → question id. */
	readonly byVersion: Map<string, Map<string, string>>;
};

const TYPES: Record<FormQuestion["kind"], string> = {
	one: "one option",
	many: "options separated by ;",
	text: "text",
	number: "number",
	boolean: "yes or no"
};

/**
 * The answer columns for these definitions and records: each definition's questions in form order (the
 * definitions in the order given), then answers no definition explains. One question keeps one column
 * across versions; two questions of one form that share an export column get `<column>_<question id>`.
 */
function plan(rows: readonly ExportRow[], definitions: Definitions): Plan {
	const columns = new Map<string, { column: ExportColumn; versions: Set<string> }>();
	const byVersion = new Map<string, Map<string, string>>();
	const repeated = new Map<string, Set<string>>();
	const add = (version: string, header: string, column: Omit<ExportColumn, "header" | "formVersions">) => {
		const existing = columns.get(header);
		if (existing) existing.versions.add(version);
		else columns.set(header, { column: { ...column, header, formVersions: [] }, versions: new Set([version]) });
		const map = byVersion.get(version) ?? new Map<string, string>();
		map.set(header, column.questionId);
		byVersion.set(version, map);
	};

	for (const [version, definition] of Object.entries(definitions)) {
		const used = new Map<string, string>();
		for (const question of readDefinition(definition).questions) {
			if (repeatsRecordColumn(question.id, question.exportColumn)) {
				repeated.set(version, (repeated.get(version) ?? new Set()).add(question.id));
				continue;
			}
			let header = answerHeader(question.id, question.exportColumn);
			if (used.has(header)) header = `${header}_${question.id}`;
			used.set(header, question.id);
			add(version, header, {
				questionId: question.id,
				label: question.label,
				type: TYPES[question.kind],
				values: allOptions(question)
					.map(option => `${option.code} = ${option.label}`)
					.join("; ")
			});
		}
		if (!byVersion.has(version)) byVersion.set(version, new Map());
	}

	for (const row of rows) {
		let map = byVersion.get(row.form_version);
		if (!map) {
			map = new Map<string, string>();
			byVersion.set(row.form_version, map);
		}
		const mapped = new Set(map.values());
		for (const key of Object.keys(row.answers)) {
			if (mapped.has(key) || repeated.get(row.form_version)?.has(key) || repeatsRecordColumn(key)) continue;
			const header = map.has(answerHeader(key)) ? `${answerHeader(key)}_${key}` : answerHeader(key);
			add(row.form_version, header, { questionId: key, label: key, type: "unknown", values: "" });
			mapped.add(key);
		}
	}

	return {
		columns: [...columns.values()].map(({ column, versions }) => ({
			...column,
			formVersions: [...versions].sort()
		})),
		byVersion
	};
}

/** The answer columns an export of these records would have, in file order. */
export function exportColumns(rows: readonly ExportRow[], definitions: Definitions): ExportColumn[] {
	return plan(rows, definitions).columns;
}

function yesNo(value: boolean | null | undefined): string | null {
	return value === true ? "yes" : value === false ? "no" : null;
}

/** The record columns as values: null where the record has nothing. */
function recordValues(row: ExportRow): Record<string, string | number | null> {
	const round = roundOf(row.round_type);
	const inventory = round === "inventory";
	const [longitude, latitude] = row.coordinates;
	return {
		observation_id: row.observation_id,
		label: shortLabel(row.observation_id),
		site_code: row.site_code,
		site_name: row.site_name,
		zone: row.zone || null,
		round_type: round,
		Rel_Round: inventory ? null : round === "reliability" ? "yes" : "no",
		First_Round: inventory ? null : yesNo(row.first_round),
		placement: row.placement ?? null,
		observer: row.observer,
		observed_at: row.observed_at,
		received_at: row.received_at ?? null,
		form_version: row.form_version,
		revision: row.revision,
		longitude: typeof longitude === "number" ? longitude : null,
		latitude: typeof latitude === "number" ? latitude : null
	};
}

function cellOf(value: unknown): string {
	if (value === null) return NULL_ANSWER;
	if (typeof value === "string") return value;
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
	if (typeof value === "boolean") return value ? "yes" : "no";
	if (Array.isArray(value)) return value.map(entry => (entry === null ? NULL_ANSWER : cellOf(entry))).join(";");
	return JSON.stringify(value);
}

export type CsvOptions = {
	/** Start the file with a UTF-8 byte order mark, so Excel reads accents and symbols correctly. */
	readonly byteOrderMark?: boolean;
};

/** The records as CSV (RFC 4180: quoted where needed, CRLF between records). */
export function toCsv(rows: readonly ExportRow[], definitions: Definitions, options: CsvOptions = {}): string {
	const { columns, byVersion } = plan(rows, definitions);
	const lines = [csvLine([...RECORD_COLUMNS.map(entry => entry.column), ...columns.map(column => column.header)])];
	for (const row of rows) {
		const record = recordValues(row);
		const map = byVersion.get(row.form_version);
		lines.push(
			csvLine([
				...RECORD_COLUMNS.map(entry => {
					const value = record[entry.column];
					return value === null || value === undefined ? "" : String(value);
				}),
				...columns.map(column => {
					const questionId = map?.get(column.header);
					if (questionId === undefined || !Object.hasOwn(row.answers, questionId)) return "";
					const value = row.answers[questionId];
					return value === undefined ? "" : cellOf(value);
				})
			])
		);
	}
	return `${options.byteOrderMark ? "﻿" : ""}${lines.join("\r\n")}\r\n`;
}

/** The records as a GeoJSON FeatureCollection of points, [longitude, latitude], with every column as a property. */
export function toGeoJson(rows: readonly ExportRow[], definitions: Definitions): string {
	const { columns, byVersion } = plan(rows, definitions);
	const features = rows.map(row => {
		const record = recordValues(row);
		const properties: Record<string, unknown> = {};
		for (const entry of RECORD_COLUMNS) {
			if (entry.column === "longitude" || entry.column === "latitude") continue;
			properties[entry.column] = record[entry.column] ?? null;
		}
		const map = byVersion.get(row.form_version);
		for (const column of columns) {
			const questionId = map?.get(column.header);
			if (questionId === undefined || !Object.hasOwn(row.answers, questionId)) continue;
			const value = row.answers[questionId];
			if (value !== undefined) properties[column.header] = value;
		}
		return {
			type: "Feature",
			id: row.observation_id,
			geometry: { type: "Point", coordinates: [record.longitude, record.latitude] },
			properties
		};
	});
	return `${JSON.stringify({ type: "FeatureCollection", features }, null, 2)}\n`;
}

/**
 * The codebook for an export of these records with these definitions: one line per column, record
 * columns first, each with where it comes from, the question as observers saw it, what its cells hold,
 * and the option codes and their labels.
 */
export function codebook(definitions: Definitions, rows: readonly ExportRow[] = []): string {
	const lines = [csvLine(["export_column", "source", "label", "type", "values"])];
	for (const entry of RECORD_COLUMNS) lines.push(csvLine([entry.column, "record", entry.label, entry.type, ""]));
	for (const column of plan(rows, definitions).columns)
		lines.push(
			csvLine([
				column.header,
				`question ${column.questionId} (${column.formVersions.join(", ")})`,
				column.label,
				column.type,
				column.values
			])
		);
	return `${lines.join("\r\n")}\r\n`;
}

/** "play-study-observations-2026-10-08.csv": a file name from the project code, what it holds and the day. */
export function exportFileName(
	projectCode: string,
	what: "observations" | "codebook",
	dayKey: string,
	extension: "csv" | "geojson"
): string {
	return `${projectCode}-${what}-${dayKey}.${extension}`;
}
