import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { load } from "./support.mjs";

const { codebook, exportColumns, exportFileName, NULL_ANSWER, toCsv, toGeoJson } =
	await load("lib/export/observations.ts");
const { RECORD_COLUMNS } = await load("lib/export/columns.ts");

const janet = JSON.parse(readFileSync(new URL("../../../contracts/forms/janet-test-v1.json", import.meta.url), "utf8"));
const legacy = {
	fields: [
		{ code: "people", type: "integer" },
		{ code: "notes", type: "text" }
	]
};
const definitions = { "janet-test-v1": janet, "shell-v1": legacy };

function row(overrides = {}) {
	return {
		observation_id: "3f2a1b9c-0000-4000-8000-000000000001",
		site_code: "fall-creek",
		site_name: "Fall Creek",
		zone: "A",
		round_type: "standard",
		first_round: true,
		placement: "hand",
		observer: "OB",
		observed_at: "2026-10-07T14:00:00Z",
		received_at: "2026-10-08T17:00:00Z",
		form_version: "janet-test-v1",
		revision: 1,
		coordinates: [-76.4857123, 42.4483456],
		answers: {},
		...overrides
	};
}

/** A small RFC 4180 reader, enough to read back what toCsv writes. */
function parseCsv(text) {
	const rows = [];
	let field = "";
	let current = [];
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (char === '"') quoted = false;
			else field += char;
		} else if (char === '"') quoted = true;
		else if (char === ",") {
			current.push(field);
			field = "";
		} else if (char === "\r" && text[i + 1] === "\n") {
			current.push(field);
			rows.push(current);
			current = [];
			field = "";
			i++;
		} else field += char;
	}
	if (field !== "" || current.length > 0) rows.push([...current, field]);
	return rows;
}

function table(csv) {
	const [header, ...rows] = parseCsv(csv);
	return rows.map(cells => Object.fromEntries(header.map((name, index) => [name, cells[index]])));
}

test("record columns come first, then each question's export column or id; the observer answer is left out", () => {
	const [header] = parseCsv(toCsv([row()], definitions));
	assert.deepEqual(
		header.slice(0, RECORD_COLUMNS.length),
		RECORD_COLUMNS.map(entry => entry.column)
	);
	const answers = header.slice(RECORD_COLUMNS.length);
	assert.ok(answers.includes("Child_AgeRange"));
	assert.ok(answers.includes("play_subtype_1"), "a question without an export column uses its id");
	assert.ok(!answers.includes("observer") && !answers.includes("answer_observer"));
	assert.ok(answers.includes("people") && answers.includes("notes"), "legacy fields get columns too");
	assert.equal(new Set(header).size, header.length);
});

test("commas, quotes, line breaks and Unicode survive a round trip", () => {
	const note = 'Said "again", then\nleft — 🌿 café';
	const csv = toCsv([row({ answers: { play_event_summary: note } })], definitions);
	assert.ok(csv.endsWith("\r\n"));
	const [record] = table(csv);
	assert.equal(record.Play_Event_Summary, note);
	assert.equal(record.label, "OBS-3F2A1B");
	assert.ok(toCsv([row()], definitions, { byteOrderMark: true }).startsWith("﻿"));
});

test("a missing answer is an empty cell and a null answer is n/a", () => {
	const [record] = table(toCsv([row({ answers: { age_range: null } })], definitions));
	assert.equal(record.Child_AgeRange, NULL_ANSWER);
	assert.equal(record.Play_Type_1, "");
});

test("round, zone and placement columns follow the collector; legacy rounds read as standard", () => {
	const rows = [
		row({ round_type: "reliability", first_round: false }),
		row({ round_type: "inventory", first_round: null, placement: "zone" }),
		row({
			round_type: null,
			first_round: null,
			zone: null,
			placement: null,
			form_version: "shell-v1",
			answers: { people: 3 }
		})
	];
	const [reliability, inventory, old] = table(toCsv(rows, definitions));
	assert.deepEqual(
		[reliability.round_type, reliability.Rel_Round, reliability.First_Round],
		["reliability", "yes", "no"]
	);
	assert.deepEqual(
		[inventory.round_type, inventory.Rel_Round, inventory.First_Round, inventory.placement],
		["inventory", "", "", "zone"]
	);
	assert.deepEqual(
		[old.round_type, old.Rel_Round, old.First_Round, old.zone, old.placement],
		["standard", "no", "", "", ""]
	);
	assert.equal(old.people, "3");
	assert.equal(old.Child_AgeRange, "", "a column another form fills is empty for this record");
});

test("multi-select answers join their codes; coordinates keep full precision", () => {
	const definition = {
		questions: [
			{
				id: "parts",
				kind: "many",
				label: "Parts",
				exportColumn: "Parts",
				options: [
					{ code: "a", label: "A" },
					{ code: "b", label: "B" }
				]
			}
		]
	};
	const [record] = table(toCsv([row({ form_version: "x", answers: { parts: ["a", "b"] } })], { x: definition }));
	assert.equal(record.Parts, "a;b");
	assert.equal(record.longitude, "-76.4857123");
	assert.equal(record.latitude, "42.4483456");
});

test("an answer the definition does not have keeps its own column", () => {
	const [record] = table(toCsv([row({ answers: { surprise: "kept", zone: "dup" } })], definitions));
	assert.equal(record.surprise, "kept");
	assert.equal(record.answer_zone, "dup", "an answer named like a record column is renamed");
	assert.equal(record.zone, "A");
});

test("GeoJSON points are [longitude, latitude]; missing answers are absent and null answers null", () => {
	const collection = JSON.parse(
		toGeoJson(
			[row({ answers: { age_range: null, play_type_1: "physical", observer_initials: "OB" } })],
			definitions
		)
	);
	assert.equal(collection.type, "FeatureCollection");
	const [feature] = collection.features;
	assert.deepEqual(feature.geometry, { type: "Point", coordinates: [-76.4857123, 42.4483456] });
	assert.equal(feature.id, "3f2a1b9c-0000-4000-8000-000000000001");
	assert.equal(feature.properties.Child_AgeRange, null);
	assert.equal(feature.properties.Play_Type_1, "physical");
	assert.equal("Play_Type_2" in feature.properties, false);
	assert.equal("observer_initials" in feature.properties, false);
	assert.equal("longitude" in feature.properties, false);
	assert.equal(feature.properties.observer, "OB");
	assert.equal(feature.properties.zone, "A");
});

test("the codebook lists exactly the file's columns, with labels, types and option codes", () => {
	const rows = [row({ answers: { surprise: "kept" } })];
	const lines = parseCsv(codebook(definitions, rows));
	assert.deepEqual(lines[0], ["export_column", "source", "label", "type", "values"]);
	const [header] = parseCsv(toCsv(rows, definitions));
	assert.deepEqual(
		lines.slice(1).map(line => line[0]),
		header
	);
	const age = lines.find(line => line[0] === "Child_AgeRange");
	assert.equal(age[1], "question age_range (janet-test-v1)");
	assert.equal(age[2], "How old is the target child?");
	assert.equal(age[3], "one option");
	assert.match(age[4], /^age_0_2 = 0–2 yrs; age_3_5 = 3–5 yrs/);
	assert.equal(lines.find(line => line[0] === "people")[3], "number");
	assert.equal(exportColumns(rows, definitions).at(-1).type, "unknown");
});

test("export file names say what they hold and when", () => {
	assert.equal(
		exportFileName("play-study", "observations", "2026-10-08", "csv"),
		"play-study-observations-2026-10-08.csv"
	);
	assert.equal(exportFileName("play-study", "codebook", "2026-10-08", "csv"), "play-study-codebook-2026-10-08.csv");
});
