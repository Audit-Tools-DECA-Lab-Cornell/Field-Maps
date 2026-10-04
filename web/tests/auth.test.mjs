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
		// Given an untrusted destination; when parsed; then remain in onboarding.
		assert.equal(safeNext(destination), "/onboarding");
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
test("never caches private pages when the service worker receives prewarm URLs", async () => {
	const listeners = new Map();
	const added = [];
	const context = {
		URL,
		self: {
			location: { origin: "https://fieldmaps.test" },
			addEventListener: (name, handler) => listeners.set(name, handler)
		},
		caches: { open: async () => ({ add: async url => added.push(url) }) }
	};
	vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), context);
	let completed;
	listeners.get("message")({
		data: {
			type: "CACHE_URLS",
			urls: ["/account", "/o/example", "/verify", "/api/me", "/?_rsc=private", "/", "/_next/static/public.js"]
		},
		waitUntil: promise => {
			completed = promise;
		}
	});
	await completed;
	assert.deepEqual(added, ["/", "/_next/static/public.js"]);
});
