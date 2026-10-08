"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { PAGE_TITLE_ID } from "@/components/contour/PageHeader";

/**
 * After a move to another page (not on the first load), focus goes to the new page's title, so a screen
 * reader starts there and Tab continues from the top of the content (DESIGN §11). Falls back to <main>.
 */
export function RouteFocus() {
	const pathname = usePathname();
	const previous = useRef(pathname);

	useEffect(() => {
		if (previous.current === pathname) return;
		previous.current = pathname;
		const target = document.getElementById(PAGE_TITLE_ID) ?? document.getElementById("main");
		target?.focus({ preventScroll: true });
		window.scrollTo({ top: 0 });
	}, [pathname]);

	return null;
}
