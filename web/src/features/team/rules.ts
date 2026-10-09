import { z } from "zod";

import type { Invitation, ProjectMember } from "../../lib/api/types";
import type { InvitationLike, MemberLike } from "../people/types";

/**
 * What the project team's forms accept, as plain rules the screen and the server action both use.
 * Relative imports only, so the unit tests can load this file.
 */

export const PROJECT_ROLES = ["manager", "observer", "viewer"] as const;
export type TeamRole = (typeof PROJECT_ROLES)[number];

export function isTeamRole(value: string): value is TeamRole {
	return (PROJECT_ROLES as readonly string[]).includes(value);
}

/** An invitation cannot be used by more people than this, or for longer than this (the API's limits). */
export const MAX_USES = 10_000;
export const MAX_DAYS = 365;
const MAX_EMAIL = 254;
const EMAIL = /^[^\s@]+@[^\s@]+$/;

export const EMAIL_PROBLEM = "Enter a full email address, with an @, or leave it empty.";
export const USES_PROBLEM = "Enter a whole number from 1 to 10,000.";
export const DAYS_PROBLEM = "Enter a whole number of days from 1 to 365.";
export const ROLE_PROBLEM = "Choose observer, viewer or manager.";

/** Where a project is addressed: its organization's web address and its code. */
const address = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);

export const teamContextSchema = z.object({
	org: address,
	project: address,
	projectId: z.guid()
});

/** The project a team change is for. `org` and `project` name the pages to refresh. */
export type TeamContext = z.infer<typeof teamContextSchema>;

export const idSchema = z.guid();

export const roleSchema = z.enum(PROJECT_ROLES);

const inviteSchema = z.object({
	role: roleSchema,
	// Empty means a join code, which several people can use.
	email: z
		.string()
		.trim()
		.max(MAX_EMAIL, EMAIL_PROBLEM)
		.refine(value => value === "" || EMAIL.test(value), EMAIL_PROBLEM)
		.nullable(),
	maxUses: z.number(USES_PROBLEM).int(USES_PROBLEM).min(1, USES_PROBLEM).max(MAX_USES, USES_PROBLEM),
	expiresInDays: z.number(DAYS_PROBLEM).int(DAYS_PROBLEM).min(1, DAYS_PROBLEM).max(MAX_DAYS, DAYS_PROBLEM)
});

export type InviteValues = {
	role: TeamRole;
	email: string | null;
	maxUses: number;
	expiresInDays: number;
};

/** Field ids as the API names them in a 422, so a problem lands next to the same field either way. */
const FIELD_OF: Record<string, string> = {
	role: "role",
	email: "email",
	maxUses: "max_uses",
	expiresInDays: "expires_in_days"
};

export type InviteCheck = { ok: true; values: InviteValues } | { ok: false; fields: Record<string, string> };

/**
 * An invitation request as the API will take it. An address is for one person, so it allows one use; with
 * no address the request is a join code. The problems are keyed by the field ids the dialog shows them at.
 */
export function checkInvitation(input: unknown): InviteCheck {
	const parsed = inviteSchema.safeParse(input);
	if (!parsed.success) {
		const fields: Record<string, string> = {};
		for (const issue of parsed.error.issues) {
			const key = FIELD_OF[String(issue.path[0] ?? "")] ?? "role";
			if (!(key in fields)) fields[key] = issue.message;
		}
		return { ok: false, fields };
	}
	const email = parsed.data.email === "" ? null : parsed.data.email;
	return {
		ok: true,
		values: {
			role: parsed.data.role,
			email: email === null ? null : email.toLowerCase(),
			maxUses: email === null ? parsed.data.maxUses : 1,
			expiresInDays: parsed.data.expiresInDays
		}
	};
}

/** A project member as the team page needs them: no organization or project ids go to the browser. */
export function teamMember(member: ProjectMember): MemberLike<TeamRole> {
	return {
		user_id: member.user_id,
		role: member.role,
		display_name: member.display_name ?? null,
		observer_initials: member.observer_initials ?? null,
		granted_at: member.granted_at
	};
}

/**
 * The project's invitations as the page needs them. A project's list only holds observer, viewer and
 * manager invitations; an organization role here would be a mistake in the list, so it is left out
 * rather than shown as something it is not.
 */
export function teamInvitations(list: readonly Invitation[]): InvitationLike<TeamRole>[] {
	return list.flatMap(invitation =>
		isTeamRole(invitation.role)
			? [
					{
						id: invitation.id,
						role: invitation.role,
						email: invitation.email,
						max_uses: invitation.max_uses,
						use_count: invitation.use_count,
						expires_at: invitation.expires_at,
						revoked_at: invitation.revoked_at,
						created_at: invitation.created_at
					}
				]
			: []
	);
}
