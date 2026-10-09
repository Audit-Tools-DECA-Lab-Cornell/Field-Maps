/**
 * Invitations as the team pages list them. The API's list keeps revoked, expired and used-up invitations;
 * only the ones that can still be redeemed are pending. FieldMaps never sends email: the person who made
 * an invitation shares its link or join code themselves.
 */

export type InvitationLike = {
	readonly revoked_at: string | null;
	readonly expires_at: string;
	readonly use_count: number;
	readonly max_uses: number;
};

/** Whether the invitation can still be redeemed at `nowIso`. */
export function isActiveInvitation(invitation: InvitationLike, nowIso: string): boolean {
	if (invitation.revoked_at !== null) return false;
	if (invitation.use_count >= invitation.max_uses) return false;
	return Date.parse(invitation.expires_at) > Date.parse(nowIso);
}

/** The invitations that can still be redeemed, in the order given. */
export function activeInvitations<T extends InvitationLike>(list: readonly T[], nowIso: string): T[] {
	return list.filter(invitation => isActiveInvitation(invitation, nowIso));
}

/**
 * The link that opens an invitation. The token travels in the fragment (`#t=`), which browsers never send
 * to a server or put in a referrer.
 */
export function inviteLink(origin: string, token: string): string {
	return `${origin.replace(/\/+$/, "")}/invite#t=${encodeURIComponent(token)}`;
}

/** "2 of 25" uses. */
export function usesLabel(invitation: Pick<InvitationLike, "use_count" | "max_uses">): string {
	return `${invitation.use_count} of ${invitation.max_uses}`;
}
