import { describe, expect, it } from "vitest";
import type { Coordinate } from "../domain/observation";
import { clusterPoints, type MapPoint, nudge, scaleLabel } from "./clustering";

const points: readonly MapPoint[] = [
  { id: "a", coordinates: [-76.48432, 42.448451] },
  { id: "b", coordinates: [-76.48429, 42.448462] },
  { id: "c", coordinates: [-76.48434, 42.448438] },
  { id: "d", coordinates: [-76.48415, 42.44861] },
];

describe("Zoom-aware clustering", () => {
  it("draws one count when observations sit on top of each other at a low zoom", () => {
    // Given four observations within a few metres.
    // When the zone is viewed at a low zoom.
    const clusters = clusterPoints(points, 16);
    // Then they read as counts rather than an unreadable pile of markers.
    expect(
      clusters.every((cluster) => cluster.kind === "cluster" || cluster.kind === "single"),
    ).toBe(true);
    const counted = clusters.reduce(
      (total, cluster) => total + (cluster.kind === "cluster" ? cluster.count : 1),
      0,
    );
    expect(counted).toBe(points.length);
    expect(clusters.length).toBeLessThan(points.length);
  });

  it("separates every observation once the observer zooms in", () => {
    // Given the same observations at feature zoom.
    const clusters = clusterPoints(points, 19);
    // Then each is its own marker, ready to be tapped for its callout.
    expect(clusters).toHaveLength(points.length);
    expect(clusters.every((cluster) => cluster.kind === "single")).toBe(true);
  });

  it("returns nothing for an empty site and is stable across calls", () => {
    // Given no prior observations, and then the same input twice.
    // Then the output is empty, and identical between renders.
    expect(clusterPoints([], 17)).toEqual([]);
    expect(clusterPoints(points, 16)).toEqual(clusterPoints(points, 16));
  });
});

describe("Adjusting a hand-placed point", () => {
  it("moves the point a known distance without disturbing the other axis", () => {
    // Given a placed point.
    const placed: Coordinate = [-76.485, 42.448];
    // When it is nudged north by half a metre.
    const moved = nudge(placed, "north", 0.5);
    // Then latitude moves by that distance and longitude is untouched.
    expect(moved[0]).toBe(placed[0]);
    expect((moved[1] - placed[1]) * 111320).toBeCloseTo(0.5, 6);
  });

  it("moves east by the same ground distance at this latitude", () => {
    // Given the same point.
    const placed: Coordinate = [-76.485, 42.448];
    // When it is nudged east.
    const moved = nudge(placed, "east", 0.5);
    // Then the longitude step accounts for the convergence of the meridians.
    const metres = (moved[0] - placed[0]) * 111320 * Math.cos((42.448 * Math.PI) / 180);
    expect(metres).toBeCloseTo(0.5, 6);
    expect(moved[1]).toBe(placed[1]);
  });
});

describe("The scale pill", () => {
  it("reports a rounded ground distance that shrinks as the observer zooms in", () => {
    // Given two zoom levels over the same site.
    const wide = scaleLabel(16, 42.448);
    const close = scaleLabel(20, 42.448);
    // Then both read as whole units, and closer means smaller.
    expect(wide).toMatch(/^\d+ (m|km)$/);
    expect(Number.parseInt(close, 10)).toBeLessThan(Number.parseInt(wide, 10));
  });
});
