/**
 * The set-up flow's own state. It lives in this browser tab only (sessionStorage, see
 * features/onboarding/store.ts) and is never sent anywhere: the tenancy API (BE-07) that would create
 * the organization and its first project does not exist yet.
 */

/** The five steps, in order. Each one is also its URL segment: /onboarding/organization, …/team. */
export const STEP_IDS = ["organization", "project", "site", "form", "team"] as const;
export type StepId = (typeof STEP_IDS)[number];

/** The demonstration form (copied as a new draft) or a draft with no questions. */
export type FormChoice = "demo" | "empty";
export type InviteRole = "observer" | "viewer" | "manager";

export interface Invite {
	/** A key for the row, never shown. */
	readonly id: string;
	readonly email: string;
	readonly role: InviteRole;
}

export interface SetupState {
	readonly orgName: string;
	readonly orgSlug: string;
	/** Once the address is typed by hand, renaming the organization no longer rewrites it. */
	readonly orgSlugEdited: boolean;
	readonly projectName: string;
	readonly projectCode: string;
	readonly projectCodeEdited: boolean;
	readonly timezone: string;
	readonly siteName: string;
	readonly formChoice: FormChoice;
	readonly invites: readonly Invite[];
	/** The observer join code, generated in this browser. Empty until the tab has made one. */
	readonly joinCode: string;
	/** Steps left with Continue. A step counts as done while it is in this list and still valid. */
	readonly completed: readonly StepId[];
	/** Optional steps left with "Skip for now". */
	readonly skipped: readonly StepId[];
}

export const INITIAL_STATE: SetupState = {
	orgName: "",
	orgSlug: "",
	orgSlugEdited: false,
	projectName: "",
	projectCode: "",
	projectCodeEdited: false,
	timezone: "America/New_York",
	siteName: "",
	formChoice: "demo",
	invites: [{ id: "invite-1", email: "", role: "observer" }],
	joinCode: "",
	completed: [],
	skipped: []
};

/** The project timezones offered first. Capture times on the web are shown in the one chosen. */
export const TIMEZONES: readonly string[] = [
	"America/New_York",
	"America/Chicago",
	"America/Denver",
	"America/Phoenix",
	"America/Los_Angeles",
	"America/Anchorage",
	"Pacific/Honolulu",
	"Europe/London",
	"Europe/Berlin",
	"Asia/Kolkata",
	"Australia/Sydney",
	"UTC"
];
