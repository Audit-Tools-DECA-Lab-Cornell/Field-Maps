"use client";

import { useEffect } from "react";

import { PLACE_COOKIE } from "./navigation";

const ONE_YEAR = 60 * 60 * 24 * 365;

function currentPlace(): string | null {
	for (const part of document.cookie.split(";")) {
		const [name, ...value] = part.trim().split("=");
		if (name !== PLACE_COOKIE) continue;
		try {
			return decodeURIComponent(value.join("="));
		} catch {
			return null;
		}
	}
	return null;
}

/**
 * Remembers the project on screen, so opening DECA Mark again (`/o`) goes back to it. Only the path is
 * kept, for a year, and only on this browser; `/o` checks the person still belongs there before using it.
 */
export function RememberPlace({ path }: { path: string }) {
	useEffect(() => {
		if (currentPlace() === path) return;
		const secure = window.location.protocol === "https:" ? "; Secure" : "";
		document.cookie = `${PLACE_COOKIE}=${encodeURIComponent(path)}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
	}, [path]);
	return null;
}
