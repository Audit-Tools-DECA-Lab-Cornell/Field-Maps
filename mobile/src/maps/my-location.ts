import type { Feature, Polygon } from "geojson";
import type { Coordinate } from "../domain/observation";

/**
 * The observer's own position on the map, when they turn it on. It is shown only: hand placement
 * stays the record, and no fix is stored with an observation or sent anywhere.
 */

export type Fix = {
  readonly coordinate: Coordinate;
  /** The radius, in metres, the device is 68% sure the fix lies within. Null when it does not say. */
  readonly accuracy: number | null;
};

const EARTH_RADIUS_METRES = 6371008.8;
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const degrees = (value: number) => (value * 180) / Math.PI;

/** Great-circle distance in metres. */
export function distanceMetres(a: Coordinate, b: Coordinate): number {
  const dLat = radians(b[1] - a[1]);
  const dLon = radians(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a[1])) * Math.cos(radians(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The fix's accuracy as a circle on the ground, so it scales with the map like everything else. */
export function accuracyCircle(centre: Coordinate, metres: number, steps = 48): Feature<Polygon> {
  const [lon, lat] = centre;
  const ring: Coordinate[] = [];
  for (let step = 0; step <= steps; step++) {
    const bearing = (2 * Math.PI * step) / steps;
    const north = (metres * Math.cos(bearing)) / EARTH_RADIUS_METRES;
    const east = (metres * Math.sin(bearing)) / (EARTH_RADIUS_METRES * Math.cos(radians(lat)));
    ring.push([lon + degrees(east), lat + degrees(north)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } };
}

/** Farther than this from the site, the map does not move to the observer: they are not there yet. */
export const NEAR_SITE_METRES = 1500;

export function nearSite(fix: Fix, siteCentre: Coordinate): boolean {
  return distanceMetres(fix.coordinate, siteCentre) <= NEAR_SITE_METRES;
}

/** "±6 m", or "accuracy unknown". Rounded to whole metres: a finger is wider than the difference. */
export function accuracyLabel(fix: Fix): string {
  return fix.accuracy === null ? "accuracy unknown" : `±${Math.max(1, Math.round(fix.accuracy))} m`;
}

/** "450 m from this site", "3.2 km from this site". */
export function distanceLabel(metres: number): string {
  return metres < 1000
    ? `${Math.round(metres / 10) * 10} m from this site`
    : `${(metres / 1000).toFixed(1)} km from this site`;
}
