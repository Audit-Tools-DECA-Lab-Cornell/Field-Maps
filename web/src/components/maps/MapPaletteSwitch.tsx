"use client";

import type { KeyboardEvent } from "react";

import { Glass } from "@/components/nocturne/chrome";
import { MAP_PALETTE_ORDER, MAP_PALETTES, type MapPaletteName, useMapPalette } from "@/lib/map-palette";

/** A glyph beside the word, never instead of it — the same vocabulary the collector's chips use. */
const GLYPH: Record<MapPaletteName, string> = {
	day: "☀",
	night: "☾"
};

/**
 * The map canvas's own palette switch: day for daylight and for reading QGIS drawings, night for
 * the Nocturne plan. It is a radiogroup, not two independent toggles — the map has exactly one
 * palette — and both Leaflet maps on a page read the same choice through `useMapPalette`, so
 * switching it here switches every map at once.
 */
export function MapPaletteSwitch() {
	const [palette, setPalette] = useMapPalette();

	function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
		event.preventDefault();
		const index = MAP_PALETTE_ORDER.indexOf(palette);
		const delta = event.key === "ArrowRight" ? 1 : -1;
		const next = MAP_PALETTE_ORDER.at((index + delta + MAP_PALETTE_ORDER.length) % MAP_PALETTE_ORDER.length);
		if (next !== undefined) setPalette(next);
	}

	return (
		<Glass className="p-[2px]">
			<div role="radiogroup" aria-label="Map style" onKeyDown={onKeyDown} className="flex items-center gap-hair">
				{MAP_PALETTE_ORDER.map(name => {
					const selected = palette === name;
					return (
						<button
							key={name}
							type="button"
							role="radio"
							aria-checked={selected}
							tabIndex={selected ? 0 : -1}
							onClick={() => setPalette(name)}
							className={`flex min-h-11 items-center gap-tight rounded-sm px-snug text-micro transition-colors duration-100 ${
								selected ? "bg-accent-800 text-accent-100" : "text-neutral-400 hover:bg-ink-tint"
							}`}>
							<span aria-hidden>{GLYPH[name]}</span>
							{MAP_PALETTES[name].label}
						</button>
					);
				})}
			</div>
		</Glass>
	);
}
