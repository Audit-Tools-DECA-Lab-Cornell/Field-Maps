import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const { buildWorkspaceIndex, unavailableWorkspace, UNNAMED_ORGANIZATION } = await load("lib/workspace/build.ts");

const ORG = "20000000-0000-4000-8000-000000000001";
const TRAINING_ORG = "10000000-0000-4000-8000-000000000101";

const me = {
	profile: {
		user_id: "30000000-0000-4000-8000-000000000001",
		created_at: "2026-10-01T00:00:00Z",
		display_name: "Janet Lee",
		locale: "en-US",
		observer_initials: null
	},
	organization_memberships: [{ organization_id: ORG, name: "DECA Lab", slug: "deca-lab", role: "owner" }],
	project_memberships: [
		{
			project_id: "40000000-0000-4000-8000-000000000001",
			organization_id: ORG,
			name: "Play Study",
			code: "play-study",
			is_training: false,
			role: "manager"
		},
		{
			project_id: "10000000-0000-4000-8000-000000000102",
			organization_id: TRAINING_ORG,
			name: "Training",
			code: "training",
			is_training: true,
			role: "observer"
		}
	]
};

const claims = { sub: me.profile.user_id, email: "janet@example.edu" };

test("the account is the profile's name and initials with the sign-in's email", () => {
	const index = buildWorkspaceIndex(me, claims);
	assert.equal(index.status, "ready");
	assert.deepEqual(index.account, {
		userId: me.profile.user_id,
		name: "Janet Lee",
		email: "janet@example.edu",
		initials: "JL"
	});
});

test("observer initials are the avatar when short enough", () => {
	const withCode = { ...me, profile: { ...me.profile, observer_initials: "JNL" } };
	assert.equal(buildWorkspaceIndex(withCode, claims).account.initials, "JNL");
});

test("without a display name the account reads as the email", () => {
	const unnamed = { ...me, profile: { ...me.profile, display_name: null } };
	const { account } = buildWorkspaceIndex(unnamed, claims);
	assert.equal(account.name, "janet@example.edu");
	assert.equal(account.initials, "J");
});

test("training projects are never listed", () => {
	const index = buildWorkspaceIndex(me, claims);
	assert.deepEqual(
		index.projects.map(project => project.code),
		["play-study"]
	);
	assert.equal(
		index.orgs.some(org => org.id === TRAINING_ORG),
		false
	);
});

test("projects carry their organization's web address and the reported role", () => {
	const [project] = buildWorkspaceIndex(me, claims).projects;
	assert.deepEqual(project, {
		id: "40000000-0000-4000-8000-000000000001",
		orgId: ORG,
		orgSlug: "deca-lab",
		code: "play-study",
		name: "Play Study",
		role: "manager"
	});
	assert.deepEqual(buildWorkspaceIndex(me, claims).orgs, [
		{ id: ORG, slug: "deca-lab", name: "DECA Lab", role: "owner" }
	]);
});

test("an organization reached only through a project is still listed, under its id, as a member", () => {
	const other = "20000000-0000-4000-8000-000000000009";
	const projectOnly = {
		...me,
		organization_memberships: [],
		project_memberships: [
			{
				project_id: "40000000-0000-4000-8000-000000000009",
				organization_id: other,
				name: "Field",
				code: "field",
				is_training: false,
				role: "observer"
			}
		]
	};
	const index = buildWorkspaceIndex(projectOnly, claims);
	assert.deepEqual(index.orgs, [{ id: other, slug: other, name: UNNAMED_ORGANIZATION, role: "member" }]);
	assert.equal(index.projects[0].orgSlug, other);
});

test("an unavailable workspace keeps who the sign-in says the person is", () => {
	const failure = { code: "storage_unavailable", kind: "retry", message: "…" };
	const index = unavailableWorkspace(failure, claims);
	assert.equal(index.status, "unavailable");
	assert.deepEqual(index.failure, failure);
	assert.deepEqual(index.orgs, []);
	assert.deepEqual(index.projects, []);
	assert.equal(index.account.name, "janet@example.edu");
	assert.equal(index.account.userId, claims.sub);
	assert.equal(unavailableWorkspace(failure, null).account.name, "Your account");
});
