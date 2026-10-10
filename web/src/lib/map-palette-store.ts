"use client";

import { useSyncExternalStore } from "react";

import mapPalettesContract from "../../../contracts/map-palettes.json";

/* ── The reader's map palette, a tiny external store over localStorage ────────
   Every map on a page reads this through `useMapPalette`, so switching the
   palette on one switches it on the others. `useSyncExternalStore` is what lets
   that happen without setting state inside an effect: the store itself is the
   source of truth, and React is told to re-render when it changes.

   A client module of its own, so `map-palette.ts` (the palettes as data) stays
   readable from server components. It reads the contract's default directly
   rather than through `map-palette.ts`, which re-exports this file.
   ─────────────────────────────────────────────────────────────────────────── */

type PaletteName = "day" | "night";

const STORAGE_KEY = "decamark.map.palette";

function isPaletteName(value: string | null): value is PaletteName {
	return value === "day" || value === "night";
}

const DEFAULT: PaletteName = isPaletteName(mapPalettesContract.default) ? mapPalettesContract.default : "day";

type Listener = () => void;

const listeners = new Set<Listener>();
let current: PaletteName = DEFAULT;
let hydrated = false;

function readStored(): PaletteName {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		return isPaletteName(stored) ? stored : DEFAULT;
	} catch {
		return DEFAULT;
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
function getSnapshot(): PaletteName {
	if (!hydrated) {
		hydrated = true;
		current = readStored();
	}
	return current;
}

/** The server — and the client's first paint, before hydration — always sees the contract default. */
function getServerSnapshot(): PaletteName {
	return DEFAULT;
}

export function setMapPalette(name: PaletteName): void {
	hydrated = true;
	current = name;
	try {
		window.localStorage.setItem(STORAGE_KEY, name);
	} catch {
		// Best-effort persistence: the choice still applies for every map on this page.
	}
	emit();
}

export function useMapPalette(): readonly [PaletteName, (name: PaletteName) => void] {
	const name = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	return [name, setMapPalette];
}
