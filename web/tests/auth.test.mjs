import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import { safeNext } from "../src/lib/auth/navigation.ts";
import { identitySchema } from "../src/lib/api/identity.ts";

for (const destination of [
	"https://evil.example",
	"//evil.example",
	"/\\evil.example",
	"/%2f%2fevil.example",
	"/%5cevil.example",
	"/sign-in",
	"/verify?email=private",
	null
]) {
	test(`redirects safely when next is ${destination}`, () => {
		// Given an untrusted destination; when parsed; then land on the workspace home.
		assert.equal(safeNext(destination), "/o");
	});
}
test("preserves an internal destination when it is valid", () => {
	assert.equal(safeNext("/account?tab=profile"), "/account?tab=profile");
});
test("rejects malformed identity data when the server response is incomplete", () => {
	assert.equal(
		identitySchema.safeParse({ profile: {}, organization_memberships: [], project_memberships: [] }).success,
		false
	);
});

function worker(fetchResponse = async () => new Response("fresh", { headers: { "Content-Type": "text/html" } })) {
	const listeners = new Map();
	const stored = new Map();
	const deleted = [];
	const cache = {
		put: async (request, response) => stored.set(typeof request === "string" ? request : request.url, response),
		match: async request => stored.get(typeof request === "string" ? request : request.url)
	};
	const source = readFileSync(new URL("../src/lib/pwa/service-worker.js", import.meta.url), "utf8").replace(
		"__FIELDMAPS_BUILD_ID__",
		"test-build"
	);
	vm.runInNewContext(source, {
		URL,
		Request,
		Response,
		fetch: fetchResponse,
		self: {
			location: { origin: "https://fieldmaps.test" },
			addEventListener: (name, handler) => listeners.set(name, handler),
			skipWaiting() {},
			clients: { claim: async () => {} }
		},
		caches: {
			open: async () => cache,
			match: cache.match,
			keys: async () => ["fieldmaps-shell-v1", "fieldmaps-public-old", "other-app"],
			delete: async key => deleted.push(key)
		}
	});
	return { listeners, stored, deleted };
}

test("preserves unrelated caches when a new worker activates", async () => {
	const { listeners, deleted } = worker();
	let completed;
	listeners.get("activate")({ waitUntil: promise => (completed = promise) });
	await completed;
	assert.deepEqual(deleted, ["fieldmaps-shell-v1", "fieldmaps-public-old"]);
});

for (const headers of [
	{ "Cache-Control": "private" },
	{ "Cache-Control": "no-store" },
	{ "Content-Type": "text/x-component" }
]) {
	test(`does not store unsafe shell response ${JSON.stringify(headers)}`, async () => {
		const { listeners, stored } = worker(async () => new Response("private", { headers }));
		let completed;
		listeners.get("install")({ waitUntil: promise => (completed = promise) });
		await completed;
		assert.equal(stored.size, 0);
	});
}

const excludedUrls = [
	"/account",
	"/o",
	"/o/example",
	"/verify",
	"/api/me",
	"/_next/data/build/page.json",
	"/?_rsc=private",
	"/icons/icon.png?private=1",
	"https://other.test/icons/icon.png"
];

test("never caches private URLs when the worker receives prewarm URLs", async () => {
	const { listeners, stored } = worker();
	let completed;
	listeners.get("message")({
		data: { type: "CACHE_URLS", urls: [...excludedUrls, "/", "/_next/static/public.js"] },
		waitUntil: promise => (completed = promise)
	});
	await completed;
	assert.deepEqual([...stored.keys()], ["https://fieldmaps.test/", "https://fieldmaps.test/_next/static/public.js"]);
});

for (const url of excludedUrls) {
	test(`does not intercept excluded request ${url}`, () => {
		const { listeners } = worker();
		listeners.get("fetch")({
			request: new Request(new URL(url, "https://fieldmaps.test")),
			respondWith: () => assert.fail("request intercepted")
		});
	});
}
for (const headers of [{ RSC: "1" }, { Authorization: "Bearer private" }]) {
	test(`does not intercept protected request headers ${JSON.stringify(headers)}`, () => {
		const { listeners } = worker();
		listeners.get("fetch")({
			request: new Request("https://fieldmaps.test/", { headers }),
			respondWith: () => assert.fail("request intercepted")
		});
	});
}

async function navigate(listeners, path = "/") {
	let response;
	let stored;
	listeners.get("fetch")({
		request: {
			url: new URL(path, "https://fieldmaps.test").href,
			method: "GET",
			mode: "navigate",
			headers: new Headers()
		},
		respondWith: promise => (response = promise),
		waitUntil: promise => (stored = promise)
	});
	const result = await response;
	await stored;
	return result;
}

test("returns fresh shell content when a cached shell exists", async () => {
	const { listeners, stored } = worker();
	stored.set("https://fieldmaps.test/", new Response("old"));
	assert.equal(await (await navigate(listeners)).text(), "fresh");
});

test("returns cached shell content when the network fails", async () => {
	const { listeners, stored } = worker(async () => {
		throw new TypeError("offline");
	});
	stored.set("https://fieldmaps.test/", new Response("offline shell"));
	assert.equal(await (await navigate(listeners)).text(), "offline shell");
});

test("returns cached shell content when the installed start URL opens offline", async () => {
	const { listeners, stored } = worker(async () => {
		throw new TypeError("offline");
	});
	stored.set("https://fieldmaps.test/", new Response("offline shell"));
	assert.equal(await (await navigate(listeners, "/o")).text(), "offline shell");
	assert.equal(stored.has("https://fieldmaps.test/o"), false);
});

test("does not store installed start URL responses", async () => {
	const { listeners, stored } = worker(
		async () => new Response("protected", { headers: { "Cache-Control": "private" } })
	);
	stored.set("https://fieldmaps.test/", new Response("offline shell"));
	assert.equal(await (await navigate(listeners, "/o")).text(), "protected");
	assert.equal(stored.has("https://fieldmaps.test/o"), false);
});

for (const response of [
	new Response("error", { status: 500 }),
	Response.redirect("https://fieldmaps.test/account"),
	new Response("redirected")
]) {
	test(`does not prewarm HTTP response ${response.status}`, async () => {
		if (response.status === 200) Object.defineProperty(response, "redirected", { value: true });
		const { listeners, stored } = worker(async () => response);
		let completed;
		listeners.get("message")({
			data: { type: "CACHE_URLS", urls: ["/"] },
			waitUntil: promise => (completed = promise)
		});
		await completed;
		assert.equal(stored.size, 0);
	});
}

test("the proxy refreshes the sign-in on invitation pages without protecting them", () => {
	const source = readFileSync(new URL("../src/proxy.ts", import.meta.url), "utf8");
	const matcher = source.slice(source.indexOf("matcher:"));
	assert.match(matcher, /"\/invite"/);
	assert.match(matcher, /"\/join"/);
	// Only the workspace and the account are behind sign-in; signed-out people can open invitations.
	assert.match(source, /const protectedRoute = \/\^\\\/\(o\|account\)\(\\\/\|\$\)\/\.test\(pathname\);/);
});
