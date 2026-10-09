import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const { activeInvitations, inviteLink, isActiveInvitation, usesLabel } = await load("lib/workspace/invitations.ts");

const now = "2026-10-08T12:00:00Z";
const base = { revoked_at: null, expires_at: "2026-10-15T12:00:00Z", use_count: 0, max_uses: 1 };

test("keeps only invitations that can still be redeemed, in order", () => {
	const list = [
		{ id: "open", ...base },
		{ id: "revoked", ...base, revoked_at: "2026-10-07T00:00:00Z" },
		{ id: "expired", ...base, expires_at: "2026-10-08T11:59:59Z" },
		{ id: "used-up", ...base, use_count: 25, max_uses: 25 },
		{ id: "code", ...base, use_count: 2, max_uses: 25 }
	];
	assert.deepEqual(
		activeInvitations(list, now).map(invitation => invitation.id),
		["open", "code"]
	);
});

test("an invitation expiring exactly now is no longer active", () => {
	assert.equal(isActiveInvitation({ ...base, expires_at: now }, now), false);
});

test("the link keeps the token in the fragment", () => {
	assert.equal(
		inviteLink("https://field-maps.example", "abc_DEF-123"),
		"https://field-maps.example/invite#t=abc_DEF-123"
	);
	assert.equal(inviteLink("https://field-maps.example/", "a b"), "https://field-maps.example/invite#t=a%20b");
});

test("uses read as a count of the limit", () => {
	assert.equal(usesLabel({ use_count: 2, max_uses: 25 }), "2 of 25");
});
