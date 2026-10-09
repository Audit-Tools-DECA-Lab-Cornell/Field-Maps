import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { strToU8, zipSync } from "fflate";

import { load } from "./support.mjs";

const { layersPlan, PackageArchiveError, packagePlan, packageSiteCollection, readPackageArchive, zonesFromLayer } =
	await load("lib/sites/archive.ts");

const root = new URL("../../../", import.meta.url);
const readJson = path => JSON.parse(readFileSync(new URL(path, root), "utf8"));

/** Fall Creek's layers exactly as `scripts/bootstrap-study.mjs` sends them for the real study. */
function fallCreekLayers() {
	const outline = readJson("qgis/fall-creek/upload-sample/ground.geojson");
	const surfaces = readJson("mobile/src/maps/sites/fall-creek/surfaces.json");
	const equipment = readJson("mobile/src/maps/sites/fall-creek/equipment.json");
	return {
		ground: {
			type: "FeatureCollection",
			features: [
				...outline.features,
				...surfaces.features,
				...equipment.features.map(feature => ({
					...feature,
					properties: { ...feature.properties, kind: "equipment", type: feature.properties.kind }
				}))
			]
		},
		trees: readJson("mobile/src/maps/sites/fall-creek/trees.json"),
		zones: readJson("qgis/fall-creek/upload-sample/zones.geojson")
	};
}

function positions(geometry) {
	const walk = value => (typeof value[0] === "number" ? [value] : value.flatMap(walk));
	return walk(geometry.coordinates);
}

function bounds(features) {
	const all = features.flatMap(feature => positions(feature.geometry));
	return {
		west: Math.min(...all.map(([x]) => x)),
		south: Math.min(...all.map(([, y]) => y)),
		east: Math.max(...all.map(([x]) => x)),
		north: Math.max(...all.map(([, y]) => y))
	};
}

/** The manifest `backend/src/fieldmaps_api/domain/packages.py` writes: zones from `id` and `label`. */
function manifestFor(siteCode, layers) {
	const extent = bounds(Object.values(layers).flatMap(layer => layer.features));
	return {
		format: 1,
		site_code: siteCode,
		form_version: "behaviour-mapping-v1",
		extent,
		centre: [(extent.west + extent.east) / 2, (extent.south + extent.north) / 2],
		zones: layers.zones.features.map(feature => ({
			id: feature.properties.id,
			label: feature.properties.label ?? feature.properties.id,
			...bounds([feature])
		})),
		layers: Object.entries(layers).map(([name, layer]) => ({
			name,
			features: layer.features.length,
			sha256: "0".repeat(64)
		})),
		source_project: null
	};
}

/** A zip laid out as `_build_archive` lays it out. */
function archive(manifest, layers) {
	const files = { "manifest.json": strToU8(JSON.stringify(manifest, null, 2)) };
	for (const name of ["ground", "paths", "trees", "zones"])
		if (layers[name]) files[`layers/${name}.json`] = strToU8(JSON.stringify(layers[name]));
	return zipSync(files);
}

test("reads Fall Creek's real package: ground kinds, equipment types, tree crowns and Zone A", () => {
	const layers = fallCreekLayers();
	const manifest = manifestFor("fall-creek", layers);
	const read = readPackageArchive(archive(manifest, layers));
	assert.equal(read.manifest.site_code, "fall-creek");
	assert.equal(read.layers.ground.features.length, layers.ground.features.length);
	assert.equal(read.layers.paths, undefined);

	const collection = packageSiteCollection("Fall Creek", read.manifest, read.layers);
	const kinds = {};
	for (const feature of collection.features)
		kinds[feature.properties.kind] = (kinds[feature.properties.kind] ?? 0) + 1;
	assert.deepEqual(kinds, {
		site: 1,
		dirt: 1,
		path: 2,
		blacktop: 1,
		mulch: 1,
		grass: 2,
		equipment: 21,
		tree: 12,
		zone: 1
	});

	const swings = collection.features.find(feature => feature.properties.source_kind === "swings");
	assert.equal(swings.properties.kind, "equipment");
	assert.ok(collection.features.every(feature => feature.properties.id));

	const plan = packagePlan("Fall Creek", archive(manifest, layers));
	assert.equal(plan.name, "Fall Creek");
	assert.deepEqual(
		plan.zones.map(zone => [zone.id, zone.code, zone.name]),
		[["A", "A", "Zone A · Whole playground"]]
	);
	assert.equal(plan.features.filter(shape => shape.kind === "tree" && shape.type === "polygon").length, 12);
	assert.equal(plan.features.length, 1 + 7 + 21 + 12);
});

test("a MultiPolygon zone draws every part under its zone id; unknown ground kinds draw as grass", () => {
	const square = (x, y) => [
		[
			[x, y],
			[x + 0.0002, y],
			[x + 0.0002, y + 0.0002],
			[x, y + 0.0002],
			[x, y]
		]
	];
	const layers = {
		ground: {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: { kind: "Sandpit", name: "Sand" },
					geometry: { type: "Polygon", coordinates: square(-76.5, 42.45) }
				},
				{
					type: "Feature",
					properties: { kind: "mulch" },
					geometry: { type: "MultiPolygon", coordinates: [square(-76.4996, 42.45), square(-76.4993, 42.45)] }
				}
			]
		},
		paths: {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: { width_m: 1.5 },
					geometry: {
						type: "LineString",
						coordinates: [
							[-76.5, 42.4505],
							[-76.499, 42.4505]
						]
					}
				}
			]
		},
		trees: {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: { radius_m: 4 },
					geometry: { type: "Point", coordinates: [-76.4995, 42.4504] }
				}
			]
		},
		zones: {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: { id: "N", label: "North beds" },
					geometry: {
						type: "MultiPolygon",
						// The second part is an unclosed triangle; it is closed, not dropped.
						coordinates: [
							square(-76.5, 42.4506),
							[
								[
									[-76.499, 42.4506],
									[-76.4988, 42.4506],
									[-76.4989, 42.4508]
								]
							]
						]
					}
				},
				{
					type: "Feature",
					properties: { id: "S" },
					geometry: { type: "Polygon", coordinates: square(-76.5, 42.4502) }
				}
			]
		}
	};
	const manifest = manifestFor("garden", layers);
	const plan = packagePlan("Garden", archive(manifest, layers));
	assert.deepEqual(
		plan.zones.map(zone => [zone.id, zone.code, zone.name]),
		[
			["N", "N", "North beds"],
			["N~2", "N", "North beds"],
			["S", "S", "S"]
		]
	);
	const collection = packageSiteCollection("Garden", manifest, readPackageArchive(archive(manifest, layers)).layers);
	const sand = collection.features.find(feature => feature.properties.name === "Sand");
	assert.deepEqual([sand.properties.kind, sand.properties.source_kind], ["grass", "Sandpit"]);
	assert.deepEqual(
		collection.features
			.filter(feature => feature.properties.kind === "mulch")
			.map(feature => feature.properties.id),
		["ground-2", "ground-2-2"]
	);
	const path = plan.features.find(shape => shape.type === "line");
	assert.ok(path.width > 0);
	assert.equal(plan.features.filter(shape => shape.type === "circle").length, 1);
});

test("a manifest zone without its feature draws its box", () => {
	const layers = fallCreekLayers();
	const manifest = manifestFor("fall-creek", layers);
	const withoutZone = { ...layers, zones: { type: "FeatureCollection", features: [] } };
	const plan = packagePlan("Fall Creek", archive(manifest, withoutZone));
	assert.equal(plan.zones.length, 1);
	assert.equal(plan.zones[0].points.length, 4);
});

test("unreadable archives say why", () => {
	assert.throws(() => readPackageArchive(new Uint8Array([1, 2, 3])), PackageArchiveError);
	const layers = fallCreekLayers();
	assert.throws(
		() => readPackageArchive(zipSync({ "layers/ground.json": strToU8(JSON.stringify(layers.ground)) })),
		/no readable manifest/
	);
	assert.throws(
		() => readPackageArchive(zipSync({ "manifest.json": strToU8(JSON.stringify(manifestFor("x", layers))) })),
		/missing its ground or zones layer/
	);
	assert.throws(() => readPackageArchive(zipSync({ "manifest.json": strToU8("{") })), /could not be read/);
});

test("chosen layers draw the plan a package would, before anything is sent", () => {
	const layers = fallCreekLayers();
	const zones = zonesFromLayer(layers.zones);
	assert.deepEqual(zones, manifestFor("fall-creek", layers).zones);
	const preview = layersPlan("Fall Creek", layers);
	const prepared = packagePlan("Fall Creek", archive(manifestFor("fall-creek", layers), layers));
	assert.deepEqual(preview.zones, prepared.zones);
	assert.equal(preview.features.length, prepared.features.length);
	assert.equal(layersPlan("Nothing yet", {}), null);
	const unnamed = {
		type: "FeatureCollection",
		features: [{ ...layers.zones.features[0], properties: { label: "No id" } }]
	};
	assert.deepEqual(zonesFromLayer(unnamed), []);
	assert.equal(layersPlan("Ground only", { ground: layers.ground }).zones.length, 0);
});
