import { z } from "zod";

import type { ThemeName } from "@/lib/contour";

import mapPalettesContract from "../../../contracts/map-palettes.json";

/**
 * The map canvas's own palette, separate from the Contour chrome around it. `contracts/map-palettes.json`
 * is the single source for this: the mobile collector reads the same file, so a site looks the same to
 * the observer and the manager regardless of which app drew it.
 *
 * The site plan (`components/map/SitePlan`) and the remaining Leaflet screens hand these colours to SVG
 * attributes and path options in JavaScript, so map colour stays literal hex from here on down, never a
 * Contour token. This module holds no React state, so server components can read the palettes too; the
 * reader's choice lives in `map-palette-store.ts`.
 */

const swatchSchema = z.object({ fill: z.string(), edge: z.string() });

const surfaceSchema = z.object({
	dirt: swatchSchema,
	path: swatchSchema,
	blacktop: swatchSchema,
	mulch: swatchSchema,
	grass: swatchSchema
});

const treeSchema = z.object({ fill: z.string(), edge: z.string(), opacity: z.number() });

const zoneSchema = z.object({
	fill: z.string(),
	fillOpacity: z.number(),
	edge: z.string(),
	label: z.string()
});

/** The pill behind a zone's name on the plan: a light pill in Day, a dark one in Night. */
const zoneLabelSchema = z.object({ fill: z.string(), text: z.string() });

const observationSchema = z.object({ fill: z.string(), ring: z.string(), selected: z.string() });

const paletteSchema = z.object({
	label: z.string(),
	description: z.string(),
	tiles: z.enum(["light", "dark"]),
	background: z.string(),
	site: swatchSchema,
	structure: swatchSchema,
	surfaces: surfaceSchema,
	equipment: swatchSchema,
	tree: treeSchema,
	path: z.object({ line: z.string() }),
	zone: zoneSchema,
	zoneLabel: zoneLabelSchema,
	observation: observationSchema
});

const contractSchema = z.object({
	version: z.number(),
	default: z.enum(["day", "night"]),
	order: z.array(z.enum(["day", "night"])),
	palettes: z.object({ day: paletteSchema, night: paletteSchema })
});

const CONTRACT = contractSchema.parse(mapPalettesContract);

export type MapPaletteName = "day" | "night";
export type MapPalette = z.infer<typeof paletteSchema>;
export type ObservationPalette = MapPalette["observation"];

/** The two palettes, keyed by name. Every key is present in both — the contract guarantees it. */
export const MAP_PALETTES: Record<MapPaletteName, MapPalette> = CONTRACT.palettes;

/** Display order for anything that lists both palettes, e.g. the switch. */
export const MAP_PALETTE_ORDER: readonly MapPaletteName[] = CONTRACT.order;

export const DEFAULT_PALETTE: MapPaletteName = CONTRACT.default;

/**
 * The Contour theme for chrome drawn over a map: the overlay label, the zoom and Layers buttons, the scale
 * chip and a marker's focus ring. It follows the palette, not the screen: Day chrome over a light palette,
 * Dusk chrome over a dark one (System 3 draws the Night plan's label dark on a Day page).
 */
export function mapChromeTheme(name: MapPaletteName): ThemeName {
	return MAP_PALETTES[name].tiles === "dark" ? "dusk" : "day";
}

export type TileConfig = {
	readonly url: string;
	readonly subdomains: string;
	readonly attribution: string;
};

const ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** CARTO basemap tiles, one per `tiles` value a palette can name. */
export const MAP_TILES: Record<MapPalette["tiles"], TileConfig> = {
	light: {
		url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
		subdomains: "abcd",
		attribution: ATTRIBUTION
	},
	dark: {
		url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
		subdomains: "abcd",
		attribution: ATTRIBUTION
	}
};

export { setMapPalette, useMapPalette } from "./map-palette-store";
