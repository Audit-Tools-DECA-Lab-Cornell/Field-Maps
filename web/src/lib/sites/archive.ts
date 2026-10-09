import { strFromU8, unzipSync } from "fflate";
import { z } from "zod";

import { parseSite, type ProjectedSite, projectSite, type SiteCollection, type SiteFeature } from "../plan";

/**
 * Reading a map package the API prepared, the way the collector reads it
 * (`mobile/src/packages/hosted/archive.ts` and `build.ts`): a zip holding `manifest.json` and
 * `layers/{ground,paths,trees,zones}.json` (`_build_archive` in
 * `backend/src/fieldmaps_api/domain/packages.py`), turned into the site collection `lib/plan.ts` draws.
 *
 * - Ground: polygons, drawn by `properties.kind` when the plan knows it (site, a surface, equipment,
 *   structure, tree) and as grass otherwise. The original kind is kept as `source_kind`, as is an
 *   equipment drawing's own `type` ("swings").
 * - Paths: lines, or areas when the layer draws paths as polygons. Trees: points become crowns (circles),
 *   polygons stay polygons.
 * - Zones: one per manifest zone, in manifest order. Its id is the feature's `properties.id` (what an
 *   observation records) and its name is the manifest label. A MultiPolygon zone draws every part: the
 *   first under the zone id, the rest as `<id>~2`, `<id>~3`, all with `code` set to the zone id. A zone
 *   whose feature is missing draws its manifest box.
 * - Every MultiPolygon is split into its parts. Other features get the id `<layer>-<n>` (`-<part>` for
 *   later parts).
 */

export class PackageArchiveError extends Error {
	readonly name = "PackageArchiveError";
}

const finite = z.number().finite();

const manifestZoneSchema = z.object({
	id: z.string().min(1),
	label: z.string().min(1),
	west: finite,
	south: finite,
	east: finite,
	north: finite
});

const manifestSchema = z.object({
	format: z.number().int().min(1),
	site_code: z.string().min(1),
	form_version: z.string().min(1),
	extent: z.object({ west: finite, south: finite, east: finite, north: finite }),
	centre: z.tuple([finite, finite]),
	zones: z.array(manifestZoneSchema).min(1)
});

const featureCollectionSchema = z.object({
	type: z.literal("FeatureCollection"),
	features: z.array(
		z.object({
			type: z.literal("Feature"),
			geometry: z.object({ type: z.string().min(1), coordinates: z.unknown() }).nullable(),
			properties: z.record(z.string(), z.unknown()).nullish()
		})
	)
});

const layersSchema = z.object({
	ground: featureCollectionSchema,
	zones: featureCollectionSchema,
	paths: featureCollectionSchema.optional(),
	trees: featureCollectionSchema.optional()
});

export type PackageManifest = z.infer<typeof manifestSchema>;
export type ManifestZone = z.infer<typeof manifestZoneSchema>;
export type LayerData = z.infer<typeof featureCollectionSchema>;
export type PackageLayers = z.infer<typeof layersSchema>;

const LAYER_NAMES = ["ground", "paths", "trees", "zones"] as const;

function json(entries: Record<string, Uint8Array>, name: string): unknown {
	const entry = entries[name];
	if (!entry) return undefined;
	try {
		return JSON.parse(strFromU8(entry));
	} catch {
		throw new PackageArchiveError(`${name} in the map package could not be read.`);
	}
}

/** The manifest and layers of a package archive. Throws `PackageArchiveError` with a plain reason. */
export function readPackageArchive(bytes: Uint8Array): { manifest: PackageManifest; layers: PackageLayers } {
	let entries: Record<string, Uint8Array>;
	try {
		entries = unzipSync(bytes);
	} catch {
		throw new PackageArchiveError("The map package is not a readable archive.");
	}
	const manifest = manifestSchema.safeParse(json(entries, "manifest.json"));
	if (!manifest.success) throw new PackageArchiveError("The map package has no readable manifest.");
	const layers = layersSchema.safeParse(
		Object.fromEntries(
			LAYER_NAMES.flatMap(name => {
				const value = json(entries, `layers/${name}.json`);
				return value === undefined ? [] : [[name, value]];
			})
		)
	);
	if (!layers.success) throw new PackageArchiveError("The map package is missing its ground or zones layer.");
	return { manifest: manifest.data, layers: layers.data };
}

/* ── Geometry ─────────────────────────────────────────────────────────────── */

type Position = [number, number];
type Ring = Position[];
type Polygon = Ring[];

function position(value: unknown): Position | null {
	if (!Array.isArray(value) || value.length < 2) return null;
	const [x, y] = value;
	return typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null;
}

/** A closed ring of at least four positions (a triangle and its closing point), or null. */
function ring(value: unknown): Ring | null {
	if (!Array.isArray(value)) return null;
	const points = value.map(position).filter((point): point is Position => point !== null);
	if (points.length < 3) return null;
	const [first] = points;
	const last = points[points.length - 1]!;
	const closed = first![0] === last[0] && first![1] === last[1] ? points : [...points, first!];
	return closed.length >= 4 ? closed : null;
}

/** One polygon: its outer ring, then the holes that are rings. Null without an outer ring. */
function polygon(value: unknown): Polygon | null {
	if (!Array.isArray(value)) return null;
	const [outer, ...holes] = value;
	const shell = ring(outer);
	if (!shell) return null;
	return [shell, ...holes.map(ring).filter((hole): hole is Ring => hole !== null)];
}

/** A layer as a package or a QGIS export holds it: features with a geometry and properties. */
export type LayerInput = {
	readonly features: readonly {
		readonly geometry: { readonly type: string; readonly coordinates?: unknown } | null;
		readonly properties?: Readonly<Record<string, unknown>> | null;
	}[];
};

type Geometry = LayerInput["features"][number]["geometry"];

/** A geometry's polygons: a Polygon's own, or each part of a MultiPolygon. */
function polygonParts(geometry: Geometry): Polygon[] {
	if (!geometry) return [];
	if (geometry.type === "Polygon") {
		const found = polygon(geometry.coordinates);
		return found ? [found] : [];
	}
	if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates))
		return geometry.coordinates.map(polygon).filter((part): part is Polygon => part !== null);
	return [];
}

function lineParts(geometry: Geometry): Position[][] {
	if (!geometry) return [];
	const line = (value: unknown) =>
		Array.isArray(value) ? value.map(position).filter((point): point is Position => point !== null) : [];
	const lines =
		geometry.type === "LineString"
			? [line(geometry.coordinates)]
			: geometry.type === "MultiLineString" && Array.isArray(geometry.coordinates)
				? geometry.coordinates.map(line)
				: [];
	return lines.filter(points => points.length >= 2);
}

function pointParts(geometry: Geometry): Position[] {
	if (!geometry) return [];
	if (geometry.type === "Point") {
		const point = position(geometry.coordinates);
		return point ? [point] : [];
	}
	if (geometry.type === "MultiPoint" && Array.isArray(geometry.coordinates))
		return geometry.coordinates.map(position).filter((point): point is Position => point !== null);
	return [];
}

/* ── The site collection ──────────────────────────────────────────────────── */

type Kind = SiteFeature["properties"]["kind"];

/** The kinds a ground feature may be drawn as. */
const GROUND_KINDS = new Set<Kind>([
	"site",
	"grass",
	"mulch",
	"dirt",
	"blacktop",
	"path",
	"structure",
	"equipment",
	"tree"
]);

const positiveNumber = (value: unknown): number | undefined =>
	typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
const nonEmpty = (value: unknown): string | undefined =>
	typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;

function groundKind(properties: Readonly<Record<string, unknown>>): { kind: Kind; sourceKind?: string } {
	const original = nonEmpty(properties.kind);
	const lower = original?.toLowerCase() as Kind | undefined;
	if (lower && GROUND_KINDS.has(lower)) {
		const own =
			nonEmpty(properties.source_kind) ??
			(lower === "equipment" || lower === "structure" ? nonEmpty(properties.type) : undefined);
		return own ? { kind: lower, sourceKind: own } : { kind: lower };
	}
	return original ? { kind: "grass", sourceKind: original } : { kind: "grass" };
}

function partId(base: string, part: number): string {
	return part === 0 ? base : `${base}-${part + 1}`;
}

function polygonFeature(properties: SiteFeature["properties"], coordinates: Polygon): SiteFeature {
	return { type: "Feature", properties, geometry: { type: "Polygon", coordinates } };
}

function box(zone: ZoneBox): Polygon {
	return [
		[
			[zone.west, zone.south],
			[zone.east, zone.south],
			[zone.east, zone.north],
			[zone.west, zone.north],
			[zone.west, zone.south]
		]
	];
}

/** A zone's id, label and box, as a manifest lists it. */
type ZoneBox = Pick<ManifestZone, "id" | "label" | "west" | "south" | "east" | "north">;

/** The layers a collection is drawn from; any may be missing while a manager is still choosing files. */
export type CollectionLayers = {
	readonly ground?: LayerInput;
	readonly paths?: LayerInput;
	readonly trees?: LayerInput;
	readonly zones?: LayerInput;
};

function collection(zones: readonly ZoneBox[], layers: CollectionLayers): SiteFeature[] {
	const features: SiteFeature[] = [];

	layers.ground?.features.forEach((feature, index) => {
		const properties = feature.properties ?? {};
		const { kind, sourceKind } = groundKind(properties);
		const label = nonEmpty(properties.name);
		polygonParts(feature.geometry).forEach((part, n) =>
			features.push(
				polygonFeature(
					{
						kind,
						id: partId(`ground-${index + 1}`, n),
						...(label ? { name: label } : {}),
						...(sourceKind ? { source_kind: sourceKind } : {})
					},
					part
				)
			)
		);
	});

	layers.paths?.features.forEach((feature, index) => {
		const properties = feature.properties ?? {};
		const width = positiveNumber(properties.width_m);
		lineParts(feature.geometry).forEach((points, n) =>
			features.push({
				type: "Feature",
				properties: { kind: "path", id: partId(`paths-${index + 1}`, n), ...(width ? { width_m: width } : {}) },
				geometry: { type: "LineString", coordinates: points }
			})
		);
		polygonParts(feature.geometry).forEach((part, n) =>
			features.push(polygonFeature({ kind: "path", id: partId(`paths-${index + 1}`, n) }, part))
		);
	});

	layers.trees?.features.forEach((feature, index) => {
		const properties = feature.properties ?? {};
		const radius = positiveNumber(properties.radius_m);
		pointParts(feature.geometry).forEach((point, n) =>
			features.push({
				type: "Feature",
				properties: {
					kind: "tree",
					id: partId(`trees-${index + 1}`, n),
					...(radius ? { radius_m: radius } : {})
				},
				geometry: { type: "Point", coordinates: point }
			})
		);
		polygonParts(feature.geometry).forEach((part, n) =>
			features.push(polygonFeature({ kind: "tree", id: partId(`trees-${index + 1}`, n) }, part))
		);
	});

	for (const zone of zones) {
		const feature = layers.zones?.features.find(entry => nonEmpty(entry.properties?.id) === zone.id);
		const parts = feature ? polygonParts(feature.geometry) : [];
		(parts.length > 0 ? parts : [box(zone)]).forEach((part, n) =>
			features.push(
				polygonFeature(
					{ kind: "zone", id: n === 0 ? zone.id : `${zone.id}~${n + 1}`, code: zone.id, name: zone.label },
					part
				)
			)
		);
	}

	return features;
}

/**
 * The collection `parseSite` and `projectSite` accept, from a package's manifest and layers. Ground first,
 * then paths, trees and zones, the order the plan draws them in.
 */
export function packageSiteCollection(name: string, manifest: PackageManifest, layers: PackageLayers): SiteCollection {
	return parseSite({ type: "FeatureCollection", name, features: collection(manifest.zones, layers) });
}

/** A package archive straight to its projected plan. Throws `PackageArchiveError` when it cannot be read. */
export function packagePlan(name: string, bytes: Uint8Array): ProjectedSite {
	const { manifest, layers } = readPackageArchive(bytes);
	return projectSite(packageSiteCollection(name, manifest, layers));
}

/**
 * The zones a package prepared from these layers would list, as the API derives them
 * (`_derive_zones`): each zone feature's trimmed `id`, its `label` (else the id) and its box. Features
 * without an id are left out; the API refuses a package with one, so the upload check flags it.
 */
export function zonesFromLayer(zones: LayerInput | undefined): ManifestZone[] {
	return (zones?.features ?? []).flatMap(feature => {
		const id = nonEmpty(feature.properties?.id);
		const points = polygonParts(feature.geometry).flatMap(part => part.flat());
		if (!id || points.length === 0) return [];
		return [
			{
				id,
				label: nonEmpty(feature.properties?.label) ?? id,
				west: Math.min(...points.map(([x]) => x)),
				south: Math.min(...points.map(([, y]) => y)),
				east: Math.max(...points.map(([x]) => x)),
				north: Math.max(...points.map(([, y]) => y))
			}
		];
	});
}

/**
 * The plan a package prepared from these layers would draw, before anything is sent: the upload step's
 * preview. Null when there is nothing to draw yet.
 */
export function layersPlan(name: string, layers: CollectionLayers): ProjectedSite | null {
	const features = collection(zonesFromLayer(layers.zones), layers);
	if (features.length === 0) return null;
	return projectSite(parseSite({ type: "FeatureCollection", name, features }));
}
