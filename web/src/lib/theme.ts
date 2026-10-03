"use client";

import { useCallback, useSyncExternalStore } from "react";

import { DEFAULT_THEME, type ThemeName, THEMES } from "@/lib/contour";

/** Where this browser keeps the reader's screen theme. Day unless they chose Dusk. */
export const THEME_STORAGE_KEY = "fm-theme";

/**
 * Runs in <head> before first paint, so a Dusk reader never sees a Day flash. It also records the
 * platform, which decides whether shortcut hints read ⌘K or Ctrl K without a hydration mismatch.
 */
export const THEME_SCRIPT = `(function(){try{var d=document.documentElement;var t=null;try{t=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}var v=t==="dusk"?"dusk":"day";d.setAttribute("data-theme",v);d.style.colorScheme=v==="dusk"?"dark":"light";var p=(navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||navigator.userAgent||"";d.setAttribute("data-platform",/mac|iphone|ipad/i.test(p)?"mac":"other")}catch(e){}})();`;

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
