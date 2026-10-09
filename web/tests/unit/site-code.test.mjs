import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const { SITE_CODE_PATTERN, siteCodeFrom, siteCodeProblem, siteDescriptionProblem, siteNameProblem } =
	await load("features/sites/code.ts");

test("a name suggests a lowercase, dashed code", () => {
	assert.equal(siteCodeFrom("Fall Creek Playground"), "fall-creek-playground");
	assert.equal(siteCodeFrom("  Riverside   Park!  "), "riverside-park");
	assert.equal(siteCodeFrom("E2E site 1009-125632"), "e2e-site-1009-125632");
	assert.equal(siteCodeFrom("Café Léon"), "cafe-leon");
});

test("a suggested code is at most 40 characters and never ends in a dash", () => {
	const code = siteCodeFrom("A very long name for a playground that goes on and on for far too long");
	assert.ok(code.length <= 40, code);
	assert.ok(!code.endsWith("-"), code);
	assert.match(code, SITE_CODE_PATTERN);
});

test("a name with nothing to build a code from suggests an empty code, which is then refused", () => {
	assert.equal(siteCodeFrom("!!!"), "");
	assert.match(siteCodeProblem(""), /Enter a code/);
});

test("codes follow the API's pattern: 3 to 40 lowercase letters, numbers or dashes", () => {
	for (const good of ["abc", "fall-creek", "a1b", "x".repeat(40)]) assert.equal(siteCodeProblem(good), null, good);
	for (const bad of ["ab", "Ab1", "-ab", "ab-", "a b c", "x".repeat(41), "fall_creek"])
		assert.match(siteCodeProblem(bad) ?? "", /3 to 40 lowercase/, bad);
});

test("names and descriptions have limits", () => {
	assert.match(siteNameProblem("   "), /Enter a name/);
	assert.equal(siteNameProblem("Riverside"), null);
	assert.match(siteNameProblem("x".repeat(101)), /100 characters/);
	assert.equal(siteDescriptionProblem(""), null);
	assert.match(siteDescriptionProblem("x".repeat(2001)), /2000 characters/);
});
