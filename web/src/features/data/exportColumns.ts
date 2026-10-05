/**
 * Names the answer columns of a Data export and writes the codebook for exactly those columns, so the
 * codebook describes the file it travels with. Pure: no imports, so the tests run it directly.
 */

/** The record columns lib/exports.ts writes before any answer, with what each one holds. */
export const RECORD_COLUMNS: readonly { readonly column: string; readonly label: string }[] = [
	{ column: "observation_id", label: "Observation ID" },
	{ column: "site_code", label: "Site" },
	{ column: "zone_id", label: "Zone code" },
	{ column: "round", label: "Round number" },
	{ column: "observer_initials", label: "Observer initials" },
	{ column: "observed_at", label: "When the observation was made (ISO 8601)" },
	{ column: "received_at", label: "When the server received it (ISO 8601)" },
	{ column: "form_version", label: "Form version the observer answered" },
	{ column: "revision", label: "Record revision" },
	{ column: "record_state", label: "Record state" },
	{ column: "quality_flag", label: "Quality flag, empty when none" },
	{ column: "longitude", label: "Longitude, EPSG:4326" },
	{ column: "latitude", label: "Latitude, EPSG:4326" }
];

const RECORD_COLUMN_NAMES = new Set(RECORD_COLUMNS.map(entry => entry.column));

/** Answers that repeat a record column: the record column already carries the value. */
const REPEATS_RECORD_COLUMN = new Set(["observer_initials"]);

export type AnswerInput = { readonly questionId: string; readonly label: string; readonly value: string | null };
export type AnswerColumn = {
	readonly code: string;
	readonly exportColumn: string;
	readonly label: string;
	readonly value: string | null;
};

/**
 * The answers as export columns. An answer that repeats a record column (the observer's initials) is left
 * out, and any other answer whose question id matches a record column is renamed `answer_<id>`, so every
 * header in the file is unique.
 */
export function answerColumns(answers: readonly AnswerInput[]): AnswerColumn[] {
	return answers.flatMap(answer => {
		if (REPEATS_RECORD_COLUMN.has(answer.questionId)) return [];
		const exportColumn = RECORD_COLUMN_NAMES.has(answer.questionId)
			? `answer_${answer.questionId}`
			: answer.questionId;
		return [{ code: answer.questionId, exportColumn, label: answer.label, value: answer.value }];
	});
}

function escapeCsv(value: string): string {
	return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * The codebook for one export: every record column, then every answer column in the order the file
 * first meets it, each with the question as the observer saw it.
 */
export function codebookFor(rows: readonly { readonly answers: readonly AnswerColumn[] }[]): string {
	const lines = ["export_column,source,label"];
	for (const entry of RECORD_COLUMNS) lines.push([entry.column, "record", entry.label].map(escapeCsv).join(","));
	const seen = new Set<string>();
	for (const row of rows)
		for (const answer of row.answers) {
			if (seen.has(answer.exportColumn)) continue;
			seen.add(answer.exportColumn);
			lines.push([answer.exportColumn, `question ${answer.code}`, answer.label].map(escapeCsv).join(","));
		}
	return lines.join("\n");
}
