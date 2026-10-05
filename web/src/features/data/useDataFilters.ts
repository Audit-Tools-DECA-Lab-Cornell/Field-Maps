"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useSyncExternalStore } from "react";

import { type DataFilters, readFilters, writeFilters } from "./filters";

/** The filter keys this page owns in the address. Anything else there (a preview parameter) is kept. */
const OWN_KEYS = ["zone", "round", "type", "q", "review", "sort", "record"];

/**
 * Data's filters, read from the address and written back in place with history.replaceState: no request to
 * the server, no new history entry per keystroke, and Next's useSearchParams follows the change. Needs a
 * Suspense boundary above it.
 */
export function useDataFilters(): [DataFilters, (next: DataFilters) => void] {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const filters = useMemo(() => readFilters(searchParams), [searchParams]);

	const setFilters = useCallback(
		(next: DataFilters) => {
			const own = new URLSearchParams(writeFilters(next));
			const current = new URLSearchParams(window.location.search);
			for (const [key, value] of current) if (!OWN_KEYS.includes(key)) own.append(key, value);
			const query = own.toString();
			window.history.replaceState(null, "", `${pathname}${query ? `?${query}` : ""}`);
		},
		[pathname]
	);

	return [filters, setFilters];
}

function subscribeToMedia(query: string) {
	return (onChange: () => void) => {
		const list = window.matchMedia(query);
		list.addEventListener("change", onChange);
		return () => list.removeEventListener("change", onChange);
	};
}

/** Whether a media query matches now. `serverValue` is what the server and the first client render assume. */
export function useMediaQuery(query: string, serverValue = true): boolean {
	const subscribe = useMemo(() => subscribeToMedia(query), [query]);
	return useSyncExternalStore(
		subscribe,
		() => window.matchMedia(query).matches,
		() => serverValue
	);
}
