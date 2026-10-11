/**
 * The workspace vocabulary every screen shares: who is signed in, the organizations and projects they can
 * open, and the shape of a read that may have failed. Plain, serialisable data only, so a server page can
 * hand any of it to a client screen as props.
 */

export type OrgRole = "owner" | "admin" | "member";
export type ProjectRole = "manager" | "observer" | "viewer";
export type RoundType = "standard" | "reliability" | "inventory";

/**
 * A read or write that did not happen, in words a researcher can act on. `message` is DECA Mark's own copy
 * (`errorCopy`), never the server's text. `fields` maps a form field id to its problem (422 only);
 * `retryAfter` is how many seconds to wait (429 only).
 */
export type Failure = {
	code: string;
	kind: "sign-in" | "retry" | "rejected";
	message: string;
	fields?: Readonly<Record<string, string>>;
	retryAfter?: number;
};

export type Result<T> = { ok: true; data: T } | { ok: false; failure: Failure };

/** The signed-in person as the header shows them. `email` comes from the sign-in, never from the API. */
export type AccountSummary = { userId: string | null; name: string; email?: string; initials: string };

/** An organization the person can open, by its web address (`slug`). */
export type OrgRef = { id: string; slug: string; name: string; role: OrgRole };

/** A project the person can open: `/o/<orgSlug>/p/<code>`. Training projects are never listed. */
export type ProjectRef = {
	id: string;
	orgId: string;
	orgSlug: string;
	code: string;
	name: string;
	role: ProjectRole;
};

/**
 * Everything the shell needs to place the person. `status: "unavailable"` carries the failure and an
 * account built from what is known (the sign-in's email), with no organizations or projects.
 */
export type WorkspaceIndex = {
	status: "ready" | "unavailable";
	failure?: Failure;
	account: AccountSummary;
	orgs: OrgRef[];
	projects: ProjectRef[];
};
