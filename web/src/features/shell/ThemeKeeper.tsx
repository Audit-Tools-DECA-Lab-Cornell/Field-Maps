"use client";

import { useEffect } from "react";

import { THEME_STORAGE_KEY } from "@/lib/theme-script";

/**
 * Next renders an in-workspace 404 (a not-found below the root) in the browser, which renders <html> again
 * with the root layout's Day attribute and drops a stored Dusk and the platform the head script recorded.
 * This puts both back.
 */
export function ThemeKeeper() {
	useEffect(() => {
		const root = document.documentElement;
		if (!root.hasAttribute("data-platform")) {
			const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
			const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || "";
			root.setAttribute("data-platform", /mac|iphone|ipad/i.test(platform) ? "mac" : "other");
		}
		let stored: string | null = null;
		try {
			stored = localStorage.getItem(THEME_STORAGE_KEY);
		} catch {
			return;
		}
		const theme = stored === "dusk" ? "dusk" : "day";
		if (root.getAttribute("data-theme") === theme) return;
		root.setAttribute("data-theme", theme);
		root.style.colorScheme = theme === "dusk" ? "dark" : "light";
	}, []);
	return null;
}
