import { describe, expect, it } from "vitest";
import { DEFAULT_BASE, type MapPalette, mapPalettes, paletteOrder } from "./palette";

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Every colour field the contract defines, read explicitly rather than by key name: `label`
 * means a palette name ("Day") at the top level but a text colour under `zone`, so a generic
 * walk of the object would misclassify one of them. */
function colorFields(palette: MapPalette): readonly string[] {
  return [
    palette.background,
    palette.site.fill,
    palette.site.edge,
    palette.structure.fill,
    palette.structure.edge,
    palette.surfaces.dirt.fill,
    palette.surfaces.dirt.edge,
    palette.surfaces.path.fill,
    palette.surfaces.path.edge,
    palette.surfaces.blacktop.fill,
    palette.surfaces.blacktop.edge,
    palette.surfaces.mulch.fill,
    palette.surfaces.mulch.edge,
    palette.surfaces.grass.fill,
    palette.surfaces.grass.edge,
    palette.equipment.fill,
    palette.equipment.edge,
    palette.tree.fill,
    palette.tree.edge,
    palette.path.line,
    palette.zone.fill,
    palette.zone.edge,
    palette.zone.label,
    palette.observation.fill,
    palette.observation.ring,
    palette.observation.selected,
  ];
}

/** Sorted, recursively-flattened key paths, so two objects can be compared by shape alone. */
function keyPaths(value: unknown, prefix = ""): readonly string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [prefix];
  return Object.keys(value)
    .sort()
    .flatMap((key) => keyPaths((value as Record<string, unknown>)[key], `${prefix}.${key}`));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const stripped = hex.replace("#", "");
  const full = stripped.length === 3 ? stripped.replace(/./g, (c) => c + c) : stripped;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

/** WCAG relative luminance: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance */
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [R, G, B] = [r, g, b].map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (R ?? 0) + 0.7152 * (G ?? 0) + 0.0722 * (B ?? 0);
}

/** WCAG contrast ratio: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio */
function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}

describe("Map palette contract (contracts/map-palettes.json)", () => {
  it("gives day and night the same keys, so neither can drift out of shape with the other", () => {
    expect(keyPaths(mapPalettes.day)).toEqual(keyPaths(mapPalettes.night));
  });

  it("gives every colour as a valid hex value", () => {
    for (const key of ["day", "night"] as const) {
      for (const value of colorFields(mapPalettes[key])) {
        expect(value).toMatch(HEX_PATTERN);
      }
    }
  });

  it("lists the default palette inside the declared order", () => {
    expect(paletteOrder).toContain(DEFAULT_BASE);
  });

  it("gives every ground surface a different day and night fill — the regression this fixes", () => {
    // Before this change, dirt was #2c2a22 on a #1b1d2b ground in every mode: nearly black on
    // nearly black. The plan bases read these fills, so day must differ from night for each one.
    for (const surface of ["dirt", "path", "blacktop", "mulch", "grass"] as const) {
      expect(mapPalettes.day.surfaces[surface].fill).not.toEqual(
        mapPalettes.night.surfaces[surface].fill,
      );
    }
  });

  it("keeps the day observation marker readable against the day canvas (WCAG AA, >= 4.5:1)", () => {
    const ratio = contrastRatio(mapPalettes.day.observation.fill, mapPalettes.day.background);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
