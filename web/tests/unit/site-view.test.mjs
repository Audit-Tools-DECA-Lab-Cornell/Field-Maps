import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const { siteView, sortSites, thumbnailSites, zoneRows } = await load("features/sites/view.ts");
const { clock } = await load("lib/time.ts");

const ny = clock("America/New_York");

const fallCreek = {
	site_id: "1",
	code: "fall-creek",
	name: "Fall Creek test site",
	description: "  The playground.  ",
	created_at: "2026-10-01T12:00:00Z",
	observation_count: 8,
	package: {
		package_id: "p3",
		version: 3,
		form_version: "workspace-check-v1",
		archive_bytes: 13_500,
		archive_sha256: "x",
		prepared_at: "2026-10-07T18:05:00Z"
	},
	zones: [{ id: "A", label: "Zone A · Whole playground", west: 0, south: 0, east: 1, north: 1 }]
};
const empty = {
	site_id: "2",
	code: "empty-site",
	name: "Empty test site",
	description: null,
	created_at: "2026-10-01T12:00:00Z",
	observation_count: 0,
	package: null
};

test("a site with a package reads its version, date in the project's timezone, size and zones", () => {
	const view = siteView(fallCreek, ny);
	assert.equal(view.package.version, 3);
	assert.equal(view.package.prepared, "Oct 07, 2026 · 14:05");
	assert.equal(view.package.preparedDay, "Oct 07, 2026");
	assert.equal(view.package.sizeLabel, "13 KB");
	assert.equal(view.package.formVersion, "workspace-check-v1");
	assert.equal(view.zonesLabel, "1 zone");
	assert.equal(view.observationsLabel, "8 observations");
	assert.equal(view.description, "The playground.");
	assert.deepEqual(view.zones, [{ id: "A", label: "Zone A · Whole playground" }]);
});

test("a new site has no package, no zones yet and says so, with correct plurals", () => {
	const view = siteView(empty, ny);
	assert.equal(view.package, null);
	assert.equal(view.zonesLabel, "No zones yet");
	assert.equal(view.observationsLabel, "0 observations");
	assert.equal(view.description, null);
	assert.equal(siteView({ ...empty, observation_count: 1 }, ny).observationsLabel, "1 observation");
});

test("sites sort by name, and thumbnails go to the first six with a package", () => {
	const sorted = sortSites([siteView(fallCreek, ny), siteView(empty, ny)]);
	assert.deepEqual(
		sorted.map(site => site.code),
		["empty-site", "fall-creek"]
	);
	const many = Array.from({ length: 9 }, (_, index) => ({ code: `s${index}`, package: index === 1 ? null : {} }));
	assert.deepEqual(
		thumbnailSites(many).map(site => site.code),
		["s0", "s2", "s3", "s4", "s5", "s6"]
	);
});

test("zone rows count observations per zone, keep old zones and No zone, and list zones alone when counts failed", () => {
	const zones = [
		{ id: "A", label: "Zone A" },
		{ id: "B", label: "Zone B" }
	];
	const observation = zone => ({ observation_id: "x", zone });
	const rows = zoneRows(zones, [observation("A"), observation("A"), observation("old"), observation(null)]);
	assert.deepEqual(
		rows.map(row => [row.id, row.label, row.count, row.countLabel]),
		[
			["A", "Zone A", 2, "2 observations"],
			["B", "Zone B", 0, "0 observations"],
			["old", "old", 1, "1 observation"],
			[null, "No zone", 1, "1 observation"]
		]
	);
	assert.deepEqual(zoneRows(zones, null), [
		{ id: "A", label: "Zone A", count: null, countLabel: null },
		{ id: "B", label: "Zone B", count: null, countLabel: null }
	]);
});
