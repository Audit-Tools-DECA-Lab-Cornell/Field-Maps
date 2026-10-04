import { z } from "zod";

import type { components } from "./schema";

export const identitySchema = z.object({
	profile: z.object({
		user_id: z.uuid(),
		created_at: z.string(),
		display_name: z.string().nullable(),
		locale: z.string().nullable(),
		observer_initials: z.string().nullable()
	}),
	organization_memberships: z.array(
		z.object({
			organization_id: z.uuid(),
			name: z.string(),
			slug: z.string(),
			role: z.enum(["owner", "admin", "member"])
		})
	),
	project_memberships: z.array(
		z.object({
			project_id: z.uuid(),
			organization_id: z.uuid(),
			name: z.string(),
			code: z.string(),
			is_training: z.boolean(),
			role: z.enum(["manager", "observer", "viewer"])
		})
	)
}) satisfies z.ZodType<components["schemas"]["Identity"]>;
