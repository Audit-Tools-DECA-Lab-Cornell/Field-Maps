"use client";

import { useEffect, useState } from "react";

/**
 * Asks before leaving a page with unsaved changes (DESIGN §8, Settings). Closing or reloading the tab gets
 * the browser's own question; following a link inside the workspace (a tab, a breadcrumb, a card) is held
 * and its address returned as `leavingTo`, so the page can ask in its own words and then go or stay.
 */
export function useLeaveGuard(dirty: boolean): { leavingTo: string | null; stay: () => void } {
	const [leavingTo, setLeavingTo] = useState<string | null>(null);

	useEffect(() => {
		if (!dirty) return;

		function onBeforeUnload(event: BeforeUnloadEvent) {
			event.preventDefault();
			// Older browsers need a value here to show their question.
			event.returnValue = "";
		}

		function onClick(event: MouseEvent) {
			if (event.defaultPrevented || event.button !== 0) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
			const anchor = (event.target as Element | null)?.closest?.("a[href]");
			if (!(anchor instanceof HTMLAnchorElement)) return;
			if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
			const url = new URL(anchor.href, window.location.href);
			// Another site is a full page load, which the browser's own question covers.
			if (url.origin !== window.location.origin) return;
			// A link to a place on this page (#coverage) does not leave it.
			if (url.pathname === window.location.pathname && url.search === window.location.search) return;
			event.preventDefault();
			event.stopPropagation();
			setLeavingTo(`${url.pathname}${url.search}${url.hash}`);
		}

		window.addEventListener("beforeunload", onBeforeUnload);
		// Capture runs before the router's own link handler, so the navigation can be held.
		document.addEventListener("click", onClick, true);
		return () => {
			window.removeEventListener("beforeunload", onBeforeUnload);
			document.removeEventListener("click", onClick, true);
		};
	}, [dirty]);

	return { leavingTo, stay: () => setLeavingTo(null) };
}
