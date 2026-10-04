const CACHE_NAME = "fieldmaps-shell-v1-contour-1";

function cacheable(url) {
	const parsed = new URL(url, self.location.origin);
	return (
		parsed.origin === self.location.origin &&
		!parsed.search &&
		(parsed.pathname === "/" ||
			parsed.pathname.startsWith("/icons/") ||
			parsed.pathname.startsWith("/_next/static/"))
	);
}

self.addEventListener("install", event => {
	event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.add("/")));
	self.skipWaiting();
});

self.addEventListener("activate", event => {
	event.waitUntil(
		caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
	);
	self.clients.claim();
});

self.addEventListener("message", event => {
	if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) return;
	const sameOriginUrls = event.data.urls.filter(url => cacheable(url));
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then(cache => Promise.all(sameOriginUrls.map(url => cache.add(url).catch(() => undefined))))
	);
});

self.addEventListener("fetch", event => {
	const requestUrl = new URL(event.request.url);
	if (event.request.method !== "GET" || !cacheable(requestUrl.href) || event.request.headers.has("RSC")) return;

	if (event.request.mode === "navigate") {
		event.respondWith(
			fetch(event.request)
				.then(response => {
					const copy = response.clone();
					caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
					return response;
				})
				.catch(async () => (await caches.match(event.request)) || (await caches.match("/")))
		);
		return;
	}

	event.respondWith(
		caches.match(event.request).then(cached => {
			if (cached) return cached;
			return fetch(event.request).then(response => {
				if (response.ok) {
					const copy = response.clone();
					caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
				}
				return response;
			});
		})
	);
});
