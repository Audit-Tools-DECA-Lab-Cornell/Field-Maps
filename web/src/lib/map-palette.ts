import { useSyncExternalStore } from "react";
import { z } from "zod";

import mapPalettesContract from "../../../contracts/map-palettes.json";

/**
 * The map canvas's own palette, separate from the Nocturne chrome around it. `contracts/map-palettes.json`
 * is the single source for this: the mobile collector reads the same file, so a site looks the same to
 * the observer and the manager regardless of which app drew it.
 *
 * Leaflet hands path options to canvas/SVG attributes in JavaScript, which cannot read a CSS custom
 * property — the reason `data/site-geometry.ts` already states for `PLAN_PAINT` — so map colour has to
 * stay literal hex from here on down, never a Nocturne token.
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

/* ── A tiny external store over localStorage ─────────────────────────────────
   Both maps on a page read this through `useMapPalette`, so switching the
   palette on one switches it on the other. `useSyncExternalStore` is what lets
   that happen without setting state inside an effect: the store itself is the
   source of truth, and React is told to re-render when it changes.
   ─────────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = "fieldmaps.map.palette";

type Listener = () => void;

const listeners = new Set<Listener>();
let current: MapPaletteName = DEFAULT_PALETTE;
let hydrated = false;

function isPaletteName(value: string | null): value is MapPaletteName {
	return value === "day" || value === "night";
}

function readStored(): MapPaletteName {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		return isPaletteName(stored) ? stored : DEFAULT_PALETTE;
	} catch {
		return DEFAULT_PALETTE;
	}
}

function emit() {
	for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * The client snapshot. Hydrating from `localStorage` here, on first read, rather than in an effect
 * keeps this a plain `useSyncExternalStore` read — React calls it again right after mount to check
 * for a change from the server snapshot, which is exactly where the stored choice first appears.
 */
function getSnapshot(): MapPaletteName {
	if (!hydrated) {
		hydrated = true;
		current = readStored();
	}
	return current;
}

/** The server — and the client's first paint, before hydration — always sees the contract default. */
function getServerSnapshot(): MapPaletteName {
	return DEFAULT_PALETTE;
}

export function setMapPalette(name: MapPaletteName): void {
	hydrated = true;
	current = name;
	try {
		window.localStorage.setItem(STORAGE_KEY, name);
	} catch {
		// Best-effort persistence: the choice still applies for every map on this page.
	}
	emit();
}

export function useMapPalette(): readonly [MapPaletteName, (name: MapPaletteName) => void] {
	const name = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	return [name, setMapPalette];
}
