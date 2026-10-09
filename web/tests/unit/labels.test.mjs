import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { load } from "./support.mjs";

const { formatBytes, NO_ZONE, plural, ROUND_TYPES, roundLabel, roundName, roundOf, shortLabel, zoneName } =
	await load("lib/labels.ts");

test("record labels match the collector's: OBS- and the first six characters, upper case", () => {
	assert.equal(shortLabel("3f2a1b9c-0000-4000-8000-000000000001"), "OBS-3F2A1B");
	const mobile = readFileSync(new URL("../../../mobile/src/domain/labels.ts", import.meta.url), "utf8");
	assert.match(mobile, /`OBS-\$\{id\.slice\(0, 6\)\.toUpperCase\(\)\}`/);
});

test("round names match the collector's", () => {
	assert.deepEqual(ROUND_TYPES, ["standard", "reliability", "inventory"]);
	const mobile = readFileSync(new URL("../../../mobile/src/domain/rounds.ts", import.meta.url), "utf8");
	for (const type of ROUND_TYPES) assert.ok(mobile.includes(`label: "${roundLabel(type)}"`), type);
	assert.equal(roundName("reliability"), "Reliability");
});

test("a record without a round reads as Standard", () => {
	assert.equal(roundOf(null), "standard");
	assert.equal(roundLabel(null), "Standard round");
	assert.equal(roundLabel(undefined), "Standard round");
});

test("a record without a zone reads No zone; a zone without a name reads its id", () => {
	const names = new Map([["A", "Zone A · Whole playground"]]);
	assert.equal(zoneName(null), NO_ZONE);
	assert.equal(zoneName("", names), NO_ZONE);
	assert.equal(zoneName("A", names), "Zone A · Whole playground");
	assert.equal(zoneName("B", names), "B");
});

test("counts are exact with the right word", () => {
	assert.equal(plural(1, "site"), "1 site");
	assert.equal(plural(0, "observation"), "0 observations");
	assert.equal(plural(1204, "observation"), "1,204 observations");
	assert.equal(plural(2, "person", "people"), "2 people");
});

test("file sizes read in KB and MB", () => {
	assert.equal(formatBytes(512), "512 B");
	assert.equal(formatBytes(12_800), "13 KB");
	assert.equal(formatBytes(3.4 * 1024 * 1024), "3.4 MB");
});
