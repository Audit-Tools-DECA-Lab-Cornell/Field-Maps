import { z } from "zod";

import { isTimeZone } from "@/lib/time";

import { ADDRESS_PATTERN, NAME_MAX } from "./slug";

/**
 * What each Server Action accepts. The arguments come from the browser, so they are checked again here
 * even though the form checked them: shapes first, then the API decides what the person may do.
 */

/** An id the API gave out. Any 8-4-4-4-12 hex id passes; the API rejects ones that are not its own. */
const id = z.guid();
const name = z.string().trim().min(1).max(NAME_MAX);
const address = z.string().regex(ADDRESS_PATTERN);
const email = z
	.string()
	.trim()
	.max(254)
	.regex(/^[^\s@]+@[^\s@]+$/);

export const createProjectInput = z.object({
	orgId: id,
	orgSlug: address,
	name,
	code: address,
	timezone: z.string().refine(isTimeZone)
});

export const saveOrganizationInput = z
	.object({
		orgId: id,
		currentSlug: address,
		name: name.optional(),
		slug: address.optional()
	})
	.refine(value => value.name !== undefined || value.slug !== undefined);

export const inviteInput = z.object({
	orgId: id,
	role: z.enum(["member", "admin"]),
	email: email.nullable(),
	maxUses: z.number().int().min(1).max(10_000),
	expiresInDays: z.number().int().min(1).max(365)
});

/** Owners are made by Transfer ownership, never by a role change. */
export const roleInput = z.object({ orgId: id, userId: id, role: z.enum(["admin", "member"]) });

export const memberInput = z.object({ orgId: id, userId: id });

export const revokeInput = z.object({ orgId: id, invitationId: id });

/** The fields a failed check names, by their form ids (`name`, `code`…), for showing next to each one. */
export function fieldsOf(error: z.ZodError): Record<string, string> {
	const fields: Record<string, string> = {};
	for (const issue of error.issues) {
		const key = String(issue.path[0] ?? "");
		if (key !== "" && !(key in fields)) fields[key] = "Check this value.";
	}
	return fields;
}
