import type { Coordinate } from "../domain/observation";

/**
 * Zoom-aware clustering, computed here rather than in the style, because the bundled offline
 * bases carry no glyphs and a cluster has to show its count as real text. Pure, so the
 * cluster-to-individual transition can be checked without a device.
 */

export type MapPoint = { readonly id: string; readonly coordinates: Coordinate };

export type MapCluster =
  | { readonly kind: "single"; readonly id: string; readonly coordinates: Coordinate }
  | {
      readonly kind: "cluster";
      readonly id: string;
      readonly coordinates: Coordinate;
      readonly count: number;
      readonly members: readonly string[];
    };

export type ClusterOptions = {
  /** Points closer together than this on screen join into one count. */
  readonly radiusPixels?: number;
  /** At and above this zoom every observation is drawn on its own, with a label. */
  readonly individualZoom?: number;
};

const TILE_PIXELS = 256;

export function degreesPerPixel(zoom: number): number {
  return 360 / (TILE_PIXELS * 2 ** zoom);
}

/** Ground resolution at a latitude, used for the scale bar and for nudging in metres. */
export function metresPerPixel(zoom: number, latitude: number): number {
  return (156543.03392 * Math.cos((latitude * Math.PI) / 180)) / 2 ** zoom;
}

export function clusterPoints(
  points: readonly MapPoint[],
  zoom: number,
  options: ClusterOptions = {},
): readonly MapCluster[] {
  const radius = options.radiusPixels ?? 44;
  const individualZoom = options.individualZoom ?? 18;
  if (points.length === 0) return [];
  const ordered = [...points].sort((left, right) => left.id.localeCompare(right.id));
  if (zoom >= individualZoom)
    return ordered.map((point) => ({
      kind: "single",
      id: point.id,
      coordinates: point.coordinates,
    }));

  const meanLatitude =
    ordered.reduce((total, point) => total + point.coordinates[1], 0) / ordered.length;
  const cellLongitude = radius * degreesPerPixel(zoom);
  const cellLatitude = Math.max(
    cellLongitude * Math.cos((meanLatitude * Math.PI) / 180),
    Number.EPSILON,
  );

  const buckets = new Map<string, MapPoint[]>();
  for (const point of ordered) {
    const column = Math.floor(point.coordinates[0] / cellLongitude);
    const row = Math.floor(point.coordinates[1] / cellLatitude);
    const key = `${column}:${row}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(point);
    else buckets.set(key, [point]);
  }

  const clusters: MapCluster[] = [];
  for (const bucket of buckets.values()) {
    const first = bucket[0];
    if (!first) continue;
    if (bucket.length === 1) {
      clusters.push({ kind: "single", id: first.id, coordinates: first.coordinates });
      continue;
    }
    const longitude = bucket.reduce((total, p) => total + p.coordinates[0], 0) / bucket.length;
    const latitude = bucket.reduce((total, p) => total + p.coordinates[1], 0) / bucket.length;
    clusters.push({
      kind: "cluster",
      id: `cluster-${first.id}`,
      coordinates: [longitude, latitude],
      count: bucket.length,
      members: bucket.map((point) => point.id),
    });
  }
  return clusters.sort((left, right) => left.id.localeCompare(right.id));
}

/** Moves a hand-placed point by a small distance, keeping the observer's placement authoritative. */
export function nudge(
  coordinates: Coordinate,
  direction: "north" | "south" | "east" | "west",
  metres: number,
): Coordinate {
  const [longitude, latitude] = coordinates;
  const latitudeStep = metres / 111320;
  const scale = Math.max(Math.cos((latitude * Math.PI) / 180), 0.01);
  const longitudeStep = metres / (111320 * scale);
  switch (direction) {
    case "north":
      return [longitude, Math.min(latitude + latitudeStep, 90)];
    case "south":
      return [longitude, Math.max(latitude - latitudeStep, -90)];
    case "east":
      return [Math.min(longitude + longitudeStep, 180), latitude];
    case "west":
      return [Math.max(longitude - longitudeStep, -180), latitude];
  }
}

/** A rounded, honest bar length for the scale pill. */
export function scaleLabel(zoom: number, latitude: number, barPixels = 64): string {
  const metres = metresPerPixel(zoom, latitude) * barPixels;
  const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  const chosen = steps.find((step) => step >= metres) ?? steps[steps.length - 1] ?? 1000;
  return chosen >= 1000 ? `${chosen / 1000} km` : `${chosen} m`;
}
