/** What an organization change came to, for the dialogs and forms that asked for it. */

/** A change that did not happen: what did not happen and why, and which fields to mark. */
export type OrgFailure = {
	status: "failed";
	message: string;
	/** Field id → problem, for the fields the API (or the check before it) named. */
	fields?: Record<string, string>;
};

/** The saved name and web address, as the API now holds them. */
export type SavedOrganization = { status: "done"; name: string; slug: string };
