import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const { blockedToExplain, currentPackage, firstBlockedDetail, historyRows } =
	await load("features/packages/history.ts");
const { readManifest } = await load("features/packages/manifest.ts");
const { chooseFormVersion, isInventoryDefinition, publishedVersions } = await load("features/packages/forms.ts");
const { clock } = await load("lib/time.ts");

const ny = clock("America/New_York");
const summary = (version, state, extra = {}) => ({
	package_id: `p${version}`,
	site_code: "fall-creek",
	form_version: "workspace-check-v1",
	version,
	state,
	archive_bytes: 13_500,
	archive_sha256: "x",
	prepared_at: `2026-10-0${version}T18:05:00Z`,
	...extra
});

test("the newest ready package is current; older ready ones are archived; blocked ones fail", () => {
	const rows = historyRows([summary(1, "ready"), summary(3, "blocked"), summary(2, "ready")], ny, {
		p3: "Fall Creek declares a CRS that is not WGS 84."
	});
	assert.deepEqual(
		rows.map(row => [row.version, row.state]),
		[
			[3, "blocked"],
			[2, "current"],
			[1, "archived"]
		]
	);
	assert.equal(rows[0].blockedDetail, "Fall Creek declares a CRS that is not WGS 84.");
	assert.equal(rows[1].blockedDetail, null);
	assert.equal(rows[1].prepared, "Oct 02, 2026 · 14:05");
	assert.equal(rows[1].sizeLabel, "13 KB");
});

test("a site whose packages are all blocked has no current package", () => {
	assert.equal(currentPackage([summary(1, "blocked")]), null);
	assert.equal(historyRows([summary(1, "blocked")], ny)[0].state, "blocked");
	assert.equal(historyRows([summary(1, "blocked")], ny)[0].blockedDetail, null);
	assert.deepEqual(historyRows([], ny), []);
});

test("the reason a package was blocked is the first check that blocked it", () => {
	const checks = [
		{ step: "source-project", state: "skipped", detail: "No QGIS project was supplied." },
		{ step: "coordinate-reference", state: "blocked", detail: "Re-export with CRS EPSG:4326." },
		{ step: "imagery-licence", state: "blocked", detail: "Tiles are fetched on demand." }
	];
	assert.equal(firstBlockedDetail(checks), "Re-export with CRS EPSG:4326.");
	assert.equal(firstBlockedDetail([{ step: "archive", state: "passed", detail: "ok" }]), null);
});

test("only the newest blocked packages are read for their reasons", () => {
	const blocked = Array.from({ length: 10 }, (_, index) => summary(index + 1, "blocked"));
	const ids = blockedToExplain([...blocked, summary(11, "ready")], 3);
	assert.deepEqual(ids, ["p10", "p9", "p8"]);
});

test("a manifest is read leniently", () => {
	const manifest = readManifest({
		format: 1,
		form_version: "workspace-check-v1",
		zones: [{ id: "A", label: "Zone A · Whole playground", west: 0 }, { label: "no id" }],
		layers: [{ name: "ground", features: 1, sha256: "x" }, { name: "trees", features: 12 }, { name: "broken" }],
		source_project: {
			file_name: "playground.qgz",
			title: "Playground",
			crs: "EPSG:3857",
			vector_layers: ["ground", "zones"],
			raster_layers: [{ layer_name: "ortho" }]
		}
	});
	assert.deepEqual(manifest.zones, [{ id: "A", label: "Zone A · Whole playground" }]);
	assert.deepEqual(manifest.layers, [
		{ name: "ground", features: 1 },
		{ name: "trees", features: 12 }
	]);
	assert.deepEqual(manifest.project, {
		fileName: "playground.qgz",
		title: "Playground",
		crs: "EPSG:3857",
		vectorLayers: 2,
		rasterLayers: 1
	});
	assert.equal(readManifest(null), null);
	assert.deepEqual(readManifest({ source_project: null }).project, null);
});

const form = (code, name, versions) => ({
	form_id: code,
	code,
	name,
	versions: versions.map(([version, state, published]) => ({
		version_id: `${code}-${version}`,
		code: `${code}-v${version}`,
		version,
		state,
		title: name,
		question_count: 1,
		published_at: published ?? null
	}))
});

test("only published versions are offered, most recently published first", () => {
	const forms = [
		form("behaviour", "Behaviour mapping", [
			[1, "retired", "2026-09-01T00:00:00Z"],
			[2, "published", "2026-09-20T00:00:00Z"],
			[3, "draft"]
		]),
		form("inventory", "Zone inventory", [[1, "published", "2026-10-01T00:00:00Z"]])
	];
	assert.deepEqual(
		publishedVersions(forms).map(version => version.code),
		["inventory-v1", "behaviour-v2"]
	);
	assert.deepEqual(publishedVersions([form("x", "X", [[1, "draft"]])]), []);
});

test("the upload starts on the current package's form while it is still published", () => {
	const published = publishedVersions([
		form("behaviour", "Behaviour", [[2, "published", "2026-09-20T00:00:00Z"]]),
		form("inventory", "Inventory", [[1, "published", "2026-10-01T00:00:00Z"]])
	]);
	assert.equal(chooseFormVersion(published, "behaviour-v2"), "behaviour-v2");
	// Retired or unknown: the newest published form that is not an inventory form.
	assert.equal(chooseFormVersion(published, "behaviour-v1", new Set(["inventory-v1"])), "behaviour-v2");
	assert.equal(chooseFormVersion(published, null, new Set(["inventory-v1"])), "behaviour-v2");
	// Only inventory forms are published: still offer one rather than none.
	assert.equal(chooseFormVersion(published.slice(0, 1), null, new Set(["inventory-v1"])), "inventory-v1");
	assert.equal(chooseFormVersion([], null), null);
});

test("an inventory form asks about the zone and nothing about a play event", () => {
	const question = (id, act) => ({ id, code: id, label: id, act, kind: "text" });
	assert.equal(isInventoryDefinition({ questions: [question("a", "Climate"), question("b", "Record")] }), true);
	assert.equal(isInventoryDefinition({ questions: [question("a", "Play"), question("b", "Record")] }), false);
	assert.equal(isInventoryDefinition({ questions: [question("a", "Climate"), question("b", "Play")] }), false);
	assert.equal(isInventoryDefinition({ questions: [question("a", "Record")] }), false);
});
