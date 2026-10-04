import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, errorCopy, parseApiError, readApiError } from "../src/lib/api/errors.ts";

for (const [code, message] of Object.entries(errorCopy)) {
	test(`maps ${code} to safe copy`, () => {
		const error = parseApiError(400, { error: { code, message: "sensitive server text", details: {} } });
		assert.ok(error instanceof ApiError);
		assert.equal(error.code, code);
		assert.equal(error.message, message);
		assert.ok(!error.message.includes("sensitive"));
	});
}

for (const [code, kind] of [
	["role_required", "rejected"],
	["conflict", "rejected"],
	["rate_limited", "retry"],
	["unauthenticated", "sign-in"]
]) {
	test(`classifies ${code} from the envelope`, () => {
		assert.equal(parseApiError(400, { error: { code, message: "ignored", details: {} } }).kind, kind);
	});
}

for (const body of [
	null,
	[],
	{ detail: "legacy error" },
	{ error: { code: "future_code", message: "private", details: {} } },
	{ error: { code: "conflict", message: 3, details: {} } }
]) {
	test(`handles malformed envelope ${JSON.stringify(body)}`, () => {
		const error = parseApiError(400, body);
		assert.equal(error.code, "unknown");
		assert.equal(error.kind, "retry");
	});
}

test("keeps authentication and server failures actionable without JSON", async () => {
	assert.equal((await readApiError(new Response("<html>proxy</html>", { status: 401 }))).kind, "sign-in");
	assert.equal((await readApiError(new Response("<html>proxy</html>", { status: 503 }))).kind, "retry");
	assert.equal((await readApiError(new Response("not JSON", { status: 400 }))).code, "unknown");
});

test("retains recognized codes on auth and server responses", () => {
	assert.equal(
		parseApiError(401, { error: { code: "unauthenticated", message: "ignored", details: {} } }).code,
		"unauthenticated"
	);
	assert.equal(parseApiError(500, { error: { code: "internal", message: "ignored", details: {} } }).code, "internal");
});

test("maps an HTML 200 body to a retry error instead of leaking a JSON parse exception", async () => {
	const { apiRequestError } = await import("../src/lib/api/errors.ts");
	const response = new Response("<html>upstream unavailable</html>", {
		status: 200,
		headers: { "content-type": "text/html" }
	});
	const error = await response.json().catch(apiRequestError);
	assert.equal(error.code, "unknown");
	assert.equal(error.kind, "retry");
	assert.doesNotMatch(error.message, /upstream unavailable|Unexpected token/);
});
