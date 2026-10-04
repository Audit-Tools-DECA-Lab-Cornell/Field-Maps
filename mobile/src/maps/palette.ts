import { useSyncExternalStore } from "react";
import { z } from "zod";
import contractData from "../../../contracts/map-palettes.json";

/**
 * The map canvas's own palette, separate from the Nocturne chrome. Both the collector
 * (MapLibre) and the web workspace (Leaflet) read `contracts/map-palettes.json`, so a site
 * looks the same to the observer and the manager — see that file's `$comment`. Aerial imagery
 * is a drone photo and has no palette; `"aerial"` is a third {@link MapBase} value with no entry
 * under `palettes`.
 */

const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, "expected a hex colour");

const fillEdge = z.strictObject({ fill: hexColor, edge: hexColor });

const paletteSchema = z.strictObject({
  label: z.string().min(1),
  description: z.string().min(1),
  tiles: z.enum(["light", "dark"]),
  background: hexColor,
  site: fillEdge,
  structure: fillEdge,
  surfaces: z.strictObject({
    dirt: fillEdge,
    path: fillEdge,
    blacktop: fillEdge,
    mulch: fillEdge,
    grass: fillEdge,
  }),
  equipment: fillEdge,
  tree: z.strictObject({ fill: hexColor, edge: hexColor, opacity: z.number().min(0).max(1) }),
  path: z.strictObject({ line: hexColor }),
  zone: z.strictObject({
    fill: hexColor,
    fillOpacity: z.number().min(0).max(1),
    edge: hexColor,
    label: hexColor,
  }),
  /** The pill behind a zone's name on the plan: a light pill in Day, a dark one in Night. */
  zoneLabel: z.strictObject({ fill: hexColor, text: hexColor }),
  observation: z.strictObject({ fill: hexColor, ring: hexColor, selected: hexColor }),
});

const PALETTE_KEYS = ["day", "night"] as const;

/** Sorted, recursively-flattened key paths — used to confirm both palettes shape identically. */
function keyPaths(value: unknown, prefix = ""): readonly string[] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return [prefix];
  return Object.keys(value)
    .sort()
    .flatMap((key) => keyPaths((value as Record<string, unknown>)[key], `${prefix}.${key}`));
}

const contractSchema = z
  .strictObject({
    $comment: z.string(),
    version: z.number().int().positive(),
    default: z.enum(PALETTE_KEYS),
    order: z.array(z.enum(PALETTE_KEYS)).min(1),
    palettes: z.strictObject({ day: paletteSchema, night: paletteSchema }),
  })
  .refine((value) => value.order.includes(value.default), {
    message: "default palette must be listed in order",
    path: ["default"],
  })
  .refine(
    (value) =>
      keyPaths(value.palettes.day).join("\n") === keyPaths(value.palettes.night).join("\n"),
    { message: "day and night palettes must share identical keys", path: ["palettes"] },
  );

const contract = contractSchema.parse(contractData);

export type MapPaletteKey = (typeof PALETTE_KEYS)[number];
export type MapPalette = z.infer<typeof paletteSchema>;
/** The three bases the field map can show. `"aerial"` is the drone photo, not a palette. */
export type MapBase = MapPaletteKey | "aerial";

export const mapPalettes: Readonly<Record<MapPaletteKey, MapPalette>> = contract.palettes;
export const paletteOrder: readonly MapPaletteKey[] = contract.order;
export const DEFAULT_BASE: MapBase = contract.default;

/** Appends an alpha channel to a 6-digit hex colour. MapLibre fill-color needs rgba or 8-digit hex. */
export function hexWithAlpha(hex: string, opacity: number): string {
  const alpha = Math.round(Math.min(Math.max(opacity, 0), 1) * 255);
  return `${hex}${alpha.toString(16).padStart(2, "0")}`;
}

/**
 * The observer's chosen base, held in module-level memory only. It survives navigating between
 * screens and packages during the app session, because this module stays loaded for the life of
 * the app — but it resets to {@link DEFAULT_BASE} on a cold start. Persisting the choice across
 * restarts (e.g. to SecureStore or a settings table) is out of scope here.
 */
let currentBase: MapBase = DEFAULT_BASE;
const listeners = new Set<() => void>();

export function setMapBase(base: MapBase): void {
  if (base === currentBase) return;
  currentBase = base;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): MapBase {
  return currentBase;
}

export function useMapBase(): MapBase {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
