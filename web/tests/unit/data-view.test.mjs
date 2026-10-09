import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { load } from "./support.mjs";

const {
	applyFilters,
	clip,
	exactTotal,
	filterOptions,
	NO_ZONE_KEY,
	paramsGetter,
	parseClientFilters,
	parseScope,
	parseView,
	planSiteCode,
	prepareRecords,
	SUMMARY_LIMIT,
	summaryOf,
	viewQuery
} = await load("features/data/view.ts");
const { clock } = await load("lib/time.ts");

const janet = JSON.parse(readFileSync(new URL("../../../contracts/forms/janet-test-v1.json", import.meta.url), "utf8"));
const legacy = {
	fields: [
		{ code: "notes", type: "text" },
		{ code: "people", type: "integer" }
	]
};
const ny = clock("America/New_York");

const sites = [
	{
		code: "fall-creek",
		name: "Fall Creek",
		zones: [
			{ id: "A", label: "Zone A · Whole playground" },
			{ id: "B", label: "Zone B · Garden" }
		]
	}
];

let serial = 0;
function row(overrides = {}) {
	serial += 1;
	return {
		observation_id: `7a0b${String(serial).padStart(2, "0")}c2-0000-4000-8000-000000000000`,
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
		coordinates: [-76.4957, 42.4508],
		answers: { play_type_1: "physical", play_event_summary: "Two children on the swings" },
		...overrides
	};
}

const params = pairs => key => new URLSearchParams(pairs).get(key);

test("the address holds the view and reads back to the same view", () => {
	const view = {
		site: "fall-creek",
		round: "reliability",
		zone: "A",
		observer: "OB",
		from: "2026-10-01",
		to: "2026-10-07",
		q: "swings"
	};
	const query = viewQuery(view);
	assert.equal(query, "?site=fall-creek&round=reliability&zone=A&observer=OB&from=2026-10-01&to=2026-10-07&q=swings");
	assert.deepEqual(parseView(params(query)), view);
	assert.equal(viewQuery({}), "");
});

test("a round type the API does not know, and a day that is not a day, are ignored", () => {
	assert.deepEqual(parseScope(params("site=fall-creek&round=weekly")), { site: "fall-creek", round: null });
	const filters = parseClientFilters(params("from=2026-02-30&to=yesterday&q=%20%20"));
	assert.equal(filters.from, null);
	assert.equal(filters.to, null);
	assert.equal(filters.q, "");
});

test("Next's searchParams object reads the same, taking the first of a repeated key", () => {
	const get = paramsGetter({ site: ["a", "b"], round: "inventory", zone: undefined });
	assert.deepEqual(parseScope(get), { site: "a", round: "inventory" });
	assert.equal(parseClientFilters(get).zone, null);
});

test("an answer is cut on one line without splitting an emoji", () => {
	assert.equal(clip("a\n  b\tc"), "a b c");
	assert.equal(clip("x".repeat(SUMMARY_LIMIT)), "x".repeat(SUMMARY_LIMIT));
	const long = "🌿".repeat(SUMMARY_LIMIT + 5);
	const cut = clip(long);
	assert.equal(Array.from(cut).length, SUMMARY_LIMIT + 1);
	assert.ok(cut.endsWith("…"));
	assert.doesNotMatch(cut, /\p{Surrogate}/u);
});

test("the summary is the play type when answered, otherwise the first answer in the form's order", () => {
	assert.deepEqual(summaryOf(janet, { play_type_1: "physical", play_event_summary: "Swings" }), {
		label: "Primary play type",
		value: "Physical"
	});
	assert.deepEqual(summaryOf(janet, { age_range: "age_6_8", play_event_summary: "Swings" }), {
		label: "How old is the target child?",
		value: "6–8 yrs"
	});
	assert.equal(summaryOf(janet, {}), null);
	assert.deepEqual(summaryOf(legacy, { people: 3, notes: "Quiet" }), { label: "Notes", value: "Quiet" });
	// A definition that could not be loaded still shows the answer, under its id in words.
	assert.deepEqual(summaryOf(undefined, { weather_kind: "sunny" }), { label: "Weather kind", value: "sunny" });
});

test("records are worded by their own form version and placed in the project's timezone", () => {
	const rows = [
		row({ observed_at: "2026-10-08T02:30:00Z", zone: "B", round_type: "reliability" }),
		row({ zone: null, round_type: null, form_version: "shell-v1", answers: { notes: "Quiet" } })
	];
	const [first, second] = prepareRecords(rows, { "janet-test-v1": janet, "shell-v1": legacy }, sites, ny);
	assert.match(first.label, /^OBS-7A0B[0-9]{2}$/);
	// 02:30 UTC on Oct 8 is 22:30 on Oct 7 in New York.
	assert.equal(first.dayKey, "2026-10-07");
	assert.equal(first.day, "Oct 07, 2026");
	assert.equal(first.time, "22:30");
	assert.equal(first.when, "Oct 07, 2026 · 22:30");
	assert.equal(first.zoneLabel, "Zone B · Garden");
	assert.equal(first.roundName, "Reliability");
	assert.equal(first.summary.value, "Physical");
	// No zone and no round: the "No zone" bucket and Standard, with the legacy form's own wording.
	assert.equal(second.zone, null);
	assert.equal(second.zoneKey, NO_ZONE_KEY);
	assert.equal(second.zoneLabel, "No zone");
	assert.equal(second.round, "standard");
	assert.deepEqual(second.summary, { label: "Notes", value: "Quiet" });
});

test("a zone the site no longer lists keeps its id as its name", () => {
	const [record] = prepareRecords([row({ zone: "OLD" })], { "janet-test-v1": janet }, sites, ny);
	assert.equal(record.zoneLabel, "OLD");
});

test("the filters narrow the loaded rows by zone, observer, day and words", () => {
	const rows = [
		row({ zone: "A", observer: "OB", observed_at: "2026-10-07T14:00:00Z" }),
		row({
			zone: "B",
			observer: "JS",
			observed_at: "2026-10-06T14:00:00Z",
			answers: { play_event_summary: "Sandpit" }
		}),
		row({ zone: null, observer: "OB", observed_at: "2026-10-05T14:00:00Z" })
	];
	const records = prepareRecords(rows, { "janet-test-v1": janet }, sites, ny);
	const none = { zone: null, observer: null, from: null, to: null, q: "" };
	const ids = filters => applyFilters(records, { ...none, ...filters }).map(record => record.id);

	assert.equal(ids({}).length, 3);
	assert.deepEqual(ids({ zone: "B" }), [records[1].id]);
	assert.deepEqual(ids({ zone: NO_ZONE_KEY }), [records[2].id]);
	assert.deepEqual(ids({ observer: "OB" }), [records[0].id, records[2].id]);
	assert.deepEqual(ids({ from: "2026-10-06", to: "2026-10-06" }), [records[1].id]);
	assert.deepEqual(ids({ to: "2026-10-05" }), [records[2].id]);
	// Search matches a label, an answer, an option's wording and a zone's name, all words required.
	assert.deepEqual(ids({ q: "sandpit" }), [records[1].id]);
	assert.deepEqual(ids({ q: records[0].label.toLowerCase() }), [records[0].id]);
	assert.deepEqual(ids({ q: "garden sandpit" }), [records[1].id]);
	assert.deepEqual(ids({ q: "physical", observer: "OB" }), [records[0].id, records[2].id]);
	assert.deepEqual(ids({ q: "no such words" }), []);
});

test("the zone and observer choices come from the rows, keep the chosen one, and put No zone last", () => {
	const records = prepareRecords(
		[row({ zone: null }), row({ zone: "B", observer: "JS" }), row({ zone: "A", observer: "OB" })],
		{ "janet-test-v1": janet },
		sites,
		ny
	);
	const options = filterOptions(records, { zone: null, observer: null }, sites);
	assert.deepEqual(
		options.zones.map(option => option.value),
		["A", "B", NO_ZONE_KEY]
	);
	assert.deepEqual(
		options.observers.map(option => option.value),
		["JS", "OB"]
	);
	// A link to a zone that has no rows in this list still shows that zone in the filter.
	const none = filterOptions([], { zone: "B", observer: "ZZ" }, sites);
	assert.deepEqual(none.zones, [{ value: "B", label: "Zone B · Garden" }]);
	assert.deepEqual(none.observers, [{ value: "ZZ", label: "ZZ" }]);
});

test("an exact total is only given when the site counts answer the scope", () => {
	const counts = [
		{ code: "a", observationCount: 600 },
		{ code: "b", observationCount: 25 }
	];
	assert.equal(exactTotal(counts, { site: null, round: null }), 625);
	assert.equal(exactTotal(counts, { site: "b", round: null }), 25);
	assert.equal(exactTotal(counts, { site: "zzz", round: null }), null);
	// There is no count by round type, so a round filter has no exact total.
	assert.equal(exactTotal(counts, { site: null, round: "reliability" }), null);
});

test("the plan is drawn for the chosen site, the only site, or the only site that has observations", () => {
	const one = [{ code: "a", observationCount: 0 }];
	const two = [
		{ code: "a", observationCount: 8 },
		{ code: "b", observationCount: 0 }
	];
	const both = [
		{ code: "a", observationCount: 8 },
		{ code: "b", observationCount: 3 }
	];
	assert.equal(planSiteCode(one, { site: null, round: null }), "a");
	assert.equal(planSiteCode(two, { site: null, round: null }), "a");
	assert.equal(planSiteCode(two, { site: "b", round: null }), "b");
	assert.equal(planSiteCode(both, { site: null, round: null }), null);
	assert.equal(planSiteCode(both, { site: "b", round: "standard" }), "b");
	assert.equal(planSiteCode(both, { site: "missing", round: null }), null);
});
