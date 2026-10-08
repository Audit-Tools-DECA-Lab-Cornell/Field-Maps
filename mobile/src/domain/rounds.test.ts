import { describe, expect, it } from "vitest";
import { placesPoints, ROUND_TYPES, ROUNDS, roundColumns, roundLabel } from "./rounds";

describe("round types", () => {
  it("offers the three rounds Janet asked for, in her order", () => {
    expect(ROUND_TYPES).toEqual(["standard", "reliability", "inventory"]);
    expect(ROUND_TYPES.map(roundLabel)).toEqual([
      "Standard round",
      "Reliability round",
      "Inventory round",
    ]);
  });

  it("places points for play events only", () => {
    expect(placesPoints("standard")).toBe(true);
    expect(placesPoints("reliability")).toBe(true);
    expect(placesPoints("inventory")).toBe(false);
  });

  it("marks reliability records and the first round of a period with the workbook's columns", () => {
    expect(roundColumns("standard", false)).toEqual({ Rel_Round: "no", First_Round: "no" });
    expect(roundColumns("reliability", true)).toEqual({ Rel_Round: "yes", First_Round: "yes" });
  });

  it("leaves inventory records out of the play-event round columns", () => {
    expect(roundColumns("inventory", true)).toEqual({});
  });

  it("describes every round in one line", () => {
    for (const type of ROUND_TYPES) expect(ROUNDS[type].description.length).toBeGreaterThan(20);
  });
});
