// Theme definitions. Each theme sets CSS variables via a [data-theme] block in
// globals.css; this file is the source of truth for the switcher UI and the
// theme-matched Leaflet basemap.

export type ThemeName = "petrol" | "midnight" | "espresso" | "light";

export interface ThemeDef {
	name: ThemeName;
	label: string;
	blurb: string;
	dark: boolean;
	swatchBg: string;
	swatchAccent: string;
}

export const THEMES: ThemeDef[] = [
	{
		name: "petrol",
		label: "Petrol",
		blurb: "Deep teal",
		dark: true,
		swatchBg: "#0f1f25",
		swatchAccent: "#2dd4bf"
	},
	{
		name: "midnight",
		label: "Midnight",
		blurb: "Dark navy",
		dark: true,
		swatchBg: "#121b30",
		swatchAccent: "#6d8cf5"
	},
	{
		name: "espresso",
		label: "Espresso",
		blurb: "Warm earth",
		dark: true,
		swatchBg: "#1f1813",
		swatchAccent: "#d2914f"
	},
	{
		name: "light",
		label: "Daylight",
		blurb: "Light slate",
		dark: false,
		swatchBg: "#ffffff",
		swatchAccent: "#0e7490"
	}
];

export const DEFAULT_THEME: ThemeName = "petrol";

/** Accent as a concrete hex — for Leaflet path styling, which can't read CSS vars. */
export const ACCENT_HEX: Record<ThemeName, string> = {
	petrol: "#2dd4bf",
	midnight: "#6d8cf5",
	espresso: "#d2914f",
	light: "#0e7490"
};

export interface BasemapDef {
	url: string;
	attribution: string;
	subdomains: string;
}

const CARTO_DARK: BasemapDef = {
	url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
	subdomains: "abcd",
	attribution:
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
};

const OSM: BasemapDef = {
	url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
	subdomains: "abc",
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
};

export const BASEMAPS: Record<ThemeName, BasemapDef> = {
	petrol: CARTO_DARK,
	midnight: CARTO_DARK,
	espresso: CARTO_DARK,
	light: OSM
};
