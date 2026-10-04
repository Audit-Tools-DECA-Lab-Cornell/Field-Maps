import { z } from "zod";
import type { components } from "./schema";
export const identitySchema = z.object({
  profile: z.object({
    user_id: z.uuid(),
    display_name: z.string().nullable(),
    observer_initials: z.string().nullable(),
    locale: z.string().nullable(),
    created_at: z.iso.datetime({ offset: true }),
  }),
  organization_memberships: z.array(
    z.object({
      organization_id: z.uuid(),
      slug: z.string(),
      name: z.string(),
      role: z.enum(["owner", "admin", "member"]),
    }),
  ),
  project_memberships: z.array(
    z.object({
      project_id: z.uuid(),
      code: z.string(),
      name: z.string(),
      organization_id: z.uuid(),
      role: z.enum(["manager", "observer", "viewer"]),
      is_training: z.boolean(),
    }),
  ),
}) satisfies z.ZodType<components["schemas"]["Identity"]>;
export type Identity = components["schemas"]["Identity"];
