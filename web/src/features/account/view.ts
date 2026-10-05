import type { z } from "zod";

import type { identitySchema } from "@/lib/api/identity";

/** The caller's identity as GET /v1/me returns it, after the runtime check. */
export type Identity = z.infer<typeof identitySchema>;

/** The words for the person: their display name, else their address, else a plain fallback. */
export function personName(identity: Identity | null, email: string | undefined): string {
	return identity?.profile.display_name?.trim() || email || "Your account";
}

/**
 * One to three letters for the avatar: the observer code when it is that short, else the first letters
 * of the first two words of the name, else the first letter of the address.
 */
export function avatarInitials(identity: Identity | null, email: string | undefined): string {
	const code = identity?.profile.observer_initials;
	if (code && code.length <= 3) return code;
	const words = identity?.profile.display_name?.trim().split(/\s+/).filter(Boolean) ?? [];
	const fromName = words
		.slice(0, 2)
		.map(word => word[0] ?? "")
		.join("")
		.toUpperCase();
	if (fromName) return fromName;
	return (email?.[0] ?? "?").toUpperCase();
}

/** A role key in the vocabulary of contracts/contour.json (Owner, Admin, Member, Manager…, Practice). */
export type AccessRole = "owner" | "admin" | "member" | "manager" | "observer" | "viewer" | "practice";

export type AccessRow = {
	key: string;
	/** The organization or project name. */
	where: string;
	/** A project's second line: its organization, or that it is the practice project. */
	detail?: string;
	/** A project's code, read aloud, so it is set in mono. */
	code?: string;
	role: AccessRole;
};

/**
 * "Your access" (org-05): the organizations first, then the projects, with Training last. A Training
 * membership reads as Practice, the role the practice project gives (PRODUCT.md § Roles).
 */
export function accessRows(identity: Identity): AccessRow[] {
	const orgName = new Map(identity.organization_memberships.map(org => [org.organization_id, org.name]));
	const organizations: AccessRow[] = identity.organization_memberships.map(org => ({
		key: `org-${org.organization_id}`,
		where: org.name,
		role: org.role
	}));
	const projects: AccessRow[] = [...identity.project_memberships]
		.sort((a, b) => Number(a.is_training) - Number(b.is_training))
		.map(project => ({
			key: `project-${project.project_id}`,
			where: project.name,
			detail: project.is_training ? "Practice project" : orgName.get(project.organization_id),
			code: project.is_training ? undefined : project.code,
			role: project.is_training ? "practice" : project.role
		}));
	return [...organizations, ...projects];
}

/**
 * What can stop a deletion with 409 sole_owner (fieldmaps_private.forget_user): an organization the
 * person owns, when it has other members and no other owner; a project they manage, when it has no other
 * manager. /v1/me does not say who else belongs, so these are the places that may.
 */
export function possibleBlockers(identity: Identity): { organizations: string[]; projects: string[] } {
	return {
		organizations: identity.organization_memberships.filter(org => org.role === "owner").map(org => org.name),
		projects: identity.project_memberships
			.filter(project => project.role === "manager" && !project.is_training)
			.map(project => project.name)
	};
}
