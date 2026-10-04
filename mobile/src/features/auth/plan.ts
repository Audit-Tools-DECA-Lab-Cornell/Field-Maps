import { z } from "zod";
import riverside from "../../../../contracts/fixtures/sites/riverside.json";

/**
 * The Riverside plan the welcome screen shows (Mobile 23), read from the shared site fixture
 * (`contracts/fixtures/sites/riverside.json`) and projected onto its plan units: x runs east and y runs
 * south, with longitude scaled by cos(latitude). The web's `projectSite` (web/src/lib/plan.ts) does the
 * same, so the two plans line up unit for unit.
 */

/** Metres per degree of latitude, and of longitude at the equator. */
const METRES_PER_DEGREE = 111_320;

type LngLat = readonly [number, number];
export type PlanPoint = readonly [x: number, y: number];

const position = z.tuple([z.number(), z.number()]);

const featureSchema = z.object({
  properties: z.object({
    kind: z.string(),
    id: z.string(),
    name: z.string().optional(),
    width_m: z.number().optional(),
    radius_m: z.number().optional(),
  }),
  geometry: z.discriminatedUnion("type", [
    z.object({ type: z.literal("Point"), coordinates: position }),
    z.object({ type: z.literal("LineString"), coordinates: z.array(position) }),
    z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(position)) }),
  ]),
});

const siteSchema = z.object({
  name: z.string(),
  frame: z.object({
    origin: position,
    metresPerUnit: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
  }),
  features: z.array(featureSchema),
});

type Frame = z.infer<typeof siteSchema>["frame"];

export type PlanShape = {
  id: string;
  kind: string;
  /** Polygons: the outer ring. Lines: the points along the line. */
  points: PlanPoint[];
  /** Lines: the width on the ground, in plan units. */
  width?: number;
};

export type PlanTree = { id: string; center: PlanPoint; radius: number };

export type Plan = {
  name: string;
  width: number;
  height: number;
  /** The site boundary. */
  site: PlanShape[];
  /** Ground surfaces in file order, bottom first, as QGIS draws them. */
  surfaces: PlanShape[];
  paths: PlanShape[];
  structures: PlanShape[];
  equipment: PlanShape[];
  trees: PlanTree[];
  zones: PlanShape[];
};

const SURFACE_KINDS = new Set(["grass", "mulch", "dirt", "blacktop", "path"]);

function toPlan([lng, lat]: LngLat, frame: Frame): PlanPoint {
  const [originLng, originLat] = frame.origin;
  const cos = Math.cos((originLat * Math.PI) / 180);
  const x = ((lng - originLng) * METRES_PER_DEGREE * cos) / frame.metresPerUnit;
  const y = ((originLat - lat) * METRES_PER_DEGREE) / frame.metresPerUnit;
  return [x, y];
}

/** Projects a site collection onto its own frame. */
export function projectPlan(data: unknown): Plan {
  const site = siteSchema.parse(data);
  const { frame } = site;
  const plan: Plan = {
    name: site.name,
    width: frame.width,
    height: frame.height,
    site: [],
    surfaces: [],
    paths: [],
    structures: [],
    equipment: [],
    trees: [],
    zones: [],
  };
  for (const { properties, geometry } of site.features) {
    const { kind, id } = properties;
    if (geometry.type === "Point") {
      if (kind === "tree" && properties.radius_m)
        plan.trees.push({
          id,
          center: toPlan(geometry.coordinates, frame),
          radius: properties.radius_m / frame.metresPerUnit,
        });
      continue;
    }
    if (geometry.type === "LineString") {
      if (kind === "path")
        plan.paths.push({
          id,
          kind,
          points: geometry.coordinates.map((point) => toPlan(point, frame)),
          width: (properties.width_m ?? 2) / frame.metresPerUnit,
        });
      continue;
    }
    const ring = geometry.coordinates[0];
    if (!ring) continue;
    const shape: PlanShape = { id, kind, points: ring.map((point) => toPlan(point, frame)) };
    if (kind === "site") plan.site.push(shape);
    else if (SURFACE_KINDS.has(kind)) plan.surfaces.push(shape);
    else if (kind === "structure") plan.structures.push(shape);
    else if (kind === "equipment") plan.equipment.push(shape);
    else if (kind === "zone") plan.zones.push(shape);
  }
  return plan;
}

/** Whether a point lies inside a polygon (even–odd rule). */
export function pointInPolygon([px, py]: PlanPoint, polygon: readonly PlanPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (!a || !b) continue;
    const [xi, yi] = a;
    const [xj, yj] = b;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export const RIVERSIDE_PLAN: Plan = projectPlan(riverside);

/**
 * The part of the plan the welcome screen shows, in plan units: the three zones from the west path to the
 * shelter, as Mobile 23 crops it.
 */
export const WELCOME_VIEW = { x: 70, y: 68, width: 578, height: 327 } as const;

/**
 * The fourteen observation markers Mobile 23 draws (seven in North meadow, six in Woodland edge, one in
 * Sand area), traced from the design in plan units. They illustrate the plan and are not records.
 */
export const WELCOME_MARKERS: readonly PlanPoint[] = [
  [204, 158],
  [249, 191],
  [329, 176],
  [383, 196],
  [419, 128],
  [461, 172],
  [498, 140],
  [149, 320],
  [214, 316],
  [267, 332],
  [285, 374],
  [169, 391],
  [230, 392],
  [552, 325],
];
