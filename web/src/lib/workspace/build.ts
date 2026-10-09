import type { Identity } from "@/features/account/view";

import { avatarInitials, personName } from "../../features/account/view";
import type { AccountSummary, Failure, OrgRef, ProjectRef, WorkspaceIndex } from "./types";

/**
 * The workspace index from `GET /v1/me` and the sign-in's claims. Pure, so it is unit-tested apart from
 * the network.
 *
 * - The account's name and initials come from the profile (`personName`, `avatarInitials`); the email
 *   comes from the sign-in, because the API does not return it.
 * - Training projects are never listed.
 * - Organization owners and admins are reported as managers of every project in their organization; that
 *   role is kept as it is.
 * - Redeeming a project invitation also makes the person a member of its organization, so a project's
 *   organization is normally among `organization_memberships`. When it is not (an organization member was
 *   removed but their project membership survived), the organization is still listed, as a member, under
 *   its id, so `/o/<id>` resolves and the project stays reachable. `GET /v1/orgs` would not help: it lists
 *   the same organizations as `organization_memberships` (row security on `my_org_ids`).
 */

export type Claims = { readonly sub?: string | null; readonly email?: string | null };

/** The name the shell shows for an organization the person reaches only through a project. */
export const UNNAMED_ORGANIZATION = "Organization";

export function accountSummary(me: Identity | null, claims: Claims | null): AccountSummary {
	const email = claims?.email?.trim() || undefined;
	return {
		userId: me?.profile.user_id ?? claims?.sub ?? null,
		name: personName(me, email),
		...(email ? { email } : {}),
		initials: avatarInitials(me, email)
	};
}

export function buildWorkspaceIndex(me: Identity, claims: Claims | null): WorkspaceIndex {
	const orgs: OrgRef[] = me.organization_memberships.map(org => ({
		id: org.organization_id,
		slug: org.slug,
		name: org.name,
		role: org.role
	}));
	const visible = me.project_memberships.filter(project => !project.is_training);
	for (const project of visible) {
		if (orgs.some(org => org.id === project.organization_id)) continue;
		orgs.push({
			id: project.organization_id,
			slug: project.organization_id,
			name: UNNAMED_ORGANIZATION,
			role: "member"
		});
	}
	const slugOf = new Map(orgs.map(org => [org.id, org.slug]));
	const projects: ProjectRef[] = visible.map(project => ({
		id: project.project_id,
		orgId: project.organization_id,
		orgSlug: slugOf.get(project.organization_id) ?? project.organization_id,
		code: project.code,
		name: project.name,
		role: project.role
	}));
	return { status: "ready", account: accountSummary(me, claims), orgs, projects };
}

/** The index when the person cannot be placed: who they are, as far as the sign-in says, and why. */
export function unavailableWorkspace(failure: Failure, claims: Claims | null): WorkspaceIndex {
	return { status: "unavailable", failure, account: accountSummary(null, claims), orgs: [], projects: [] };
}
