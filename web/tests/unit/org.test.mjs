import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const { ADDRESS_PATTERN, addressFromName, addressProblem, nameProblem } = await load("features/org/slug.ts");
const { orgTimeZone } = await load("features/org/timezone.ts");
const { countsFromSites, countsLine, listedProjects, projectLink, SITE_READ_LIMIT } = await load(
	"features/org/projects/rows.ts"
);
const { canManageMember, inviteChoices, roleChoices, sortMembers, transferCandidates } = await load(
	"features/org/members/rules.ts"
);
const { createProjectInput, fieldsOf, inviteInput, roleInput, saveOrganizationInput } =
	await load("features/org/schemas.ts");

const ORG = "10000000-0000-4000-8000-000000000001";
const USER = "20000000-0000-4000-8000-000000000002";

/* ── Project codes and web addresses ──────────────────────────────────────── */

test("a project code follows its name in lowercase with dashes", () => {
	assert.equal(addressFromName("Play Study"), "play-study");
	assert.equal(addressFromName("  Play   Study (2026)!  "), "play-study-2026");
	assert.equal(addressFromName("Café Évry – Östra"), "cafe-evry-ostra");
	assert.equal(addressFromName("---"), "");
});

test("a suggested code is cut to 40 characters without a trailing dash", () => {
	const long = addressFromName("Observations of children's play on the Fall Creek school playground and field");
	assert.ok(long.length <= 40);
	assert.ok(!long.endsWith("-"));
	assert.ok(ADDRESS_PATTERN.test(long));
});

test("the code and web address rules are the API's: 3 to 40 lowercase letters, numbers and dashes", () => {
	for (const good of ["abc", "play-study", "a1-b2", "x".repeat(40)]) {
		assert.equal(ADDRESS_PATTERN.test(good), true, good);
		assert.equal(addressProblem(good, "the code"), null, good);
	}
	assert.equal(addressProblem("", "the code"), "Enter the code.");
	assert.equal(addressProblem("ab", "the code"), "Use at least 3 characters for the code.");
	assert.equal(addressProblem("x".repeat(41), "the code"), "Use at most 40 characters for the code.");
	assert.equal(
		addressProblem("Play Study", "the code"),
		"Use only lowercase letters, numbers and dashes in the code."
	);
	assert.equal(addressProblem("-play", "the code"), "Start and end the code with a letter or number.");
	assert.equal(addressProblem("play-", "the code"), "Start and end the code with a letter or number.");
});

test("a name needs 1 to 100 characters after trimming", () => {
	assert.equal(nameProblem("  ", "a name"), "Enter a name.");
	assert.equal(nameProblem(" Play study ", "a name"), null);
	assert.equal(nameProblem("x".repeat(101), "a name"), "Use at most 100 characters for a name.");
});

/* ── Time zone ────────────────────────────────────────────────────────────── */

test("dates and a new project start on the first project's time zone, else New York", () => {
	assert.equal(orgTimeZone([]), "America/New_York");
	assert.equal(orgTimeZone([{ timezone: "Europe/Berlin" }, { timezone: "Asia/Tokyo" }]), "Europe/Berlin");
	assert.equal(orgTimeZone([{ timezone: "Not/AZone" }, { timezone: "Asia/Tokyo" }]), "Asia/Tokyo");
	assert.equal(orgTimeZone([{ timezone: "" }]), "America/New_York");
});

/* ── Project rows ─────────────────────────────────────────────────────────── */

const project = (name, extra = {}) => ({
	project_id: name,
	code: name.toLowerCase().replace(/\s+/g, "-"),
	name,
	description: null,
	role: "manager",
	status: "active",
	is_training: false,
	...extra
});

test("practice projects are left out; active ones come first, each group by name", () => {
	const list = listedProjects([
		project("Zebra"),
		project("Old study", { status: "archived" }),
		project("Practice", { is_training: true }),
		project("Apple")
	]);
	assert.deepEqual(
		list.map(item => item.name),
		["Apple", "Zebra", "Old study"]
	);
});

test("sorting does not change the list it was given", () => {
	const input = [project("B"), project("A")];
	listedProjects(input);
	assert.deepEqual(
		input.map(item => item.name),
		["B", "A"]
	);
});

test("a project's size is its site count and the sum of its sites' exact observation counts", () => {
	const counts = countsFromSites([{ observation_count: 26 }]);
	assert.deepEqual(counts, { state: "counted", sites: 1, observations: 26 });
	assert.equal(countsLine(counts), "1 site · 26 observations");
	assert.equal(
		countsLine(countsFromSites([{ observation_count: 1 }, { observation_count: 1203 }])),
		"2 sites · 1,204 observations"
	);
	assert.equal(countsLine(countsFromSites([])), "0 sites · 0 observations");
	assert.equal(countsLine(countsFromSites([{ observation_count: 1 }])), "1 site · 1 observation");
});

test("a project whose sites were not read never reads as zero", () => {
	assert.equal(countsLine({ state: "failed" }), "Sites and observations could not be counted.");
	assert.equal(countsLine({ state: "skipped" }), "Open the project to see its sites and observations.");
	assert.equal(SITE_READ_LIMIT, 12);
});

test("observers are sent to the collect page, everyone else to the project", () => {
	assert.equal(
		projectLink("web-acceptance", { code: "play-study", role: "manager" }),
		"/o/web-acceptance/p/play-study"
	);
	assert.equal(
		projectLink("web-acceptance", { code: "play-study", role: "viewer" }),
		"/o/web-acceptance/p/play-study"
	);
	assert.equal(projectLink("web-acceptance", { code: "play-study", role: "observer" }), "/o/web-acceptance/collect");
});

/* ── Members ──────────────────────────────────────────────────────────────── */

const member = (user_id, role, display_name = null) => ({ user_id, role, display_name });

test("only owners change roles, and only between Admin and Member", () => {
	assert.deepEqual(
		roleChoices("owner").map(option => option.value),
		["admin", "member"]
	);
	assert.deepEqual(roleChoices("admin"), []);
	assert.deepEqual(roleChoices("member"), []);
});

test("invitations carry Member, and Admin only when an owner sends them", () => {
	assert.deepEqual(
		inviteChoices("owner").map(option => option.value),
		["member", "admin"]
	);
	assert.deepEqual(
		inviteChoices("admin").map(option => option.value),
		["member"]
	);
});

test("owners manage anyone but themselves; admins remove plain members only", () => {
	assert.equal(canManageMember("owner", "me", member("you", "admin")), true);
	assert.equal(canManageMember("owner", "me", member("you", "owner")), true);
	assert.equal(canManageMember("owner", "me", member("me", "owner")), false);
	assert.equal(canManageMember("admin", "me", member("you", "member")), true);
	assert.equal(canManageMember("admin", "me", member("you", "admin")), false);
	assert.equal(canManageMember("admin", "me", member("you", "owner")), false);
	assert.equal(canManageMember("admin", "me", member("me", "member")), false);
	assert.equal(canManageMember("member", "me", member("you", "member")), false);
});

test("members list owners, then admins, then members, each in name order, unnamed last", () => {
	const sorted = sortMembers([
		member("1", "member", "Zoe"),
		member("2", "admin", "Local admin"),
		member("3", "member"),
		member("4", "owner", "Local owner"),
		member("5", "member", "Adam")
	]);
	assert.deepEqual(
		sorted.map(item => item.user_id),
		["4", "2", "5", "1", "3"]
	);
});

test("ownership can pass to any current admin or member except the signed-in owner", () => {
	const list = [member("me", "owner"), member("a", "admin"), member("b", "member"), member("c", "owner")];
	assert.deepEqual(
		transferCandidates(list, "me").map(item => item.user_id),
		["a", "b"]
	);
});

/* ── What the actions accept ──────────────────────────────────────────────── */

test("create project accepts a name, a code and a known time zone", () => {
	const ok = {
		orgId: ORG,
		orgSlug: "web-acceptance",
		name: "  Play study ",
		code: "play-study",
		timezone: "America/New_York"
	};
	assert.equal(createProjectInput.safeParse(ok).data.name, "Play study");
	const bad = createProjectInput.safeParse({ ...ok, code: "Play Study", timezone: "Mars/Olympus" });
	assert.equal(bad.success, false);
	assert.deepEqual(Object.keys(fieldsOf(bad.error)).sort(), ["code", "timezone"]);
});

test("a role change can make an admin or a member, never an owner", () => {
	assert.equal(roleInput.safeParse({ orgId: ORG, userId: USER, role: "admin" }).success, true);
	assert.equal(roleInput.safeParse({ orgId: ORG, userId: USER, role: "member" }).success, true);
	assert.equal(roleInput.safeParse({ orgId: ORG, userId: USER, role: "owner" }).success, false);
});

test("an invitation is for an admin or member, with an optional email, 1 to 10,000 uses and 1 to 365 days", () => {
	const ok = { orgId: ORG, role: "member", email: null, maxUses: 25, expiresInDays: 7 };
	assert.equal(inviteInput.safeParse(ok).success, true);
	assert.equal(inviteInput.safeParse({ ...ok, email: "a@b.org" }).success, true);
	assert.equal(inviteInput.safeParse({ ...ok, role: "owner" }).success, false);
	assert.equal(inviteInput.safeParse({ ...ok, email: "not an email" }).success, false);
	assert.equal(inviteInput.safeParse({ ...ok, maxUses: 0 }).success, false);
	assert.equal(inviteInput.safeParse({ ...ok, expiresInDays: 366 }).success, false);
	assert.equal(inviteInput.safeParse({ ...ok, maxUses: 1.5 }).success, false);
});

test("saving the organization needs a change to the name or the web address", () => {
	const base = { orgId: ORG, currentSlug: "web-acceptance" };
	assert.equal(saveOrganizationInput.safeParse(base).success, false);
	assert.equal(saveOrganizationInput.safeParse({ ...base, name: "Web acceptance lab" }).success, true);
	assert.equal(saveOrganizationInput.safeParse({ ...base, slug: "new-address" }).success, true);
	assert.equal(saveOrganizationInput.safeParse({ ...base, slug: "New Address" }).success, false);
});
