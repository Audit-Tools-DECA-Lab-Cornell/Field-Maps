import { describe, expect, it } from "vitest";
import {
  accuracyCircle,
  accuracyLabel,
  distanceLabel,
  distanceMetres,
  nearSite,
} from "./my-location";

const fallCreek: [number, number] = [-76.4956, 42.4508];

describe("The observer's position on the map", () => {
  it("measures ground distance", () => {
    // 0.001° of latitude is about 111 m anywhere.
    expect(distanceMetres(fallCreek, [fallCreek[0], fallCreek[1] + 0.001])).toBeCloseTo(111.2, 0);
    expect(distanceMetres(fallCreek, fallCreek)).toBe(0);
  });

  it("draws the accuracy as a closed circle of that radius on the ground", () => {
    const circle = accuracyCircle(fallCreek, 25);
    const ring = circle.geometry.coordinates[0] ?? [];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    for (const point of ring)
      expect(distanceMetres(fallCreek, [point[0] ?? 0, point[1] ?? 0])).toBeCloseTo(25, 0);
  });

  it("knows when the observer is at the site, and how far away when not", () => {
    expect(
      nearSite({ coordinate: [fallCreek[0] + 0.002, fallCreek[1]], accuracy: 5 }, fallCreek),
    ).toBe(true);
    const ithacaCommons: [number, number] = [-76.4977, 42.4396];
    expect(nearSite({ coordinate: ithacaCommons, accuracy: 5 }, fallCreek)).toBe(true);
    const cornell: [number, number] = [-76.4735, 42.4534];
    expect(nearSite({ coordinate: cornell, accuracy: 5 }, fallCreek)).toBe(false);
    expect(distanceLabel(distanceMetres(cornell, fallCreek))).toBe("1.8 km from this site");
    expect(distanceLabel(447)).toBe("450 m from this site");
  });

  it("says how sure the fix is, in whole metres", () => {
    expect(accuracyLabel({ coordinate: fallCreek, accuracy: 6.4 })).toBe("±6 m");
    expect(accuracyLabel({ coordinate: fallCreek, accuracy: 0.3 })).toBe("±1 m");
    expect(accuracyLabel({ coordinate: fallCreek, accuracy: null })).toBe("accuracy unknown");
  });
});
