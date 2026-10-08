import assert from "node:assert/strict";
import test from "node:test";

import { answerColumns, codebookFor, RECORD_COLUMNS } from "../src/features/data/exportColumns.ts";

const answers = [
	{ questionId: "observer_initials", label: "Observer initials", value: "JL" },
	{ questionId: "age_range", label: "Age range", value: "6-8" },
	{ questionId: "round", label: "Which round, as the observer recalls", value: "2" },
	{ questionId: "notes", label: 'Notes, "if any"', value: null }
];

test("leaves out the observer answer, which the record column already carries", () => {
	const columns = answerColumns(answers);
	assert.equal(
		columns.some(column => column.code === "observer_initials"),
		false
	);
});

test("renames an answer whose id matches a record column, so every header is unique", () => {
	const headers = [
		...RECORD_COLUMNS.map(entry => entry.column),
		...answerColumns(answers).map(column => column.exportColumn)
	];
	assert.equal(new Set(headers).size, headers.length);
	assert.ok(headers.includes("answer_round"));
	assert.ok(headers.includes("age_range"));
});

test("the codebook lists exactly the file's columns, each once, with the question label", () => {
	const rows = [{ answers: answerColumns(answers) }, { answers: answerColumns(answers) }];
	const lines = codebookFor(rows).split("\n");
	assert.equal(lines[0], "export_column,source,label");
	const columns = lines.slice(1).map(line => line.split(",")[0]);
	assert.deepEqual(columns, [...RECORD_COLUMNS.map(entry => entry.column), "age_range", "answer_round", "notes"]);
	assert.ok(lines.includes('notes,question notes,"Notes, ""if any"""'));
	assert.ok(lines.includes("age_range,question age_range,Age range"));
});
