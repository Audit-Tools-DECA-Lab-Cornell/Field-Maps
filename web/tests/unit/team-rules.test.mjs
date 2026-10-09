import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const {
	checkInvitation,
	idSchema,
	isTeamRole,
	roleSchema,
	teamContextSchema,
	teamInvitations,
	teamMember,
	DAYS_PROBLEM,
	EMAIL_PROBLEM,
	USES_PROBLEM
} = await load("features/team/rules.ts");

const base = { role: "observer", email: null, maxUses: 25, expiresInDays: 7 };

test("a join code keeps the number of uses and the days it was asked for", () => {
	const result = checkInvitation(base);
	assert.equal(result.ok, true);
	assert.deepEqual(result.values, base);
});

test("an invitation for one address allows one use and reads the address in lower case", () => {
	const result = checkInvitation({ ...base, email: "  Janet@Example.TEST ", maxUses: 25 });
	assert.equal(result.ok, true);
	assert.equal(result.values.email, "janet@example.test");
	assert.equal(result.values.maxUses, 1);
});

test("an empty address means a join code, not an invitation for nobody", () => {
	const result = checkInvitation({ ...base, email: "   " });
	assert.equal(result.ok, true);
	assert.equal(result.values.email, null);
	assert.equal(result.values.maxUses, 25);
});

test("problems are keyed by the API's field ids", () => {
	const result = checkInvitation({ role: "observer", email: "no-at-sign", maxUses: 0, expiresInDays: 400 });
	assert.equal(result.ok, false);
	assert.deepEqual(result.fields, {
		email: EMAIL_PROBLEM,
		max_uses: USES_PROBLEM,
		expires_in_days: DAYS_PROBLEM
	});
});

test("uses and days must be whole numbers inside the API's limits", () => {
	assert.equal(checkInvitation({ ...base, maxUses: 10_000, expiresInDays: 365 }).ok, true);
	assert.equal(checkInvitation({ ...base, maxUses: 10_001 }).ok, false);
	assert.equal(checkInvitation({ ...base, maxUses: 1.5 }).ok, false);
	assert.equal(checkInvitation({ ...base, expiresInDays: 0 }).ok, false);
	assert.equal(checkInvitation({ ...base, expiresInDays: "7" }).ok, false);
});

test("only the three project roles can be invited", () => {
	assert.equal(checkInvitation({ ...base, role: "owner" }).ok, false);
	assert.equal(checkInvitation({ ...base, role: "member" }).ok, false);
	assert.deepEqual(["manager", "observer", "viewer", "admin", "member", ""].map(isTeamRole), [
		true,
		true,
		true,
		false,
		false,
		false
	]);
	assert.equal(roleSchema.safeParse("viewer").success, true);
	assert.equal(roleSchema.safeParse("owner").success, false);
});

test("the project a change is for must be an address and an id", () => {
	const id = "7d1a2c3e-4b5f-4a6b-8c7d-9e0f1a2b3c4d";
	assert.equal(
		teamContextSchema.safeParse({ org: "web-acceptance", project: "play-study", projectId: id }).success,
		true
	);
	assert.equal(teamContextSchema.safeParse({ org: "../x", project: "play-study", projectId: id }).success, false);
	assert.equal(teamContextSchema.safeParse({ org: "a", project: "b/c", projectId: id }).success, false);
	assert.equal(teamContextSchema.safeParse({ org: "a", project: "b", projectId: "nope" }).success, false);
	assert.equal(idSchema.safeParse("00000000-0000-0000-0000-000000000001").success, true);
});

test("a member keeps only what the team page shows", () => {
	const view = teamMember({
		user_id: "u1",
		organization_id: "o1",
		project_id: "p1",
		role: "viewer",
		granted_at: "2026-10-01T12:00:00Z"
	});
	assert.deepEqual(view, {
		user_id: "u1",
		role: "viewer",
		display_name: null,
		observer_initials: null,
		granted_at: "2026-10-01T12:00:00Z"
	});
});

test("invitations with an organization role are left out of a project's list", () => {
	const one = {
		id: "i1",
		organization_id: "o1",
		project_id: "p1",
		role: "observer",
		email: null,
		max_uses: 25,
		use_count: 2,
		expires_at: "2026-10-15T12:00:00Z",
		created_at: "2026-10-08T12:00:00Z",
		revoked_at: null
	};
	const views = teamInvitations([one, { ...one, id: "i2", role: "admin" }, { ...one, id: "i3", role: "manager" }]);
	assert.deepEqual(
		views.map(view => view.id),
		["i1", "i3"]
	);
	assert.equal("organization_id" in views[0], false);
	assert.equal(views[0].use_count, 2);
});
