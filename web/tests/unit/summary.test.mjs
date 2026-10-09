import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { load } from "./support.mjs";

const { activity, byDay, byObserver, byQuestion, byRound, byZone, countBy, coverageMatrix, fieldReturn } =
	await load("lib/observations/summary.ts");
const { clock } = await load("lib/time.ts");

const janet = JSON.parse(readFileSync(new URL("../../../contracts/forms/janet-test-v1.json", import.meta.url), "utf8"));
const ny = clock("America/New_York");

let serial = 0;
function row(overrides = {}) {
	serial += 1;
	return {
		observation_id: `70000000-0000-4000-8000-${String(serial).padStart(12, "0")}`,
		site_code: "fall-creek",
		site_name: "Fall Creek",
		zone: "A",
		round_type: "standard",
		first_round: true,
		placement: "hand",
		observer: "OB",
		observed_at: "2026-10-07T14:00:00Z",
		received_at: "2026-10-07T17:00:00Z",
		form_version: "janet-test-v1",
		revision: 1,
		coordinates: [-76.4957, 42.4508],
		answers: {},
		...overrides
	};
}

const zones = [
	{ id: "A", label: "Zone A · Whole playground" },
	{ id: "B", label: "Zone B · Garden" }
];

test("counts by key, most frequent first", () => {
	const counts = countBy([{ k: "x" }, { k: "y" }, { k: "y" }, { k: null }], item => item.k);
	assert.deepEqual(
		counts.map(entry => [entry.key, entry.count]),
		[
			["y", 2],
			[null, 1],
			["x", 1]
		]
	);
});

test("by zone: the site's zones in order, historical zones by id, and No zone kept", () => {
	const rows = [row(), row(), row({ zone: "C-old" }), row({ zone: null }), row({ zone: null })];
	assert.deepEqual(
		byZone(rows, zones).map(entry => [entry.key, entry.label, entry.count]),
		[
			["A", "Zone A · Whole playground", 2],
			["B", "Zone B · Garden", 0],
			["C-old", "C-old", 1],
			[null, "No zone", 2]
		]
	);
});

test("by round: legacy records without a round count as Standard", () => {
	const rows = [
		row(),
		row({ round_type: null }),
		row({ round_type: "reliability" }),
		row({ round_type: "inventory" })
	];
	assert.deepEqual(
		byRound(rows).map(entry => [entry.key, entry.label, entry.count]),
		[
			["standard", "Standard round", 2],
			["reliability", "Reliability round", 1],
			["inventory", "Inventory round", 1]
		]
	);
});

test("by observer, most first", () => {
	const rows = [row({ observer: "JL" }), row({ observer: "OB" }), row({ observer: "OB" })];
	assert.deepEqual(
		byObserver(rows).map(entry => [entry.key, entry.count]),
		[
			["OB", 2],
			["JL", 1]
		]
	);
});

test("by day groups by observed_at in the project's timezone across the fall-back day", () => {
	const rows = [
		row({ observed_at: "2026-11-01T04:30:00Z" }), // 00:30 EDT Nov 01
		row({ observed_at: "2026-11-02T04:30:00Z" }), // 23:30 EST Nov 01
		row({ observed_at: "2026-11-03T15:00:00Z", received_at: "2026-11-10T15:00:00Z" })
	];
	assert.deepEqual(
		byDay(rows, ny).map(entry => [entry.key, entry.count]),
		[
			["2026-11-01", 2],
			["2026-11-03", 1]
		]
	);
	assert.deepEqual(
		byDay(rows, ny, { fill: true }).map(entry => [entry.key, entry.label, entry.count]),
		[
			["2026-11-01", "Nov 01, 2026", 2],
			["2026-11-02", "Nov 02, 2026", 0],
			["2026-11-03", "Nov 03, 2026", 1]
		]
	);
});

test("by question: options in form order, unknown values, then Not answered", () => {
	const rows = [
		row({ answers: { play_type_1: "physical" } }),
		row({ answers: { play_type_1: "physical" } }),
		row({ answers: { play_type_1: "made_up" } }),
		row({ answers: {} })
	];
	const counts = byQuestion(janet, "play_type_1", rows);
	assert.equal(counts[0].key, "physical");
	assert.equal(counts[0].count, 2);
	assert.equal(counts.length, janet.questions[1].options.length + 2);
	assert.deepEqual(
		counts.slice(-2).map(entry => [entry.key, entry.label, entry.count]),
		[
			["made_up", "made_up", 1],
			[null, "Not answered", 1]
		]
	);
});

test("by question counts each option of a multi-select answer", () => {
	const definition = {
		questions: [
			{
				id: "parts",
				kind: "many",
				label: "Parts",
				options: [
					{ code: "a", label: "A" },
					{ code: "b", label: "B" }
				]
			}
		]
	};
	const rows = [row({ answers: { parts: ["a", "b"] } }), row({ answers: { parts: ["b"] } })];
	assert.deepEqual(
		byQuestion(definition, "parts", rows).map(entry => [entry.key, entry.count]),
		[
			["a", 1],
			["b", 2]
		]
	);
});

test("coverage is records by zone and round type, with legacy rounds as Standard and No zone kept", () => {
	const rows = [
		row(),
		row({ round_type: null }),
		row({ round_type: "reliability" }),
		row({ round_type: "inventory", zone: "B" }),
		row({ zone: null })
	];
	const coverage = coverageMatrix(rows, zones);
	assert.deepEqual(
		coverage.rows.map(entry => [
			entry.zone,
			entry.known,
			entry.counts.standard,
			entry.counts.reliability,
			entry.counts.inventory,
			entry.total
		]),
		[
			["A", true, 2, 1, 0, 3],
			["B", true, 0, 0, 1, 1],
			[null, false, 1, 0, 0, 1]
		]
	);
	assert.deepEqual(coverage.totals, { standard: 3, reliability: 1, inventory: 1 });
	assert.equal(coverage.total, 5);
	assert.equal(coverage.max, 2);
});

test("field return: the exact total from the sites, today and the last 7 days in the project's timezone", () => {
	const sites = [
		{ code: "fall-creek", name: "Fall Creek", observation_count: 812 },
		{ code: "empty", name: "Empty site", observation_count: 0 }
	];
	const now = "2026-10-08T15:00:00Z"; // 11:00 Oct 08 in New York
	const rows = [
		row({ observed_at: "2026-10-08T13:00:00Z", received_at: "2026-10-08T14:00:00Z" }), // today
		row({ observed_at: "2026-10-08T03:30:00Z", received_at: "2026-10-08T14:30:00Z" }), // 23:30 Oct 07: yesterday
		row({ observed_at: "2026-10-02T15:00:00Z" }), // 6 days ago: inside the week
		row({ observed_at: "2026-10-01T15:00:00Z" }) // 7 days ago: outside
	];
	const result = fieldReturn(sites, rows, now, ny);
	assert.equal(result.total, 812);
	assert.equal(result.todayKey, "2026-10-08");
	assert.equal(result.today, 1);
	assert.equal(result.last7Days, 3);
	assert.equal(result.recentIsExact, true);
	assert.equal(result.lastReceivedAt, "2026-10-08T14:30:00Z");
	assert.equal(result.lastObservedAt, "2026-10-08T13:00:00Z");
	assert.deepEqual(result.bySite[1], { code: "empty", name: "Empty site", count: 0 });
});

test("field return says when a capped list may miss records of the last 7 days", () => {
	const now = "2026-10-08T15:00:00Z";
	const recent = Array.from({ length: 500 }, () => row({ observed_at: "2026-10-08T13:00:00Z" }));
	assert.equal(fieldReturn([], recent, now, ny).recentIsExact, false);
	const reachesBack = [...recent.slice(1), row({ observed_at: "2026-09-01T13:00:00Z" })];
	assert.equal(fieldReturn([], reachesBack, now, ny).recentIsExact, true);
});

test("activity groups observations by day and observer and lists packages, versions and sites, newest first", () => {
	const rows = [
		row({ observer: "OB", observed_at: "2026-10-07T14:00:00Z" }),
		row({ observer: "OB", observed_at: "2026-10-07T15:00:00Z" }),
		row({ observer: "JL", observed_at: "2026-10-07T16:00:00Z" })
	];
	const packages = [
		{ package_id: "p1", site_code: "fall-creek", version: 1, state: "ready", prepared_at: "2026-10-05T12:00:00Z" },
		{ package_id: "p2", site_code: "fall-creek", version: 2, state: "blocked", prepared_at: "2026-10-06T12:00:00Z" }
	];
	const forms = [
		{
			code: "behaviour",
			name: "Behaviour mapping",
			versions: [
				{
					code: "behaviour-v2",
					version: 2,
					state: "draft",
					created_at: "2026-10-08T09:00:00Z",
					published_at: null
				},
				{
					code: "behaviour-v1",
					version: 1,
					state: "published",
					created_at: "2026-10-01T09:00:00Z",
					published_at: "2026-10-04T09:00:00Z"
				}
			]
		}
	];
	const sites = [
		{ code: "fall-creek", name: "Fall Creek", observation_count: 3, created_at: "2026-10-03T09:00:00Z" }
	];
	const entries = activity({ rows, packages, forms, sites }, ny);
	assert.deepEqual(
		entries.map(entry => entry.title),
		[
			"Draft v2 of Behaviour mapping started",
			"1 observation by JL",
			"2 observations by OB",
			"Map package v2 for Fall Creek was blocked",
			"Map package v1 prepared for Fall Creek",
			"Behaviour mapping v1 published",
			"Site Fall Creek added"
		]
	);
	const group = entries.find(entry => entry.observer === "OB");
	assert.equal(group.at, "2026-10-07T15:00:00Z");
	assert.equal(group.detail, "Fall Creek");
	assert.equal(activity({ rows, packages, forms, sites }, ny, { limit: 2 }).length, 2);
});
