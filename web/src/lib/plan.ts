import { z } from "zod";

/**
 * Site plans as geometry. A site is a GeoJSON FeatureCollection in WGS84 (the layers of a map package
 * uploaded from QGIS). Drawing it projects every position onto a plan: x runs east and y runs south, in plan
 * units of a fixed number of metres, using the equirectangular approximation with longitude scaled by
 * cos(latitude). That is exact enough for a site a few hundred metres across, and it keeps the plan the same
 * on every screen.
 *
 * Everything here is pure, so the plan draws on the server, in the browser and in print alike.
 */

/** Metres per degree of latitude, and of longitude at the equator. */
const METRES_PER_DEGREE = 111_320;

/** Every plan is drawn into a frame of this many units; a site without its own frame is fitted inside it. */
export const PLAN_WIDTH = 720;
export const PLAN_HEIGHT = 500;

/** Room left around a fitted site, as a share of its larger side. */
const FIT_PADDING = 0.06;

export type LngLat = readonly [lng: number, lat: number];
export type PlanPoint = readonly [x: number, y: number];

/* ── The site collection ──────────────────────────────────────────────────── */

export const SITE_KINDS = [
	"site",
	"grass",
	"mulch",
	"dirt",
	"blacktop",
	"path",
	"structure",
	"equipment",
	"tree",
	"zone"
] as const;

export type SiteKind = (typeof SITE_KINDS)[number];

/** The ground surfaces, each with a fill and an edge in the map palette. */
export type SurfaceKind = "grass" | "mulch" | "dirt" | "blacktop" | "path";

const position = z.tuple([z.number(), z.number()]);

const geometrySchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("Point"), coordinates: position }),
	z.object({ type: z.literal("LineString"), coordinates: z.array(position).min(2) }),
	z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(position).min(4)).min(1) })
]);

const propertiesSchema = z.object({
	kind: z.enum(SITE_KINDS),
	id: z.string().min(1),
	name: z.string().optional(),
	code: z.string().optional(),
	/** Paths drawn as lines: their width on the ground. */
	width_m: z.number().positive().optional(),
	/** Trees drawn as points: their crown radius. */
	radius_m: z.number().positive().optional(),
	/** Zones: where the name pill sits, when the polygon's own centre would cover something. */
	label_point: position.optional(),
	/** Fall Creek equipment keeps the QGIS layer's own kind ("swings", "picnic-table"). */
	source_kind: z.string().optional()
});

const frameSchema = z.object({
	origin: position,
	metresPerUnit: z.number().positive(),
	width: z.number().positive(),
	height: z.number().positive()
});

const collectionSchema = z.object({
	type: z.literal("FeatureCollection"),
	name: z.string().min(1),
	frame: frameSchema.optional(),
	features: z.array(z.object({ type: z.literal("Feature"), properties: propertiesSchema, geometry: geometrySchema }))
});

/**
 * Where a plan's unit grid sits on the ground: plan (0, 0) is `origin`, one unit is `metresPerUnit`, and the
 * frame is `width` × `height` units. A site drawn in plan units carries its own; others are fitted.
 */
export type PlanFrame = z.infer<typeof frameSchema>;
export type SiteFeature = z.infer<typeof collectionSchema>["features"][number];
export type SiteCollection = z.infer<typeof collectionSchema>;

/** Checks a site collection's shape, so a bad fixture or package fails where it is read, not where it is drawn. */
export function parseSite(data: unknown): SiteCollection {
	return collectionSchema.parse(data);
}

/* ── Projection ───────────────────────────────────────────────────────────── */

const cosOf = (latitude: number) => Math.cos((latitude * Math.PI) / 180);

/** A position on the ground to plan units in the given frame. */
export function toPlan([lng, lat]: LngLat, frame: PlanFrame): PlanPoint {
	const [originLng, originLat] = frame.origin;
	const x = ((lng - originLng) * METRES_PER_DEGREE * cosOf(originLat)) / frame.metresPerUnit;
	const y = ((originLat - lat) * METRES_PER_DEGREE) / frame.metresPerUnit;
	return [x, y];
}

/** Plan units back to a position on the ground. The inverse of {@link toPlan}. */
export function fromPlan([x, y]: PlanPoint, frame: PlanFrame): LngLat {
	const [originLng, originLat] = frame.origin;
	const lng = originLng + (x * frame.metresPerUnit) / (METRES_PER_DEGREE * cosOf(originLat));
	const lat = originLat - (y * frame.metresPerUnit) / METRES_PER_DEGREE;
	return [lng, lat];
}

function positionsOf(feature: SiteFeature): LngLat[] {
	const { geometry } = feature;
	if (geometry.type === "Point") return [geometry.coordinates];
	if (geometry.type === "LineString") return geometry.coordinates;
	return geometry.coordinates.flat();
}

/**
 * The frame for a site that does not carry one: the site's extent with a little room around it, centred in a
 * {@link PLAN_WIDTH} × {@link PLAN_HEIGHT} frame, so every plan shares one shape and thumbnails line up.
 */
export function fitFrame(features: readonly SiteFeature[]): PlanFrame {
	const all = features.flatMap(positionsOf);
	if (all.length === 0) throw new Error("A site needs at least one feature to fit a plan to.");
	const lngs = all.map(([lng]) => lng);
	const lats = all.map(([, lat]) => lat);
	const west = Math.min(...lngs);
	const east = Math.max(...lngs);
	const south = Math.min(...lats);
	const north = Math.max(...lats);
	const cos = cosOf((north + south) / 2);
	const widthMetres = (east - west) * METRES_PER_DEGREE * cos;
	const heightMetres = (north - south) * METRES_PER_DEGREE;
	const pad = Math.max(widthMetres, heightMetres, 1) * FIT_PADDING;
	const metresPerUnit = Math.max((widthMetres + pad * 2) / PLAN_WIDTH, (heightMetres + pad * 2) / PLAN_HEIGHT);
	const centreLng = (west + east) / 2;
	const centreLat = (north + south) / 2;
	return {
		origin: [
			centreLng - (PLAN_WIDTH / 2) * (metresPerUnit / (METRES_PER_DEGREE * cos)),
			centreLat + (PLAN_HEIGHT / 2) * (metresPerUnit / METRES_PER_DEGREE)
		],
		metresPerUnit,
		width: PLAN_WIDTH,
		height: PLAN_HEIGHT
	};
}

/* ── Plane geometry ───────────────────────────────────────────────────────── */

function signedArea(points: readonly PlanPoint[]): number {
	let sum = 0;
	for (let i = 0; i < points.length; i++) {
		const [x1, y1] = points[i]!;
		const [x2, y2] = points[(i + 1) % points.length]!;
		sum += x1 * y2 - x2 * y1;
	}
	return sum / 2;
}

/** The area-weighted centre of a polygon (its vertex average when it has no area). */
export function polygonCentroid(points: readonly PlanPoint[]): PlanPoint {
	const area = signedArea(points);
	if (Math.abs(area) < 1e-9) {
		const n = Math.max(points.length, 1);
		return [points.reduce((s, [x]) => s + x, 0) / n, points.reduce((s, [, y]) => s + y, 0) / n];
	}
	let cx = 0;
	let cy = 0;
	for (let i = 0; i < points.length; i++) {
		const [x1, y1] = points[i]!;
		const [x2, y2] = points[(i + 1) % points.length]!;
		const cross = x1 * y2 - x2 * y1;
		cx += (x1 + x2) * cross;
		cy += (y1 + y2) * cross;
	}
	return [cx / (6 * area), cy / (6 * area)];
}

/** Whether a point lies inside a polygon (even–odd rule). Works the same for plan points and lng/lat pairs. */
export function pointInPolygon(
	[px, py]: readonly [number, number],
	polygon: readonly (readonly [number, number])[]
): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i]!;
		const [xj, yj] = polygon[j]!;
		if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

function distanceToSegment([px, py]: PlanPoint, [ax, ay]: PlanPoint, [bx, by]: PlanPoint): number {
	const dx = bx - ax;
	const dy = by - ay;
	const lengthSquared = dx * dx + dy * dy;
	const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
	return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function distanceToEdge(point: PlanPoint, polygon: readonly PlanPoint[]): number {
	let best = Infinity;
	for (let i = 0; i < polygon.length; i++) {
		best = Math.min(best, distanceToSegment(point, polygon[i]!, polygon[(i + 1) % polygon.length]!));
	}
	return best;
}

export type PlanBounds = { minX: number; minY: number; maxX: number; maxY: number };

export function boundsOf(points: readonly PlanPoint[]): PlanBounds {
	return {
		minX: Math.min(...points.map(([x]) => x)),
		minY: Math.min(...points.map(([, y]) => y)),
		maxX: Math.max(...points.map(([x]) => x)),
		maxY: Math.max(...points.map(([, y]) => y))
	};
}

/**
 * The inside point farthest from every edge: where a label reads best in a long or bent zone, where the
 * centroid can fall near an edge or outside it. A coarse grid search, then a finer one around the best cell.
 */
export function interiorAnchor(polygon: readonly PlanPoint[]): PlanPoint {
	const centroid = polygonCentroid(polygon);
	let best: PlanPoint = centroid;
	let bestDistance = pointInPolygon(centroid, polygon) ? distanceToEdge(centroid, polygon) : -1;
	let { minX, minY, maxX, maxY } = boundsOf(polygon);
	for (let pass = 0; pass < 2; pass++) {
		const steps = 16;
		const stepX = (maxX - minX) / steps;
		const stepY = (maxY - minY) / steps;
		for (let i = 0; i <= steps; i++) {
			for (let j = 0; j <= steps; j++) {
				const point: PlanPoint = [minX + i * stepX, minY + j * stepY];
				if (!pointInPolygon(point, polygon)) continue;
				const distance = distanceToEdge(point, polygon);
				if (distance > bestDistance) {
					best = point;
					bestDistance = distance;
				}
			}
		}
		[minX, maxX, minY, maxY] = [best[0] - stepX, best[0] + stepX, best[1] - stepY, best[1] + stepY];
	}
	return best;
}

/* ── The projected site ───────────────────────────────────────────────────── */

type ShapeBase = { id: string; name?: string };

/** A projected feature, ready to draw. Polygons keep every ring; the first is the outer one. */
export type PlanShape =
	| (ShapeBase & {
			type: "polygon";
			kind: Exclude<SiteKind, "zone">;
			rings: PlanPoint[][];
			/** The QGIS layer's own kind, when the plan kind generalises it (Fall Creek equipment). */
			sourceKind?: string;
	  })
	| (ShapeBase & { type: "line"; kind: "path"; points: PlanPoint[]; /** Plan units. */ width: number })
	| (ShapeBase & { type: "circle"; kind: "tree"; center: PlanPoint; /** Plan units. */ radius: number });

export type PlanZone = {
	id: string;
	code?: string;
	name: string;
	/** The outer ring, without the closing repeat of the first point. */
	points: PlanPoint[];
	centroid: PlanPoint;
	/** Where the name pill is centred. */
	labelAnchor: PlanPoint;
};

export type ProjectedSite = {
	name: string;
	frame: PlanFrame;
	/** Frame size in plan units. */
	width: number;
	height: number;
	metresPerUnit: number;
	/** Every feature except zones, in file order (the order QGIS draws them, bottom first). */
	features: PlanShape[];
	zones: PlanZone[];
	/** The extent of everything drawn, in plan units. */
	bounds: PlanBounds;
};

/** A path or tree without a size in the data draws at these. */
const DEFAULT_PATH_WIDTH_M = 2;
const DEFAULT_TREE_RADIUS_M = 3;

/** Drops a ring's closing point, which repeats the first. */
function openRing(ring: readonly PlanPoint[]): PlanPoint[] {
	const [first] = ring;
	const last = ring[ring.length - 1];
	return first && last && first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : [...ring];
}

/**
 * Projects a site onto its plan: polygons as point lists, paths as lines with a width, trees as circles, and
 * zones with the centre and label anchor their pills need. Sizes in metres become plan units.
 */
export function projectSite(collection: SiteCollection): ProjectedSite {
	const frame = collection.frame ?? fitFrame(collection.features);
	const project = (position: LngLat) => toPlan(position, frame);
	const units = (metres: number) => metres / frame.metresPerUnit;

	const features: PlanShape[] = [];
	const zones: PlanZone[] = [];
	const extent: PlanPoint[] = [];

	for (const { properties, geometry } of collection.features) {
		const base: ShapeBase = { id: properties.id, ...(properties.name ? { name: properties.name } : {}) };

		if (properties.kind === "zone") {
			if (geometry.type !== "Polygon") continue;
			const points = openRing(geometry.coordinates[0]!.map(project));
			const centroid = polygonCentroid(points);
			zones.push({
				id: properties.id,
				...(properties.code ? { code: properties.code } : {}),
				name: properties.name ?? properties.id,
				points,
				centroid,
				labelAnchor: properties.label_point ? project(properties.label_point) : interiorAnchor(points)
			});
			extent.push(...points);
			continue;
		}

		if (geometry.type === "Polygon") {
			const rings = geometry.coordinates.map(ring => openRing(ring.map(project)));
			features.push({
				...base,
				type: "polygon",
				kind: properties.kind,
				rings,
				...(properties.source_kind ? { sourceKind: properties.source_kind } : {})
			});
			extent.push(...rings[0]!);
		} else if (geometry.type === "LineString" && properties.kind === "path") {
			const points = geometry.coordinates.map(project);
			features.push({
				...base,
				type: "line",
				kind: "path",
				points,
				width: units(properties.width_m ?? DEFAULT_PATH_WIDTH_M)
			});
			extent.push(...points);
		} else if (geometry.type === "Point" && properties.kind === "tree") {
			const center = project(geometry.coordinates);
			const radius = units(properties.radius_m ?? DEFAULT_TREE_RADIUS_M);
			features.push({ ...base, type: "circle", kind: "tree", center, radius });
			extent.push([center[0] - radius, center[1] - radius], [center[0] + radius, center[1] + radius]);
		}
	}

	return {
		name: collection.name,
		frame,
		width: frame.width,
		height: frame.height,
		metresPerUnit: frame.metresPerUnit,
		features,
		zones,
		bounds: extent.length > 0 ? boundsOf(extent) : { minX: 0, minY: 0, maxX: frame.width, maxY: frame.height }
	};
}

/**
 * A point inside a zone from a fraction of its bounding box ({u: 0, v: 0} is the north-west corner). A point
 * that lands outside a bent zone is pulled toward the label anchor until it is inside, so fixture records
 * placed this way always sit in their own zone.
 */
export function placeInZone(zone: PlanZone, { u, v }: { u: number; v: number }): PlanPoint {
	const { minX, minY, maxX, maxY } = boundsOf(zone.points);
	const wanted: PlanPoint = [minX + (maxX - minX) * u, minY + (maxY - minY) * v];
	if (pointInPolygon(wanted, zone.points) && distanceToEdge(wanted, zone.points) > 6) return wanted;
	const [ax, ay] = zone.labelAnchor;
	for (let t = 0.1; t <= 1; t += 0.1) {
		const point: PlanPoint = [wanted[0] + (ax - wanted[0]) * t, wanted[1] + (ay - wanted[1]) * t];
		if (pointInPolygon(point, zone.points) && distanceToEdge(point, zone.points) > 6) return point;
	}
	return zone.labelAnchor;
}

/** The zone a point falls in, if any. */
export function zoneAt(site: ProjectedSite, point: PlanPoint): PlanZone | undefined {
	return site.zones.find(zone => pointInPolygon(point, zone.points));
}

/* ── Scale ────────────────────────────────────────────────────────────────── */

/** Round distances a scale bar may show, in metres. */
const SCALE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

/** The bar length a scale chip aims for, in CSS pixels. */
const SCALE_TARGET_PX = 56;

export type ScaleChip = { metres: number; label: string; px: number };

/**
 * The scale bar for a plan drawn `widthPx` wide across `planWidthMetres` of ground at `zoom`: the round
 * distance whose bar comes closest to a comfortable length, and that bar's length in pixels.
 */
export function scaleChip(widthPx: number, planWidthMetres: number, zoom = 1): ScaleChip {
	const pxPerMetre = (widthPx * zoom) / planWidthMetres;
	let metres = SCALE_STEPS[0]!;
	let bestFit = Infinity;
	for (const step of SCALE_STEPS) {
		const fit = Math.abs(Math.log((step * pxPerMetre) / SCALE_TARGET_PX));
		if (fit < bestFit) {
			bestFit = fit;
			metres = step;
		}
	}
	const label = metres >= 1000 ? `0–${metres / 1000} km` : `0–${metres} m`;
	return { metres, label, px: Math.round(metres * pxPerMetre) };
}
