"use client";

import { useEffect } from "react";

export function PwaRegister() {
	useEffect(() => {
		if (!("serviceWorker" in navigator) || window.location.protocol !== "https:") return;
		navigator.serviceWorker
			.register("/sw.js")
			.then(async registration => {
				await navigator.serviceWorker.ready;
				const urls = [
					window.location.href,
					...performance
						.getEntriesByType("resource")
						.map(entry => entry.name)
						.filter(url => url.startsWith(window.location.origin))
				];
				registration.active?.postMessage({ type: "CACHE_URLS", urls: [...new Set(urls)] });
			})
			.catch(() => undefined);
	}, []);

	return null;
}
