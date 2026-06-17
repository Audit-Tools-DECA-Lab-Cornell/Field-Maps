"use client";

import { useEffect } from "react";

import { useOperationsStore } from "@/state/useOperationsStore";

/** Applies the active theme to <html data-theme>. */
export function ThemeController() {
	const theme = useOperationsStore(s => s.theme);
	useEffect(() => {
		document.documentElement.dataset.theme = theme;
	}, [theme]);
	return null;
}
