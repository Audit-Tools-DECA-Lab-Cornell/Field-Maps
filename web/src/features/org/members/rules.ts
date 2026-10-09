import { orgAbilities } from "@/lib/workspace/access";
import type { OrgRole } from "@/lib/workspace/types";

export type OrgRoleOption<R extends OrgRole> = { value: R; label: string; hint: string };

const MEMBER: OrgRoleOption<"member"> = {
	value: "member",
	label: "Member",
	hint: "Opens only the projects they are added to."
};
const ADMIN: OrgRoleOption<"admin"> = {
	value: "admin",
	label: "Admin",
	hint: "Manages members and every project in the organization."
};
/**
 * The roles the signed-in person can give a current member from the Members list. Only owners change
 * roles, between Admin and Member. Nobody becomes an owner this way: ownership moves with Transfer
 * ownership in Settings, so there is no Owner option. Admins can give no role.
 */
export function roleChoices(viewer: OrgRole): OrgRoleOption<OrgRole>[] {
	return orgAbilities(viewer).manageOwners ? [ADMIN, MEMBER] : [];
}

/**
 * The roles an invitation can carry. Invitations are for admins and members only; only owners can invite
 * an admin.
 */
export function inviteChoices(viewer: OrgRole): OrgRoleOption<"admin" | "member">[] {
	return orgAbilities(viewer).manageOwners ? [MEMBER, ADMIN] : [MEMBER];
}

type Person = { user_id: string; role: OrgRole };

/**
 * Whether the signed-in person can change or remove this member. Owners can manage anyone but
 * themselves; admins can remove plain members only; members manage no one. Your own row is never
 * managed here, so nobody locks themselves out of an organization by accident. The API enforces the
 * same rules (and the last-owner rule), so this only keeps buttons the API would refuse off the screen.
 */
export function canManageMember(viewer: OrgRole, viewerId: string | null, member: Person): boolean {
	if (member.user_id === viewerId) return false;
	const abilities = orgAbilities(viewer);
	if (abilities.manageOwners) return true;
	return abilities.manage && member.role === "member";
}

const ORDER: Record<OrgRole, number> = { owner: 0, admin: 1, member: 2 };

type Named = Person & { display_name?: string | null };

/** Owners first, then admins, then members; each group in name order, people without a name last. */
export function sortMembers<T extends Named>(members: readonly T[]): T[] {
	return [...members].sort((a, b) => {
		if (a.role !== b.role) return ORDER[a.role] - ORDER[b.role];
		const x = a.display_name?.trim() ?? "";
		const y = b.display_name?.trim() ?? "";
		if (x === "" || y === "") return x === y ? 0 : x === "" ? 1 : -1;
		return x.localeCompare(y, "en");
	});
}

/** Who ownership can pass to: any current member who is not an owner already. */
export function transferCandidates<T extends Person>(members: readonly T[], viewerId: string | null): T[] {
	return members.filter(member => member.role !== "owner" && member.user_id !== viewerId);
}
