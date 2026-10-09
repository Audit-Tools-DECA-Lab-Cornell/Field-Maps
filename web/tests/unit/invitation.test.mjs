import assert from "node:assert/strict";
import test from "node:test";

import { load } from "./support.mjs";

const {
	ALREADY_ORGANIZATION_COPY,
	ALREADY_PROJECT_COPY,
	destinationFor,
	EXPIRED_COPY,
	forgetToken,
	inviteFragment,
	inviteProblem,
	isInvitationPath,
	INVITE_STORAGE_KEY,
	placeOf,
	problemText,
	recalledToken,
	rememberToken
} = await load("features/auth/invitation.ts");
const { androidAppUrl } = await load("features/auth/androidApp.ts");

const SECRET = "Zk3-q_9XvT0aBcDeFgHiJkLmNoPqRsTuVwXyZ012345";

function memory() {
	const data = new Map();
	return {
		data,
		getItem: key => data.get(key) ?? null,
		setItem: (key, value) => void data.set(key, String(value)),
		removeItem: key => void data.delete(key)
	};
}

const refusing = {
	getItem() {
		throw new DOMException("blocked", "SecurityError");
	},
	setItem() {
		throw new DOMException("blocked", "SecurityError");
	},
	removeItem() {
		throw new DOMException("blocked", "SecurityError");
	}
};

test("reads the secret from an address fragment", () => {
	assert.deepEqual(inviteFragment(`#t=${SECRET}`), { present: true, token: SECRET });
	assert.deepEqual(inviteFragment(`t=${SECRET}`), { present: true, token: SECRET });
});

test("a fragment without a readable secret is still noticed, so it can be removed", () => {
	assert.deepEqual(inviteFragment("#t="), { present: true, token: undefined });
	assert.deepEqual(inviteFragment("#t=has space"), { present: true, token: undefined });
	assert.deepEqual(inviteFragment(`#t=${"a".repeat(257)}`), { present: true, token: undefined });
});

test("other fragments are left alone", () => {
	assert.deepEqual(inviteFragment(""), { present: false, token: undefined });
	assert.deepEqual(inviteFragment("#"), { present: false, token: undefined });
	assert.deepEqual(inviteFragment("#main"), { present: false, token: undefined });
	assert.deepEqual(inviteFragment("#x=1"), { present: false, token: undefined });
});

test("the secret is kept under fm-invite for this tab and can be forgotten", () => {
	const store = memory();
	assert.equal(rememberToken(SECRET, store), true);
	assert.equal(store.data.get(INVITE_STORAGE_KEY), SECRET);
	assert.equal(INVITE_STORAGE_KEY, "fm-invite");
	assert.equal(recalledToken(store), SECRET);
	forgetToken(store);
	assert.equal(recalledToken(store), undefined);
});

test("a stored value that is not a secret is ignored", () => {
	const store = memory();
	store.setItem(INVITE_STORAGE_KEY, "<script>");
	assert.equal(recalledToken(store), undefined);
});

test("storage that refuses, or is missing, never throws", () => {
	assert.equal(rememberToken(SECRET, refusing), false);
	assert.equal(recalledToken(refusing), undefined);
	assert.doesNotThrow(() => forgetToken(refusing));
	assert.equal(rememberToken(SECRET, null), false);
	assert.equal(recalledToken(null), undefined);
});

const rejected = (code, extra = {}) => ({ code, kind: "rejected", message: `copy for ${code}`, ...extra });

test("an expired invitation (410) says to ask for a new one", () => {
	const problem = inviteProblem(rejected("invitation_expired", { status: 410 }), {
		step: "preview",
		credential: "token"
	});
	assert.deepEqual(problem, {
		kind: "expired",
		message: "This invitation has expired. Ask your project manager for a new one."
	});
	assert.equal(problem.message, EXPIRED_COPY);
});

test("too many tries (429) keeps the wait FieldMaps asked for", () => {
	const source = {
		code: "rate_limited",
		kind: "retry",
		status: 429,
		retryAfter: 42,
		message: "Too many tries. Wait 42 seconds and try again."
	};
	assert.deepEqual(inviteProblem(source, { step: "redeem", credential: "code" }), {
		kind: "wait",
		message: "Too many tries. Wait 42 seconds and try again.",
		retryAfter: 42
	});
	const unknown = inviteProblem({ ...source, retryAfter: undefined }, { step: "redeem", credential: "code" });
	assert.equal(unknown.retryAfter, 60);
});

test("a duplicate join (409) means the person is already a member", () => {
	const problem = inviteProblem(rejected("conflict", { status: 409 }), { step: "redeem", credential: "token" });
	assert.equal(problem.kind, "already-member");
	assert.equal(problem.message, ALREADY_PROJECT_COPY);
	assert.equal(problemText(problem, { project: "Play study" }), "You are already on this project.");
	assert.equal(problemText(problem, { project: null }), ALREADY_ORGANIZATION_COPY);
});

test("an invitation that is gone reads differently for a code and for a link", () => {
	const gone = rejected("invitation_invalid", { status: 404 });
	const code = inviteProblem(gone, { step: "preview", credential: "code" });
	assert.equal(code.kind, "invalid");
	assert.equal(code.message, "We could not find a project for that code. Check it with your project manager.");
	const link = inviteProblem(gone, { step: "preview", credential: "token" });
	assert.match(link.message, /link no longer works/);
	assert.doesNotMatch(link.message, /token/i);
	const redeem = inviteProblem(gone, { step: "redeem", credential: "token" });
	assert.match(redeem.message, /already be a member/);
});

test("signed out, unreachable and other refusals", () => {
	assert.equal(
		inviteProblem(
			{ code: "token_invalid", kind: "sign-in", status: 401, message: "x" },
			{ step: "preview", credential: "token" }
		).kind,
		"signed-out"
	);
	const down = inviteProblem(
		{ code: "storage_unavailable", kind: "retry", status: 503, message: "FieldMaps cannot be reached right now." },
		{ step: "preview", credential: "token" }
	);
	assert.deepEqual(down, { kind: "unavailable", message: "FieldMaps cannot be reached right now." });
	assert.equal(
		inviteProblem(rejected("role_required", { status: 403 }), { step: "preview", credential: "code" }).kind,
		"refused"
	);
});

const index = {
	status: "ready",
	account: { userId: "u", name: "A", initials: "A" },
	orgs: [
		{ id: "o1", slug: "web-acceptance", name: "Web acceptance lab", role: "member" },
		{ id: "o2", slug: "other", name: "Other lab", role: "owner" }
	],
	projects: [
		{ id: "p1", orgId: "o1", orgSlug: "web-acceptance", code: "play-study", name: "Play study", role: "observer" },
		{ id: "p2", orgId: "o1", orgSlug: "web-acceptance", code: "survey", name: "Survey", role: "manager" }
	]
};

test("joining as an observer goes to the collect page, as a manager to the project", () => {
	assert.equal(destinationFor({ organization_id: "o1", project_id: "p1" }, index), "/o/web-acceptance/collect");
	assert.equal(destinationFor({ organization_id: "o1", project_id: "p2" }, index), "/o/web-acceptance/p/survey");
});

test("an organization invitation goes to the organization", () => {
	assert.equal(destinationFor({ organization_id: "o2", project_id: null }, index), "/o/other");
});

test("a place that is not in the workspace yet falls back to /o", () => {
	assert.equal(destinationFor({ organization_id: "o1", project_id: "missing" }, index), "/o");
	assert.equal(destinationFor({ organization_id: "missing", project_id: null }, index), "/o");
	assert.equal(
		destinationFor({ organization_id: "o1", project_id: "p1" }, { ...index, status: "unavailable" }),
		"/o"
	);
});

test("finds where the person already is from the names an invitation shows", () => {
	assert.equal(
		placeOf(index, { organization: "Web acceptance lab", project: "Survey" }),
		"/o/web-acceptance/p/survey"
	);
	assert.equal(
		placeOf(index, { organization: "Web acceptance lab", project: "Play study" }),
		"/o/web-acceptance/collect"
	);
	assert.equal(placeOf(index, { organization: "Other lab", project: null }), "/o/other");
	assert.equal(placeOf(index, { organization: "Other lab", project: "Survey" }), null);
	assert.equal(placeOf(index, { organization: "Nowhere", project: null }), null);
	assert.equal(placeOf({ ...index, status: "unavailable" }, { organization: "Other lab", project: null }), null);
});

test("only the invitation pages count as invitation paths", () => {
	assert.equal(isInvitationPath("/invite"), true);
	assert.equal(isInvitationPath("/join"), true);
	assert.equal(isInvitationPath("/o"), false);
	assert.equal(isInvitationPath("/invite?x=1"), false);
});

test("the Android link is used only when it is an https address", () => {
	assert.equal(
		androidAppUrl("https://play.example/store/apps/details?id=org.fieldmaps"),
		"https://play.example/store/apps/details?id=org.fieldmaps"
	);
	assert.equal(androidAppUrl(undefined), null);
	assert.equal(androidAppUrl(""), null);
	assert.equal(androidAppUrl("   "), null);
	assert.equal(androidAppUrl("http://play.example/app"), null);
	assert.equal(androidAppUrl("javascript:alert(1)"), null);
	assert.equal(androidAppUrl("not a url"), null);
	assert.equal(androidAppUrl("https://user:pass@play.example/app"), null);
});
