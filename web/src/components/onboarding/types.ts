/**
 * The wizard's own state. It lives in React state only — nothing here is written to storage or
 * sent anywhere until WEB-06 connects this preview to the tenancy API.
 */

export type FormChoice = "janet-test-v1" | "shell-v1";
export type InviteRole = "observer" | "viewer" | "manager";
export type InviteExpiresDays = 7 | 30 | 90;

export interface SetupState {
	readonly orgName: string;
	readonly orgSlug: string;
	readonly orgSlugEdited: boolean;
	readonly projectName: string;
	readonly projectCode: string;
	readonly projectCodeEdited: boolean;
	readonly timezone: string;
	readonly siteName: string;
	readonly siteCode: string;
	readonly siteCodeEdited: boolean;
	readonly formChoice: FormChoice;
	readonly inviteRole: InviteRole;
	readonly inviteUses: number;
	readonly inviteExpiresDays: InviteExpiresDays;
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
	siteCode: "",
	siteCodeEdited: false,
	formChoice: "janet-test-v1",
	inviteRole: "observer",
	inviteUses: 25,
	inviteExpiresDays: 30
};

export interface StepDefinition {
	readonly id: "org" | "project" | "site" | "questions" | "invite";
	readonly label: string;
}

export const STEPS: readonly StepDefinition[] = [
	{ id: "org", label: "Organization" },
	{ id: "project", label: "First project" },
	{ id: "site", label: "Site map" },
	{ id: "questions", label: "Questions" },
	{ id: "invite", label: "Invite observers" }
];
