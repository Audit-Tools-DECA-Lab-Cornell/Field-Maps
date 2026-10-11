const CACHE_PREFIX = "decamark-public-";
// Caches written before the product was renamed from FieldMaps to DECA Mark.
const LEGACY_CACHE = "fieldmaps-shell-v1";
const LEGACY_PREFIX = "fieldmaps-public-";
const CACHE_NAME = CACHE_PREFIX + "__DECAMARK_BUILD_ID__";
const LANDING_URL = "/";

function cacheable(url) {
	if (typeof url !== "string") return false;
	const parsed = new URL(url, self.location.origin);
	return (
		parsed.origin === self.location.origin &&
		!parsed.search &&
		(parsed.pathname === "/" ||
			parsed.pathname.startsWith("/icons/") ||
			parsed.pathname.startsWith("/_next/static/"))
	);
}

function installStartUrl(url) {
	if (typeof url !== "string") return false;
	const parsed = new URL(url, self.location.origin);
	return parsed.origin === self.location.origin && !parsed.search && parsed.pathname === "/o";
}

function safeResponse(response) {
	return (
		response.ok &&
		!response.redirected &&
		(response.type === "basic" || response.type === "default") &&
		(!response.url || cacheable(response.url)) &&
		!/(?:^|,)\s*(?:private|no-store)\b/i.test(response.headers.get("Cache-Control") || "") &&
		!response.headers.get("Content-Type")?.toLowerCase().includes("text/x-component")
	);
}

async function store(request, response) {
	if (!safeResponse(response)) return;
	const cache = await caches.open(CACHE_NAME);
	await cache.put(request, response.clone());
}

async function prewarm(url) {
	try {
		const request = new Request(new URL(url, self.location.origin), { credentials: "omit" });
		await store(request, await fetch(request));
	} catch {
		// Offline prewarming must not prevent worker installation.
	}
}

self.addEventListener("install", event => {
	event.waitUntil(prewarm("/"));
	self.skipWaiting();
});

self.addEventListener("activate", event => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter(
						key =>
							(key === LEGACY_CACHE || key.startsWith(LEGACY_PREFIX) || key.startsWith(CACHE_PREFIX)) &&
							key !== CACHE_NAME
					)
					.map(key => caches.delete(key))
			);
			await self.clients.claim();
		})()
	);
});

self.addEventListener("message", event => {
	if (event.data?.type !== "CACHE_URLS" || !Array.isArray(event.data.urls)) return;
	event.waitUntil(Promise.all(event.data.urls.filter(cacheable).map(prewarm)));
});

self.addEventListener("fetch", event => {
	const request = event.request;
	if (request.method !== "GET" || request.headers.has("RSC") || request.headers.has("Authorization")) return;
	const requestCacheable = cacheable(request.url);
	const startUrlNavigation = request.mode === "navigate" && installStartUrl(request.url);
	if (!requestCacheable && !startUrlNavigation) return;
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			if (request.mode !== "navigate") {
				const cached = await cache.match(request);
				if (cached) return cached;
			}
			let response;
			try {
				response = await fetch(request);
			} catch {
				const fallback =
					startUrlNavigation && (await cache.match(new Request(new URL(LANDING_URL, self.location.origin))));
				return fallback || (await cache.match(request)) || Response.error();
			}
			if (requestCacheable) event.waitUntil(store(request, response));
			return response;
		})()
	);
});
