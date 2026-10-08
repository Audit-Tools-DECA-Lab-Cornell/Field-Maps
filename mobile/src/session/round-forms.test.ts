import { describe, expect, it } from "vitest";
import { formForRound, offersRound } from "./round-forms";

const practice = { formVersion: "shell-v1", inventoryFormVersion: "shell-v1" };
const study = { formVersion: "janet-test-v1", inventoryFormVersion: "janet-inventory-v1" };

describe("Rounds a site offers", () => {
  it("offers every round where the forms keep the round on the record", () => {
    expect(offersRound(study, "standard")).toBe(true);
    expect(offersRound(study, "reliability")).toBe(true);
    expect(offersRound(study, "inventory")).toBe(true);
    expect(formForRound(study, "inventory")?.version).toBe("janet-inventory-v1");
  });

  it("offers only Standard on a practice site, whose records cannot say which round they were", () => {
    expect(offersRound(practice, "standard")).toBe(true);
    expect(offersRound(practice, "reliability")).toBe(false);
    expect(offersRound(practice, "inventory")).toBe(false);
  });

  it("offers nothing whose form is not on this device", () => {
    expect(offersRound({ ...study, inventoryFormVersion: "missing-v9" }, "inventory")).toBe(false);
  });
});
