import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const { homeFor } = await load("lib/workspace/home.ts");

const account = { userId: "u1", name: "Janet Lee", email: "janet@example.edu", initials: "JL" };
const deca = { id: "o1", slug: "deca-lab", name: "DECA Lab", role: "owner" };
const other = { id: "o2", slug: "atlas", name: "Atlas Group", role: "member" };
const play = { id: "p1", orgId: "o1", orgSlug: "deca-lab", code: "play-study", name: "Play Study", role: "manager" };
const pilot = { id: "p2", orgId: "o1", orgSlug: "deca-lab", code: "pilot", name: "Pilot", role: "viewer" };
const field = { id: "p3", orgId: "o2", orgSlug: "atlas", code: "field", name: "Field", role: "observer" };

const index = (orgs, projects) => ({ status: "ready", account, orgs, projects });

test("the remembered project wins while the person still belongs to it", () => {
	const home = homeFor(index([deca], [play, pilot]), "/o/deca-lab/p/pilot/data");
	assert.equal(home, "/o/deca-lab/p/pilot/data");
});

test("a remembered project the person no longer belongs to is ignored", () => {
	assert.equal(homeFor(index([deca], [play]), "/o/deca-lab/p/gone"), "/o/deca-lab/p/play-study");
	assert.equal(homeFor(index([deca], [play]), "/o/old-lab/p/play-study"), "/o/deca-lab/p/play-study");
});

test("a remembered path that leaves the site is ignored", () => {
	for (const path of ["https://evil.example/o/deca-lab", "//evil.example", "/o/deca-lab/p/../../x", "/elsewhere"])
		assert.equal(homeFor(index([deca], [play]), path), "/o/deca-lab/p/play-study", path);
});

test("a remembered project where the person is now an observer sends them to collect", () => {
	const observer = { ...play, role: "observer" };
	assert.equal(homeFor(index([deca], [observer, pilot]), "/o/deca-lab/p/play-study"), "/o/deca-lab/collect");
});

test("the only project opens directly", () => {
	assert.equal(homeFor(index([deca], [play])), "/o/deca-lab/p/play-study");
});

test("an observer's only project sends them to their organization's collect page", () => {
	assert.equal(homeFor(index([other], [field])), "/o/atlas/collect");
});

test("several projects open the first organization, owned before joined", () => {
	assert.equal(homeFor(index([other, deca], [field, play, pilot])), "/o/deca-lab");
});

test("an organization where every project is an observer project opens its collect page", () => {
	const observerOnly = { ...deca, role: "member" };
	const a = { ...play, role: "observer" };
	const b = { ...pilot, role: "observer" };
	assert.equal(homeFor(index([observerOnly], [a, b])), "/o/deca-lab/collect");
});

test("no projects and no organization to manage: nowhere yet", () => {
	assert.equal(homeFor(index([], [])), null);
	assert.equal(homeFor(index([other], [])), null);
});

test("an owner of an organization without projects lands on it, to create one", () => {
	assert.equal(homeFor(index([deca], [])), "/o/deca-lab");
});

test("an unavailable workspace has no home; the caller shows the failure", () => {
	const failure = { code: "storage_unavailable", kind: "retry", message: "…" };
	assert.equal(homeFor({ status: "unavailable", failure, account, orgs: [], projects: [] }, "/o/deca-lab"), null);
});

test("a remembered organization path is kept while the person belongs to it", () => {
	assert.equal(homeFor(index([deca, other], [play, field]), "/o/atlas"), "/o/atlas");
	assert.equal(homeFor(index([deca], [play]), "/o/atlas/members"), "/o/deca-lab/p/play-study");
});
