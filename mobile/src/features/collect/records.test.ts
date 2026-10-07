import { describe, expect, it } from "vitest";
import type { Observation } from "../../domain/observation";
import { siteZones } from "../../maps/sample-site";
import type { SessionSave } from "../../session/provider";
import { inventoriedZones, lastSavedLine, mapRecords, nextZoneToInventory } from "./records";

const context = {
  packageId: "riverside-play-study",
  packageVersion: "v4",
  zoneId: "B",
  zoneLabel: "Zone B · North playground",
  roundType: "standard" as const,
  freshPeriod: false,
  inheritedFrom: "",
};

function instrument(
  id: string,
  overrides: Partial<Observation> & Record<string, unknown> = {},
): Observation {
  return {
    id,
    coordinates: [-76.4843, 42.44845],
    createdAt: "2026-10-07T15:34:00.000Z",
    storageStatus: "local-only",
    syncError: "",
    siteId: "riverside-north-playground",
    formVersion: "janet-test-v1",
    observer: "JL",
    answers: { play_event_summary: "Two children dig a channel." },
    context,
    placement: { source: "hand", gpsAccuracyMetres: null },
    ...overrides,
  } as Observation;
}

describe("map records", () => {
  it("draws this site's play events with their round", () => {
    const shown = mapRecords(
      [
        instrument("3f2a1b00-0000-4000-8000-000000000001"),
        instrument("3f2a1b00-0000-4000-8000-000000000002", { siteId: "elsewhere" }),
      ],
      "riverside-north-playground",
    );
    expect(shown).toHaveLength(1);
    expect(shown[0]).toMatchObject({
      label: "OBS-3F2A1B",
      round: "Standard round",
      summary: "Two children dig a channel.",
    });
  });

  it("leaves whole-zone inventories off the map: their point is a zone centre, not play", () => {
    const shown = mapRecords(
      [
        instrument("3f2a1b00-0000-4000-8000-000000000003", {
          formVersion: "janet-inventory-v1",
          context: { ...context, roundType: "inventory" },
          placement: { source: "zone", gpsAccuracyMetres: null },
        }),
      ],
      "riverside-north-playground",
    );
    expect(shown).toEqual([]);
  });
});

describe("inventory progress", () => {
  const save = (zoneId: string, roundType: SessionSave["roundType"]): SessionSave => ({
    id: `00000000-0000-4000-8000-00000000000${zoneId.charCodeAt(0) % 10}`,
    zoneId,
    zoneLabel: `Zone ${zoneId}`,
    roundType,
    savedAt: "2026-10-07T15:34:00.000Z",
    heldOnly: true,
  });
  const [zoneA, zoneB, zoneC] = siteZones;

  it("counts only inventory saves as zones done", () => {
    expect([...inventoriedZones([save("A", "inventory"), save("B", "standard")])]).toEqual(["A"]);
  });

  it("suggests the next zone without an inventory, wrapping round", () => {
    if (!zoneA || !zoneB || !zoneC) throw new Error("fixture zones");
    expect(nextZoneToInventory(siteZones, zoneA, new Set(["A"]))?.id).toBe("B");
    expect(nextZoneToInventory(siteZones, zoneC, new Set(["C"]))?.id).toBe("A");
    expect(nextZoneToInventory(siteZones, zoneB, new Set(["A", "B", "C"]))).toBeNull();
  });

  it("names the last save for the place step", () => {
    expect(lastSavedLine([])).toBeNull();
    expect(lastSavedLine([save("A", "standard")])).toMatch(/^OBS-[0-9A-F]{6} · \d{2}:\d{2}$/);
  });
});
