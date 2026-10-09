import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const { orgAbilities, projectAbilities } = await load("lib/workspace/access.ts");

test("a project manager reads and manages", () => {
	assert.deepEqual(projectAbilities("manager"), { read: true, manage: true, collectOnly: false });
});

test("a viewer reads but does not manage", () => {
	assert.deepEqual(projectAbilities("viewer"), { read: true, manage: false, collectOnly: false });
});

test("an observer is sent to collect, not into the workspace", () => {
	assert.deepEqual(projectAbilities("observer"), { read: false, manage: false, collectOnly: true });
});

test("no project role grants nothing", () => {
	assert.deepEqual(projectAbilities(null), { read: false, manage: false, collectOnly: false });
});

test("an organization owner manages, manages owners and creates projects", () => {
	assert.deepEqual(orgAbilities("owner"), { manage: true, manageOwners: true, createProject: true });
});

test("an organization admin manages and creates projects but cannot change owners", () => {
	assert.deepEqual(orgAbilities("admin"), { manage: true, manageOwners: false, createProject: true });
});

test("an organization member and no role manage nothing", () => {
	const none = { manage: false, manageOwners: false, createProject: false };
	assert.deepEqual(orgAbilities("member"), none);
	assert.deepEqual(orgAbilities(null), none);
});
