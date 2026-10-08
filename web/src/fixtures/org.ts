import type { Invitation, Organization, OrgMembership, Project, ProjectMembership } from "./types";

export const DEFAULT_ORG = "deca";
export const DEFAULT_PROJECT = "play-study";

export const ORGANIZATIONS: Organization[] = [
	{
		slug: "deca",
		name: "DECA Lab",
		fullName: "DECA Lab, Cornell University",
		ownerId: "janet",
		createdLabel: "Owner since the organization was created"
	}
];

export const PROJECTS: Project[] = [
	{
		slug: "play-study",
		orgSlug: "deca",
		name: "Play Study",
		code: "PLAY-26",
		state: "active",
		summary: "Riverside and 2 more sites · latest upload today 11:29",
		timezone: "America/New_York",
		target: { roundsPerZone: 3, observationsPerRound: 2 },
		publicationScope: "accepted",
		lastSaved: { by: "JL", label: "yesterday" },
		counted: true
	},
	{
		slug: "schoolyard-pilot",
		orgSlug: "deca",
		name: "Schoolyard pilot",
		code: "SCHOOL-26",
		state: "preparing",
		summary: "1 site · form preparation in progress",
		timezone: "America/New_York",
		target: { roundsPerZone: 3, observationsPerRound: 2 },
		publicationScope: "accepted",
		lastSaved: { by: "PS", label: "Sep 29" },
		counted: true
	},
	{
		slug: "training",
		orgSlug: "deca",
		name: "Training",
		code: "TRAINING",
		state: "practice",
		summary: "Practice geometry and forms · excluded from research datasets",
		timezone: "America/New_York",
		target: { roundsPerZone: 0, observationsPerRound: 0 },
		publicationScope: "accepted",
		lastSaved: { by: "JL", label: "Sep 12" },
		counted: false
	}
];

export const ORG_MEMBERSHIPS: OrgMembership[] = [
	{ personId: "janet", orgSlug: "deca", role: "owner", since: "Owner since the organization was created" },
	{ personId: "pratyush", orgSlug: "deca", role: "admin" },
	{ personId: "alex", orgSlug: "deca", role: "member" }
];

export const PROJECT_MEMBERSHIPS: ProjectMembership[] = [
	{ personId: "janet", projectSlug: "play-study", role: "manager", collectsAs: "JL" },
	{ personId: "pratyush", projectSlug: "play-study", role: "manager", collectsAs: "PS" },
	{ personId: "alex", projectSlug: "play-study", role: "observer", collectsAs: "AK" },
	{ personId: "janet", projectSlug: "schoolyard-pilot", role: "manager", collectsAs: "JL" },
	{ personId: "pratyush", projectSlug: "schoolyard-pilot", role: "manager", collectsAs: "PS" }
];

export const INVITATIONS: Invitation[] = [
	{
		email: "analyst@example.org",
		scope: "project",
		projectSlug: "play-study",
		role: "viewer",
		state: "waiting",
		sentLabel: "sent Sep 30"
	}
];

/** The Play Study observer join code, shown once to the manager who created it. */
export const JOIN_CODE = { projectSlug: "play-study", code: "DECA2026", shownOnce: true };
