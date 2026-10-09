import type { MemberLike, PeopleRole } from "./types";

export const NO_NAME = "No name available";

/** The name a member set in their profile, or "No name available" (they set none, or it is not visible to you). */
export function memberName(member: Pick<MemberLike<PeopleRole>, "display_name">): string {
	return member.display_name?.trim() || NO_NAME;
}

/** One to three letters for the avatar: their observer code, else the first letters of their name. */
export function memberInitials(member: Pick<MemberLike<PeopleRole>, "display_name" | "observer_initials">): string {
	const code = member.observer_initials?.trim();
	if (code && code.length <= 3) return code.toUpperCase();
	const words = member.display_name?.trim().split(/\s+/).filter(Boolean) ?? [];
	const letters = words
		.slice(0, 2)
		.map(word => word[0] ?? "")
		.join("")
		.toUpperCase();
	return letters || "?";
}
