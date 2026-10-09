import type { OrgRole, ProjectRole } from "./types";

/**
 * What a role lets the person do on the web. The API enforces every rule with row security; these only
 * decide which tabs and controls appear, so a page never offers an action the API would refuse and never
 * calls a manager-only endpoint for someone without the role.
 */

export type ProjectAbilities = {
	/** Open the project's workspace: overview, data, sites, forms, QGIS and reports. */
	read: boolean;
	/** Team, settings, uploads, form authoring and site edits. */
	manage: boolean;
	/** Observers collect in the app; the web sends them to the collect page instead of the workspace. */
	collectOnly: boolean;
};

export type OrgAbilities = {
	/** Organization members, settings and invitations. */
	manage: boolean;
	/** Change who is an owner or admin, and transfer ownership. */
	manageOwners: boolean;
	createProject: boolean;
};

export function projectAbilities(role: ProjectRole | null): ProjectAbilities {
	switch (role) {
		case "manager":
			return { read: true, manage: true, collectOnly: false };
		case "viewer":
			return { read: true, manage: false, collectOnly: false };
		case "observer":
			return { read: false, manage: false, collectOnly: true };
		default:
			return { read: false, manage: false, collectOnly: false };
	}
}

export function orgAbilities(role: OrgRole | null): OrgAbilities {
	switch (role) {
		case "owner":
			return { manage: true, manageOwners: true, createProject: true };
		case "admin":
			return { manage: true, manageOwners: false, createProject: true };
		default:
			return { manage: false, manageOwners: false, createProject: false };
	}
}
