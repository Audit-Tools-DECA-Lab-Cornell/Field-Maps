"use client";

import { useCallback, useSyncExternalStore } from "react";

import { DEFAULT_THEME, type ThemeName, THEMES } from "@/lib/contour";
import { THEME_STORAGE_KEY } from "@/lib/theme-script";

export { THEME_STORAGE_KEY } from "@/lib/theme-script";

function readTheme(): ThemeName {
	const value = document.documentElement.getAttribute("data-theme");
	return THEMES.includes(value as ThemeName) ? (value as ThemeName) : DEFAULT_THEME;
}

function subscribe(onChange: () => void) {
	const observer = new MutationObserver(onChange);
	observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
	window.addEventListener("storage", onChange);
	return () => {
		observer.disconnect();
		window.removeEventListener("storage", onChange);
	};
}

/** The current screen theme and a setter that applies it at once and remembers it in this browser. */
export function useTheme(): [ThemeName, (next: ThemeName) => void] {
	const theme = useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
	const setTheme = useCallback((next: ThemeName) => {
		const root = document.documentElement;
		root.setAttribute("data-theme", next);
		root.style.colorScheme = next === "dusk" ? "dark" : "light";
		try {
			localStorage.setItem(THEME_STORAGE_KEY, next);
		} catch {
			// Private windows can refuse storage; the theme still applies for this visit.
		}
	}, []);
	return [theme, setTheme];
}
