import assert from "node:assert/strict";
import test from "node:test";
import { load } from "./support.mjs";

const { importedFiles, normalizeImportedLayer } = await load("features/packages/project-import.ts");
const collection = {
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			properties: {},
			geometry: {
				type: "Polygon",
				coordinates: [
					[
						[0, 0],
						[1, 0],
						[1, 1],
						[0, 0]
					]
				]
			}
		}
	]
};

test("an explicit GeoJSON export overrides the matching converted project layer", () => {
	const override = new File([JSON.stringify(collection)], "ground.geojson");
	const result = importedFiles(
		{
			layers: [
				{ name: "ground", collection },
				{ name: "zones", collection }
			]
		},
		[override]
	);
	assert.equal(result[0], override);
	assert.deepEqual(
		result.map(file => file.name),
		["ground.geojson", "zones.geojson"]
	);
});

test("a single imported ground polygon is marked as the site boundary without changing its shape", () => {
	const result = normalizeImportedLayer("ground", collection);
	assert.equal(result.features[0].properties.kind, "site");
	assert.deepEqual(result.features[0].geometry, collection.features[0].geometry);
});

test("multiple ground polygons do not get an invented boundary", () => {
	const input = { ...collection, features: [...collection.features, ...collection.features] };
	assert.deepEqual(normalizeImportedLayer("ground", input), input);
});
