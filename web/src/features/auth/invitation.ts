import { getOrg, getProject, JOIN_CODE, PEOPLE } from "@/fixtures";

/**
 * The invitation the preview shows: Play Study in DECA Lab, from Janet, as an observer. The fixtures
 * hold one observer join code (DECA2026) and its project; an invitation link (`/invite#t=…`) opens the
 * same project. WEB-06 replaces this with `POST /v1/invitations/preview`.
 */
export type InvitationPreview = {
	organization: string;
	project: string;
	role: "observer";
	invitedBy: string;
	access: string;
};

export function invitationFor(code: string | undefined): InvitationPreview | undefined {
	if (code !== undefined && code !== JOIN_CODE.code) return undefined;
	const project = getProject("deca", JOIN_CODE.projectSlug);
	const organization = project && getOrg(project.orgSlug);
	const inviter = organization && PEOPLE[organization.ownerId];
	if (!project || !organization || !inviter) return undefined;
	return {
		organization: organization.fullName,
		project: project.name,
		role: "observer",
		invitedBy: inviter.name,
		access: "Collect observations on mobile; your account remains your own."
	};
}

/** Whether a join code opens a project in the preview. */
export function isKnownJoinCode(code: string): boolean {
	return code === JOIN_CODE.code;
}

/** The person the signed-in auth pages belong to: the observer Alex, who is joining. */
export const INVITEE = PEOPLE.alex!;
