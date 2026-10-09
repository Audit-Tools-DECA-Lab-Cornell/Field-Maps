import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const {
	changedFields,
	checkSettings,
	formOf,
	NAME_PROBLEM,
	normalised,
	patchOf,
	problemsOf,
	TIMEZONE_PROBLEM,
	zoneOptions
} = await load("features/project-settings/rules.ts");
const { patchSchema, settingsContextSchema, statusSchema } = await load("features/project-settings/schemas.ts");

const saved = { name: "Play study", description: "Janet's study", timezone: "America/New_York" };

test("a project with no description reads as an empty field", () => {
	assert.deepEqual(formOf({ name: "Play study", description: null, timezone: "UTC" }), {
		name: "Play study",
		description: "",
		timezone: "UTC"
	});
});

test("spaces around the values do not count as a change", () => {
	assert.deepEqual(changedFields(saved, { ...saved, name: "  Play study ", description: "Janet's study\n" }), []);
	assert.deepEqual(normalised({ name: " a ", description: " b ", timezone: " UTC " }), {
		name: "a",
		description: "b",
		timezone: "UTC"
	});
});

test("changed fields come back in form order", () => {
	assert.deepEqual(changedFields(saved, { name: "Other", description: "x", timezone: "UTC" }), [
		"name",
		"description",
		"timezone"
	]);
	assert.deepEqual(changedFields(saved, { ...saved, timezone: "Europe/London" }), ["timezone"]);
});

test("the patch carries only what changed", () => {
	assert.deepEqual(patchOf(saved, { ...saved, description: "New text " }), { description: "New text" });
	assert.deepEqual(patchOf(saved, { ...saved, name: "Renamed", timezone: "UTC" }), {
		name: "Renamed",
		timezone: "UTC"
	});
});

test("clearing the description sends null, which clears it", () => {
	assert.deepEqual(patchOf(saved, { ...saved, description: "   " }), { description: null });
	assert.deepEqual(patchOf({ ...saved, description: "" }, { ...saved, description: "" }), {});
});

test("an empty or overlong name, an unknown timezone and a huge description are refused", () => {
	assert.deepEqual(checkSettings(saved), {});
	assert.equal(checkSettings({ ...saved, name: "   " }).name, NAME_PROBLEM);
	assert.equal(checkSettings({ ...saved, name: "x".repeat(101) }).name, NAME_PROBLEM);
	assert.equal(checkSettings({ ...saved, name: "x".repeat(100) }).name, undefined);
	assert.equal(checkSettings({ ...saved, timezone: "Mars/Olympus_Mons" }).timezone, TIMEZONE_PROBLEM);
	assert.equal(checkSettings({ ...saved, timezone: "" }).timezone, TIMEZONE_PROBLEM);
	assert.equal(checkSettings({ ...saved, timezone: "Asia/Kolkata" }).timezone, undefined);
	assert.ok(checkSettings({ ...saved, description: "d".repeat(10_001) }).description);
	assert.equal(checkSettings({ ...saved, description: "d".repeat(10_000) }).description, undefined);
});

test("the API's field problems land on the form's fields; other ids are ignored", () => {
	assert.deepEqual(problemsOf({ timezone: "Use a valid IANA timezone", status: "x", "definition.0": "y" }), {
		timezone: "Use a valid IANA timezone"
	});
	assert.deepEqual(problemsOf({}), {});
});

test("the timezone list always offers the project's own zone", () => {
	assert.deepEqual(zoneOptions(["Europe/London", "UTC"], "UTC"), ["Europe/London", "UTC"]);
	assert.deepEqual(zoneOptions(["Europe/London", "UTC"], "US/Eastern"), ["US/Eastern", "Europe/London", "UTC"]);
});

test("the server action takes a change with at least one valid field and nothing else", () => {
	assert.equal(patchSchema.safeParse({ name: " Renamed " }).data.name, "Renamed");
	assert.equal(patchSchema.safeParse({ description: null }).success, true);
	assert.equal(patchSchema.safeParse({}).success, false);
	assert.equal(patchSchema.safeParse({ name: "" }).success, false);
	assert.equal(patchSchema.safeParse({ timezone: "Nowhere/Land" }).success, false);
	assert.equal(patchSchema.safeParse({ name: "ok", status: "archived" }).success, false);
});

test("a status is active or archived", () => {
	assert.equal(statusSchema.safeParse("archived").success, true);
	assert.equal(statusSchema.safeParse("active").success, true);
	assert.equal(statusSchema.safeParse("deleted").success, false);
});

test("the project a change is for must be an address and an id", () => {
	const id = "7d1a2c3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d";
	assert.equal(
		settingsContextSchema.safeParse({ org: "web-acceptance", project: "play-study", projectId: id }).success,
		true
	);
	assert.equal(
		settingsContextSchema.safeParse({ org: "web acceptance", project: "p", projectId: id }).success,
		false
	);
});
