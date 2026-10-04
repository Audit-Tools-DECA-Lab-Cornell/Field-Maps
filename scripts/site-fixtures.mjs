#!/usr/bin/env node
// Writes the site fixtures in contracts/fixtures/sites: Riverside and the practice garden, drawn here in plan
// units, and Fall Creek, combined from the collector's QGIS output. Plain Node ESM, no dependencies.
//
//   node scripts/site-fixtures.mjs           write the three files
//   node scripts/site-fixtures.mjs --check   fail if a file differs from what this script writes
//
// Plan units run x east and y south from the frame's origin. They convert to WGS84 with the equirectangular
// approximation the web plan uses (web/src/lib/plan.ts): 111 320 m per degree, longitude scaled by the
// cosine of the origin's latitude, rounded to 7 decimals (about 1 cm).

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDir = join(repoRoot, "contracts", "fixtures", "sites");
const fallCreekDir = join(repoRoot, "mobile", "src", "maps", "sites", "fall-creek");
const check = process.argv.includes("--check");

const METRES_PER_DEGREE = 111_320;

function converter(frame) {
	const [originLng, originLat] = frame.origin;
	const cos = Math.cos((originLat * Math.PI) / 180);
	const round7 = value => Math.round(value * 1e7) / 1e7;
	return ([x, y]) => [
		round7(originLng + (x * frame.metresPerUnit) / (METRES_PER_DEGREE * cos)),
		round7(originLat - (y * frame.metresPerUnit) / METRES_PER_DEGREE)
	];
}

/** Twice the signed area with y down: positive runs clockwise on the plan, which is counterclockwise in WGS84. */
function clockwiseOnPlan(points) {
	let sum = 0;
	for (let i = 0; i < points.length; i++) {
		const [x1, y1] = points[i];
		const [x2, y2] = points[(i + 1) % points.length];
		sum += x1 * y2 - x2 * y1;
	}
	return sum > 0;
}

function polygon(toLngLat, points) {
	// RFC 7946 wants exterior rings counterclockwise; keep vertex order as drawn (the zone editor lists it).
	if (!clockwiseOnPlan(points)) throw new Error(`Draw rings clockwise on the plan: ${JSON.stringify(points)}`);
	const ring = points.map(toLngLat);
	return { type: "Polygon", coordinates: [[...ring, ring[0]]] };
}

const rect = (x, y, width, height) => [
	[x, y],
	[x + width, y],
	[x + width, y + height],
	[x, y + height]
];

/** A FeatureCollection from a site drawn in plan units. */
function drawnSite(spec) {
	const toLngLat = converter(spec.frame);
	const features = [];
	const add = (properties, geometry) => features.push({ type: "Feature", properties, geometry });
	const metres = units => Math.round(units * spec.frame.metresPerUnit * 10) / 10;

	add({ kind: "site", id: "site", name: spec.name }, polygon(toLngLat, spec.site));
	for (const surface of spec.surfaces) add({ kind: surface.kind, id: surface.id }, polygon(toLngLat, surface.points));
	for (const path of spec.paths) {
		add(
			{ kind: "path", id: path.id, width_m: path.widthM },
			{ type: "LineString", coordinates: path.points.map(toLngLat) }
		);
	}
	for (const structure of spec.structures ?? []) {
		add({ kind: "structure", id: structure.id, name: structure.name }, polygon(toLngLat, structure.points));
	}
	for (const item of spec.equipment ?? []) {
		add({ kind: "equipment", id: item.id, name: item.name }, polygon(toLngLat, item.points));
	}
	spec.trees.forEach(([x, y, radius], index) => {
		add(
			{ kind: "tree", id: `tree-${String(index + 1).padStart(2, "0")}`, radius_m: metres(radius) },
			{ type: "Point", coordinates: toLngLat([x, y]) }
		);
	});
	for (const zone of spec.zones) {
		add(
			{
				kind: "zone",
				id: zone.id,
				code: zone.code,
				name: zone.name,
				...(zone.label ? { label_point: toLngLat(zone.label) } : {})
			},
			polygon(toLngLat, zone.points)
		);
	}
	return { type: "FeatureCollection", $comment: spec.comment, name: spec.name, frame: spec.frame, features };
}

// ── Riverside ────────────────────────────────────────────────────────────────
// Traced from System 9, where one plan unit is 1.46 px of the 1050 px render, so the frame below is exactly
// the extent System 9 shows. North meadow's vertices are the ones Project 9 lists in its vertex table.
const riverside = drawnSite({
	name: "Riverside",
	comment:
		"Fixture: the fictional Riverside site as drawn in the Contour designs (System 9). Drawn in plan units by scripts/site-fixtures.mjs and converted to WGS84; see README.md.",
	frame: { origin: [-76.498, 42.444], metresPerUnit: 0.5, width: 720, height: 500 },
	site: [
		[48, 122],
		[129, 57],
		[579, 57],
		[664, 146],
		[664, 426],
		[320, 464],
		[48, 411]
	],
	surfaces: [
		{
			kind: "grass",
			id: "grass-1",
			points: [
				[70, 93],
				[618, 110],
				[608, 299],
				[577, 411],
				[123, 434],
				[89, 288]
			]
		},
		{
			kind: "mulch",
			id: "mulch-1",
			points: [
				[70, 295],
				[279, 290],
				[351, 396],
				[122, 425]
			]
		},
		{
			kind: "dirt",
			id: "dirt-1",
			points: [
				[403, 275],
				[601, 272],
				[575, 412],
				[427, 406]
			]
		}
	],
	// Three branches from one junction: north out through the boundary, south, south-west, and east.
	paths: [
		{
			id: "path-1",
			widthM: 6,
			points: [
				[136, 40],
				[227, 230],
				[251, 452]
			]
		},
		{
			id: "path-2",
			widthM: 6,
			points: [
				[227, 230],
				[47, 360]
			]
		},
		{
			id: "path-3",
			widthM: 6,
			points: [
				[227, 230],
				[420, 257],
				[648, 149]
			]
		}
	],
	structures: [{ id: "structure-1", name: "Shelter", points: rect(555, 92, 49, 70) }],
	equipment: [{ id: "equipment-1", name: "Play structure", points: rect(445, 304, 83, 34) }],
	// [x, y, crown radius], all in plan units.
	trees: [
		[95, 68, 14],
		[434, 58, 17],
		[144, 105, 14],
		[193, 142, 14],
		[143, 162, 15],
		[433, 114, 18],
		[482, 151, 18],
		[530, 188, 18],
		[191, 198, 15],
		[240, 235, 15],
		[530, 245, 19],
		[290, 272, 15],
		[240, 292, 16],
		[578, 282, 19],
		[288, 328, 16],
		[337, 366, 16],
		[627, 319, 19],
		[626, 375, 20],
		[386, 403, 16],
		[47, 413, 20],
		[95, 449, 20],
		[335, 423, 17],
		[385, 459, 17]
	],
	zones: [
		{
			id: "zone-a",
			code: "A",
			name: "North meadow",
			label: [319, 131],
			points: [
				[153, 90],
				[515, 96],
				[544, 208],
				[281, 220],
				[139, 180]
			]
		},
		{
			id: "zone-b",
			code: "B",
			name: "Woodland edge",
			label: [179, 351],
			points: [
				[87, 303],
				[255, 293],
				[335, 382],
				[127, 416]
			]
		},
		{
			id: "zone-c",
			code: "C",
			name: "Sand area",
			// Below the play structure, which the zone's own centre would put the pill on.
			label: [488, 366],
			points: [
				[416, 281],
				[588, 287],
				[564, 395],
				[430, 397]
			]
		}
	]
});

// ── Practice garden ──────────────────────────────────────────────────────────
// After the Project 6 thumbnail: two beds either side of a path, three trees and two practice zones.
const practiceGarden = drawnSite({
	name: "Practice garden",
	comment:
		"Fixture: a small training garden for practice sessions (Project 6). Training geometry, never counted toward coverage. Drawn in plan units by scripts/site-fixtures.mjs and converted to WGS84; see README.md.",
	frame: { origin: [-76.4872, 42.4466], metresPerUnit: 0.1, width: 720, height: 500 },
	site: rect(83, 69, 554, 365),
	surfaces: [
		{ kind: "grass", id: "grass-1", points: rect(120, 106, 212, 291) },
		{ kind: "dirt", id: "dirt-1", points: rect(397, 106, 203, 129) },
		{ kind: "mulch", id: "mulch-1", points: rect(397, 268, 203, 129) }
	],
	paths: [
		{
			id: "path-1",
			widthM: 2.2,
			points: [
				[367, 69],
				[367, 434]
			]
		}
	],
	equipment: [{ id: "equipment-1", name: "Balance beam", points: rect(457, 300, 88, 60) }],
	trees: [
		[152, 138, 25],
		[185, 286, 25],
		[272, 342, 25]
	],
	zones: [
		{ id: "zone-a", code: "A", name: "Lawn bed", points: rect(134, 120, 184, 258) },
		{ id: "zone-b", code: "B", name: "Sand bed", points: rect(415, 120, 171, 101) }
	]
});

// ── Fall Creek ───────────────────────────────────────────────────────────────
// The collector's files (generated by qgis/fall-creek) combined into one collection. Every coordinate is
// copied unchanged; equipment keeps its QGIS kind as source_kind, and site.json's other members ride along.
function fallCreek() {
	const read = name => JSON.parse(readFileSync(join(fallCreekDir, `${name}.json`), "utf8"));
	const site = read("site");
	const counts = {};
	const nextId = kind => `${kind}-${String((counts[kind] = (counts[kind] ?? 0) + 1)).padStart(2, "0")}`;
	const { west, south, east, north, zoom } = site.zone;
	return {
		type: "FeatureCollection",
		$comment:
			"Fixture: Fall Creek Elementary playground, combined by scripts/site-fixtures.mjs from mobile/src/maps/sites/fall-creek (QGIS drawings DECA_FALCR26001). Coordinates are unchanged; equipment keeps its QGIS kind as source_kind. Regenerate rather than edit; see README.md.",
		name: "Fall Creek",
		source: site.source,
		centre: site.centre,
		bounds: site.bounds,
		aerial: site.aerial,
		features: [
			...read("surfaces").features.map(feature => ({
				type: "Feature",
				properties: { kind: feature.properties.kind, id: nextId(feature.properties.kind) },
				geometry: feature.geometry
			})),
			...read("equipment").features.map(feature => ({
				type: "Feature",
				properties: { kind: "equipment", id: nextId("equipment"), source_kind: feature.properties.kind },
				geometry: feature.geometry
			})),
			...read("trees").features.map(feature => ({
				type: "Feature",
				properties: { kind: "tree", id: nextId("tree") },
				geometry: feature.geometry
			})),
			{
				type: "Feature",
				properties: { kind: "zone", id: "zone-a", code: "A", name: "Whole playground", zoom },
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[west, south],
							[east, south],
							[east, north],
							[west, north],
							[west, south]
						]
					]
				}
			}
		]
	};
}

/** Two-space JSON like the other contracts, with each position on one line. */
function format(value) {
	return `${JSON.stringify(value, null, 2).replace(/\[\s+(-?[\d.e-]+),\s+(-?[\d.e-]+)\s+\]/g, "[$1, $2]")}\n`;
}

const outputs = {
	"riverside.json": riverside,
	"practice-garden.json": practiceGarden,
	"fall-creek.json": fallCreek()
};

let drifted = false;
for (const [file, collection] of Object.entries(outputs)) {
	const path = join(outputDir, file);
	const text = format(collection);
	if (check) {
		let current = "";
		try {
			current = readFileSync(path, "utf8");
		} catch {
			// A missing file counts as drift.
		}
		if (current !== text) {
			console.error(`${file} differs from scripts/site-fixtures.mjs. Run: node scripts/site-fixtures.mjs`);
			drifted = true;
		}
	} else {
		writeFileSync(path, text);
		console.log(`Wrote contracts/fixtures/sites/${file} (${collection.features.length} features)`);
	}
}
if (drifted) process.exit(1);
