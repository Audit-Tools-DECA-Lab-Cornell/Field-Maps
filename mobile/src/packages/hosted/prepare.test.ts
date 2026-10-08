import { createHash } from "node:crypto";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import inventoryDefinition from "../../../../contracts/forms/janet-inventory-v1.json";
import playDefinition from "../../../../contracts/forms/janet-test-v1.json";
import { pointInZone, zoneBounds, zoneFeature } from "../../maps/geometry";
import { readArchive } from "./archive";
import { hostedSitePackage } from "./build";
import { type PackageSource, PrepareError, preparePackage, storedForms } from "./prepare";
import type { FormSummary, FormVersion, HostedSite } from "./schemas";

const PROJECT = "10000000-0000-4000-8000-0000000000aa";
const PACKAGE = "20000000-0000-4000-8000-0000000000bb";

const ring = (west: number, south: number, east: number, north: number) => [
  [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ],
];

const manifest = {
  format: 1,
  site_code: "fall-creek",
  form_version: "play-v1",
  extent: { west: -76.5, south: 42.44, east: -76.49, north: 42.45 },
  centre: [-76.495, 42.445],
  zones: [
    {
      id: "A",
      label: "Zone A · Whole playground",
      west: -76.5,
      south: 42.44,
      east: -76.49,
      north: 42.45,
    },
  ],
  layers: [{ name: "ground" }, { name: "zones" }, { name: "trees" }],
  source_project: null,
};

const layers = {
  ground: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "site" },
        geometry: { type: "Polygon", coordinates: ring(-76.5, 42.44, -76.49, 42.45) },
      },
      {
        type: "Feature",
        properties: { kind: "grass" },
        geometry: { type: "Polygon", coordinates: ring(-76.499, 42.441, -76.495, 42.444) },
      },
    ],
  },
  zones: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: "A", label: "Zone A · Whole playground" },
        // A triangle inside the box, so the drawn shape and the box can be told apart.
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-76.5, 42.44],
              [-76.49, 42.44],
              [-76.5, 42.45],
              [-76.5, 42.44],
            ],
          ],
        },
      },
    ],
  },
  trees: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { kind: "tree" },
        geometry: { type: "Point", coordinates: [-76.496, 42.446] },
      },
    ],
  },
};

function archive(files: Record<string, unknown> = { "manifest.json": manifest, ...layerFiles() }) {
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, value]) => [name, strToU8(JSON.stringify(value))]),
    ),
  );
}

function layerFiles(): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(layers).map(([name, value]) => [`layers/${name}.json`, value]),
  );
}

const sha256 = async (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function published(code: string, definition: Record<string, unknown>, form: string): FormVersion {
  return {
    code,
    state: "published",
    form_code: form,
    definition: { ...definition, version: code, status: "published" },
  };
}

const versions: Record<string, FormVersion> = {
  "play-v1": published("play-v1", playDefinition, "play"),
  "inventory-v2": published("inventory-v2", inventoryDefinition, "inventory"),
  "notes-v1": published("notes-v1", playDefinition, "notes"),
};

const summaries: FormSummary[] = [
  {
    code: "notes",
    name: "Notes",
    versions: [{ code: "notes-v1", version: 1, state: "published" }],
  },
  {
    code: "inventory",
    name: "Inventory",
    versions: [
      { code: "inventory-v3", version: 3, state: "retired" },
      { code: "inventory-v2", version: 2, state: "published" },
    ],
  },
  { code: "play", name: "Play", versions: [{ code: "play-v1", version: 1, state: "published" }] },
];

async function site(bytes: Uint8Array): Promise<HostedSite> {
  return {
    site_id: "30000000-0000-4000-8000-0000000000cc",
    code: "fall-creek",
    name: "Fall Creek playground",
    description: null,
    package: {
      package_id: PACKAGE,
      version: 2,
      form_version: "play-v1",
      archive_bytes: bytes.byteLength,
      archive_sha256: await sha256(bytes),
      prepared_at: "2026-10-08T01:00:00Z",
    },
    zones: manifest.zones,
    observation_count: 0,
  };
}

function source(bytes: Uint8Array, overrides: Partial<PackageSource> = {}): PackageSource {
  return {
    archive: async () => bytes,
    sha256,
    forms: async () => summaries,
    formVersion: async (code) => {
      const found = versions[code];
      if (!found) throw new Error(`no ${code}`);
      return found;
    },
    ...overrides,
  };
}

describe("Reading a package archive", () => {
  it("reads the manifest and the layers the API wrote", () => {
    const read = readArchive(archive());
    expect(read.manifest.site_code).toBe("fall-creek");
    expect(read.layers.ground.features).toHaveLength(2);
    expect(read.layers.paths).toBeUndefined();
  });

  it("refuses an archive without its zones layer, or one that is not a zip", () => {
    const files: Record<string, unknown> = { "manifest.json": manifest, ...layerFiles() };
    delete files["layers/zones.json"];
    expect(() => readArchive(archive(files))).toThrow(/ground or zones/);
    expect(() => readArchive(strToU8("not a zip"))).toThrow(/not a readable archive/);
  });
});

describe("Making a hosted site ready offline", () => {
  it("keeps the package with the site's form and the project's inventory form", async () => {
    const bytes = archive();
    const parts: number[] = [];
    const stored = await preparePackage(PROJECT, await site(bytes), source(bytes), (part) =>
      parts.push(part),
    );
    expect(parts).toEqual([0, 1, 2, 3]);
    expect(stored.packageId).toBe(PACKAGE);
    expect(stored.forms.play["version"]).toBe("play-v1");
    // Found by what it asks, not its name: the notes form is a play-event form and is passed over.
    expect(stored.forms.inventory?.["version"]).toBe("inventory-v2");
  });

  it("refuses a download that does not match the digest the server recorded", async () => {
    const bytes = archive();
    const tampered = archive({ "manifest.json": { ...manifest, centre: [0, 0] }, ...layerFiles() });
    await expect(preparePackage(PROJECT, await site(bytes), source(tampered))).rejects.toThrow(
      PrepareError,
    );
  });

  it("refuses a site whose form is not published, and one with no package", async () => {
    const bytes = archive();
    const draft = source(bytes, {
      formVersion: async (code) => ({
        ...published(code, playDefinition, "play"),
        state: "draft",
        definition: { ...playDefinition, version: code, status: "draft" },
      }),
    });
    await expect(preparePackage(PROJECT, await site(bytes), draft)).rejects.toThrow(
      /not published/,
    );
    await expect(
      preparePackage(PROJECT, { ...(await site(bytes)), package: null }, source(bytes)),
    ).rejects.toThrow(/no map package/);
  });

  it("refuses a site whose form was retired, though its definition still reads as published", async () => {
    const bytes = archive();
    const retired = source(bytes, {
      formVersion: async (code) => ({
        ...published(code, playDefinition, "play"),
        state: "retired",
      }),
    });
    await expect(preparePackage(PROJECT, await site(bytes), retired)).rejects.toThrow(/retired/);
  });

  it("has no inventory form when the project publishes none", async () => {
    const bytes = archive();
    const stored = await preparePackage(
      PROJECT,
      await site(bytes),
      source(bytes, { forms: async () => [summaries[2] as FormSummary] }),
    );
    expect(stored.forms.inventory).toBeNull();
  });
});

describe("A hosted site on the field map", () => {
  it("draws the package's layers, keeps each zone's drawn shape and names its project and forms", async () => {
    const bytes = archive();
    const stored = await preparePackage(PROJECT, await site(bytes), source(bytes));
    const built = hostedSitePackage(stored, storedForms(stored));
    expect(built.projectId).toBe(PROJECT);
    expect(built.siteId).toBe("fall-creek");
    expect(built.formVersion).toBe("play-v1");
    expect(built.inventoryFormVersion).toBe("inventory-v2");
    expect(built.aerialAvailable).toBe(false);
    expect(built.layers.map((layer) => layer.id)).toEqual(["trees", "zones"]);
    expect(built.layers[0]?.day.type).toBe("circle");
    const zone = built.zones[0];
    expect(zone?.polygon).toBeDefined();
    // Inside the box but outside the triangle the zones layer draws.
    expect(zone && pointInZone([-76.491, 42.449], zone)).toBe(false);
    expect(zone && pointInZone([-76.499, 42.441], zone)).toBe(true);
    const ids = (built.bases.day.layers ?? []).map((layer) => layer.id);
    expect(ids).toContain("surface-grass");
  });

  it("keeps every part of a zone drawn as a MultiPolygon", async () => {
    const twoParts = {
      ...layers,
      zones: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { id: "A", label: "Zone A · Whole playground" },
            geometry: {
              type: "MultiPolygon",
              coordinates: [
                ring(-76.5, 42.44, -76.497, 42.443),
                ring(-76.493, 42.447, -76.49, 42.45),
              ],
            },
          },
        ],
      },
    };
    const files = {
      "manifest.json": manifest,
      ...Object.fromEntries(
        Object.entries(twoParts).map(([name, value]) => [`layers/${name}.json`, value]),
      ),
    };
    const bytes = archive(files);
    const stored = await preparePackage(PROJECT, await site(bytes), source(bytes));
    const zone = hostedSitePackage(stored, storedForms(stored)).zones[0];
    if (!zone) throw new Error("no zone");
    expect(pointInZone([-76.499, 42.441], zone)).toBe(true);
    // The second part counts as the zone, and the gap between the parts does not.
    expect(pointInZone([-76.491, 42.449], zone)).toBe(true);
    expect(pointInZone([-76.495, 42.445], zone)).toBe(false);
    expect(zoneFeature(zone).geometry.type).toBe("MultiPolygon");
    expect(zoneBounds(zone)).toEqual([-76.5, 42.44, -76.49, 42.45]);
  });
});
