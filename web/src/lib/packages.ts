import type { FeatureCollection, Geometry } from "@/types/geojson";

/**
 * Assembling what the API's package endpoint takes, out of the files QGIS writes.
 *
 * The layers are GeoJSON, so they travel as JSON rather than as multipart: the whole submission
 * is one document, which is also what makes it reviewable before it is sent. The project file is
 * the one binary, base64 encoded — it is read for provenance and for the imagery-licence check,
 * neither of which a GeoJSON export can answer.
 *
 * This file also carries the client-side half of preparing a package: matching a dropped file to
 * a slot by name, reading its geometry well enough to preview and pre-flight-check it, and the
 * project id and token stopgaps WEB-01 needs before WEB-08 takes the project and site from the
 * route. None of this replaces the server's own checks — it exists so a manager sees a problem
 * before the upload, not instead of after it.
 */

export const LAYER_NAMES = ["ground", "paths", "trees", "zones"] as const;
export type LayerName = (typeof LAYER_NAMES)[number];

export const REQUIRED_LAYERS: readonly LayerName[] = ["ground", "zones"];

/** Display and slot-table order — required layers first, in the order a manager checks them. */
export const SLOT_ORDER: readonly LayerName[] = ["ground", "zones", "paths", "trees"];

export const SLOT_LABELS: Record<LayerName | "project", string> = {
	ground: "Ground",
	zones: "Zones",
	paths: "Paths",
	trees: "Trees",
	project: "QGIS project"
};

/** The geometry a slot's layer is expected to hold, so a mismatch can be shown before upload. */
export const EXPECTED_GEOMETRY: Record<LayerName, Geometry["type"]> = {
	ground: "Polygon",
	zones: "Polygon",
	paths: "LineString",
	trees: "Point"
};

export interface PackageSubmission {
	readonly site_code: string;
	readonly form_version: string;
	readonly layers: Partial<Record<LayerName, FeatureCollection>>;
	readonly project_file?: { readonly file_name: string; readonly content: string };
}

export interface PreparationCheck {
	readonly step: "source-project" | "layer-sources" | "coordinate-reference" | "imagery-licence" | "archive";
	readonly state: "passed" | "warning" | "blocked" | "skipped";
	readonly detail: string;
}

export interface PackageDetail {
	readonly package_id: string;
	readonly site_code: string;
	readonly form_version: string;
	readonly version: number;
	readonly state: "ready" | "blocked";
	readonly archive_bytes: number;
	readonly archive_sha256: string;
	readonly prepared_at: string;
	readonly checks: readonly PreparationCheck[];
}

export class LayerReadError extends Error {}

/** Where a dropped or browsed file ends up: one of the four layer slots, the project file, or unplaced. */
export type SlotTarget = LayerName | "project";

export type LayerSlotState =
	| { readonly kind: "empty" }
	| { readonly kind: "reading"; readonly file: File }
	| { readonly kind: "error"; readonly file: File; readonly message: string }
	| {
			readonly kind: "ready";
			readonly file: File;
			readonly collection: FeatureCollection;
			readonly analysis: LayerAnalysis;
	  };

export type ProjectSlotState = { readonly kind: "empty" } | { readonly kind: "ready"; readonly file: File };

/** A dropped file the name didn't confidently match, waiting on a manager to pick its slot. */
export interface UnassignedFile {
	readonly id: string;
	readonly file: File;
	/** The slot its name suggested, if any — offered as the default in the picker, not applied silently. */
	readonly guess: SlotTarget | null;
}

/**
 * Guess a file's slot from its name alone: case-insensitive, and "zone"/"path"/"tree" match their
 * plurals for free since the singular is a substring of it. A `.qgz`/`.qgs` is always the project
 * file — QGIS doesn't name those after a layer.
 */
export function matchSlot(filename: string): SlotTarget | null {
	const lower = filename.toLowerCase();
	if (lower.endsWith(".qgz") || lower.endsWith(".qgs")) return "project";
	if (lower.includes("ground")) return "ground";
	if (lower.includes("zone")) return "zones";
	if (lower.includes("path")) return "paths";
	if (lower.includes("tree")) return "trees";
	return null;
}

/** A layer's shape, read once after parsing: how many features, what geometry, and where on earth. */
export interface LayerAnalysis {
	readonly featureCount: number;
	readonly geometryTypes: readonly Geometry["type"][];
	readonly bbox: BBox | null;
}

/** `[west, south, east, north]`, in whatever units the layer's coordinates happen to be in. */
export type BBox = readonly [number, number, number, number];

function positionsOf(geometry: Geometry): readonly number[][] {
	switch (geometry.type) {
		case "Point":
			return [geometry.coordinates];
		case "LineString":
			return geometry.coordinates;
		case "Polygon":
			return geometry.coordinates.flat();
	}
}

function bboxOfPositions(positions: readonly number[][]): BBox | null {
	let west = Infinity;
	let south = Infinity;
	let east = -Infinity;
	let north = -Infinity;
	for (const position of positions) {
		const lng = position[0];
		const lat = position[1];
		if (lng === undefined || lat === undefined) continue;
		if (lng < west) west = lng;
		if (lng > east) east = lng;
		if (lat < south) south = lat;
		if (lat > north) north = lat;
	}
	return west === Infinity ? null : [west, south, east, north];
}

export function unionBbox(a: BBox, b: BBox): BBox {
	return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
}

/** Does `inner` fall entirely inside `outer`? Used for "zones lie inside ground's extent". */
export function bboxContains(outer: BBox, inner: BBox): boolean {
	return inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3];
}

/** `true` once a coordinate falls outside what longitude/latitude can hold — the export wasn't reprojected. */
export function looksProjected(bbox: BBox): boolean {
	return Math.abs(bbox[0]) > 180 || Math.abs(bbox[2]) > 180 || Math.abs(bbox[1]) > 90 || Math.abs(bbox[3]) > 90;
}

export function analyzeLayer(collection: FeatureCollection): LayerAnalysis {
	const types = new Set<Geometry["type"]>();
	let bbox: BBox | null = null;
	for (const feature of collection.features) {
		types.add(feature.geometry.type);
		const featureBbox = bboxOfPositions(positionsOf(feature.geometry));
		if (featureBbox !== null) bbox = bbox === null ? featureBbox : unionBbox(bbox, featureBbox);
	}
	return { featureCount: collection.features.length, geometryTypes: [...types], bbox };
}

const ZONE_LABEL_KEYS = ["name", "zone", "label", "id"];

/** The property a zone's label is likely read from, so the checklist can say which one. */
export function zoneLabelKey(collection: FeatureCollection): string | null {
	for (const feature of collection.features) {
		const key = Object.keys(feature.properties).find(candidate =>
			ZONE_LABEL_KEYS.includes(candidate.toLowerCase())
		);
		if (key !== undefined) return key;
	}
	return null;
}

/** A zone's label for the preview map: its own name/zone/label/id property, or a fallback by position. */
export function zoneLabel(properties: Record<string, unknown>, index: number): string {
	for (const key of Object.keys(properties)) {
		if (!ZONE_LABEL_KEYS.includes(key.toLowerCase())) continue;
		const value = properties[key];
		if (typeof value === "string" && value !== "") return value;
		if (typeof value === "number") return String(value);
	}
	return `Zone ${index + 1}`;
}

const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

/**
 * Shoelace area on an equirectangular projection, scaled by cos(latitude) at the ring's own mean —
 * accurate to a few percent at site scale, not a geodesic solver. Enough to show roughly how big a
 * ground polygon is, not to settle a survey.
 */
function ringAreaSqMeters(ring: readonly number[][]): number {
	if (ring.length < 3) return 0;
	const meanLat = ring.reduce((sum, position) => sum + (position[1] ?? 0), 0) / ring.length;
	const metersPerDegreeLat = (Math.PI / 180) * EARTH_RADIUS_M;
	const metersPerDegreeLng = metersPerDegreeLat * Math.cos(toRadians(meanLat));
	let sum = 0;
	for (let index = 0; index < ring.length; index += 1) {
		const pointA = ring[index]!;
		const pointB = ring[(index + 1) % ring.length]!;
		const xA = (pointA[0] ?? 0) * metersPerDegreeLng;
		const yA = (pointA[1] ?? 0) * metersPerDegreeLat;
		const xB = (pointB[0] ?? 0) * metersPerDegreeLng;
		const yB = (pointB[1] ?? 0) * metersPerDegreeLat;
		sum += xA * yB - xB * yA;
	}
	return Math.abs(sum) / 2;
}

/** A ground layer's approximate area — outer rings add, holes subtract, in square metres. */
export function approximateAreaSqMeters(collection: FeatureCollection): number {
	let total = 0;
	for (const feature of collection.features) {
		if (feature.geometry.type !== "Polygon") continue;
		feature.geometry.coordinates.forEach((ring, index) => {
			total += index === 0 ? ringAreaSqMeters(ring) : -ringAreaSqMeters(ring);
		});
	}
	return total;
}

/** One line of the browser's pre-flight checklist — the same vocabulary the server's checks use. */
export interface ClientCheck {
	readonly id: string;
	readonly state: "passed" | "warning" | "blocked";
	readonly label: string;
	readonly detail: string;
}

/**
 * Everything this screen can check without a round trip: presence, shape, geometry, a WGS84-looking
 * extent, a usable zone label, and zones landing inside the ground extent. The server runs its own
 * five checks after upload regardless — this exists so a manager fixes the obvious problem before
 * spending a round trip on it, not instead of the server's word.
 */
export function runClientChecks(slots: Record<LayerName, LayerSlotState>): readonly ClientCheck[] {
	const checks: ClientCheck[] = [];

	for (const name of REQUIRED_LAYERS) {
		const slot = slots[name];
		checks.push({
			id: `present-${name}`,
			state: slot.kind === "ready" ? "passed" : "blocked",
			label: `${SLOT_LABELS[name]} is chosen`,
			detail:
				slot.kind === "ready"
					? slot.file.name
					: slot.kind === "error"
						? slot.message
						: slot.kind === "reading"
							? "Reading…"
							: "Required, and not chosen yet."
		});
	}

	for (const name of SLOT_ORDER) {
		const slot = slots[name];
		if (slot.kind === "empty" || slot.kind === "reading") continue;
		checks.push({
			id: `fc-${name}`,
			state: slot.kind === "ready" ? "passed" : "blocked",
			label: `${SLOT_LABELS[name]} is a FeatureCollection`,
			detail:
				slot.kind === "ready"
					? `${slot.analysis.featureCount} feature${slot.analysis.featureCount === 1 ? "" : "s"}`
					: slot.message
		});
		if (slot.kind !== "ready") continue;

		const expected = EXPECTED_GEOMETRY[name];
		const unexpected = slot.analysis.geometryTypes.filter(type => type !== expected);
		checks.push({
			id: `geom-${name}`,
			state: unexpected.length === 0 ? "passed" : "blocked",
			label: `${SLOT_LABELS[name]} geometry is ${expected}`,
			detail:
				unexpected.length === 0 ? `Every feature is a ${expected}.` : `Found ${unexpected.join(", ")} instead.`
		});

		if (slot.analysis.bbox !== null)
			checks.push({
				id: `crs-${name}`,
				state: looksProjected(slot.analysis.bbox) ? "warning" : "passed",
				label: `${SLOT_LABELS[name]} coordinates look like WGS84`,
				detail: looksProjected(slot.analysis.bbox)
					? "Coordinates look projected. In QGIS, export with CRS EPSG:4326."
					: "Longitude and latitude both fall in range."
			});
	}

	const zonesSlot = slots.zones;
	if (zonesSlot.kind === "ready") {
		const key = zoneLabelKey(zonesSlot.collection);
		checks.push({
			id: "zone-label",
			state: key === null ? "warning" : "passed",
			label: "Zones have a usable label",
			detail:
				key === null
					? "No name, zone, label or id property found — zones will show as Zone 1, Zone 2, …"
					: `Reading the "${key}" property.`
		});
	}

	const groundSlot = slots.ground;
	if (groundSlot.kind === "ready" && zonesSlot.kind === "ready") {
		const groundBbox = groundSlot.analysis.bbox;
		const zonesBbox = zonesSlot.analysis.bbox;
		if (groundBbox !== null && zonesBbox !== null)
			checks.push({
				id: "zones-in-ground",
				state: bboxContains(groundBbox, zonesBbox) ? "passed" : "warning",
				label: "Zones lie inside ground",
				detail: bboxContains(groundBbox, zonesBbox)
					? "The zones extent falls within the ground extent."
					: "Part of the zones extent falls outside the ground extent."
			});
	}

	return checks;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
	return UUID_PATTERN.test(value);
}

export interface ProjectIdResolution {
	readonly id: string;
	/** `true` once `NEXT_PUBLIC_FIELDMAPS_PROJECT_ID` is set, whether or not it looks like a UUID. */
	readonly configured: boolean;
	readonly valid: boolean;
}

/** `NEXT_PUBLIC_FIELDMAPS_PROJECT_ID` when set (WEB-01's quick fix), else the fixture project id. */
export function resolveProjectId(fallback: string): ProjectIdResolution {
	const raw = process.env.NEXT_PUBLIC_FIELDMAPS_PROJECT_ID;
	if (raw === undefined || raw === "") return { id: fallback, configured: false, valid: isUuid(fallback) };
	return { id: raw, configured: true, valid: isUuid(raw) };
}

/** Parse one exported layer, failing with the name of the file a manager actually chose. */
export async function readLayer(file: File): Promise<FeatureCollection> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(await file.text());
	} catch {
		throw new LayerReadError(`${file.name} is not readable JSON. Export it as GeoJSON.`);
	}
	if (
		typeof parsed !== "object" ||
		parsed === null ||
		(parsed as { type?: unknown }).type !== "FeatureCollection" ||
		!Array.isArray((parsed as { features?: unknown }).features)
	)
		throw new LayerReadError(`${file.name} is not a GeoJSON FeatureCollection.`);
	return parsed as FeatureCollection;
}

/** Base64 without loading the file twice: the project file is the only binary in a submission. */
export async function readProjectFile(file: File): Promise<{ file_name: string; content: string }> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	let binary = "";
	for (let index = 0; index < bytes.length; index += 1) binary += String.fromCharCode(bytes[index]!);
	return { file_name: file.name, content: btoa(binary) };
}

/** Where the API lives. Absent in a deployment that has not been pointed at one, and said so. */
export function apiBaseUrl(): string | null {
	const configured = process.env.NEXT_PUBLIC_FIELDMAPS_API_URL;
	return configured !== undefined && configured !== "" ? configured.replace(/\/$/, "") : null;
}

export async function submitPackage(
	baseUrl: string,
	projectId: string,
	token: string,
	submission: PackageSubmission
): Promise<PackageDetail> {
	const response = await fetch(`${baseUrl}/v1/projects/${projectId}/packages`, {
		method: "POST",
		headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
		body: JSON.stringify(submission)
	});
	if (response.status === 201) return (await response.json()) as PackageDetail;
	const detail = await response.text();
	if (response.status === 401 || response.status === 403)
		throw new LayerReadError("That token does not have manager access to this project.");
	throw new LayerReadError(
		response.status === 422
			? `The server refused the submission: ${detail}`
			: `The server answered ${response.status}. ${detail}`
	);
}
