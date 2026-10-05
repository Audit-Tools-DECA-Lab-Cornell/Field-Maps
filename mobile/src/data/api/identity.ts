import { z } from "zod";
import type { components } from "./schema";

type Schemas = components["schemas"];
const roleSchema = z.enum(["member", "admin", "manager", "observer", "viewer"]);

export const profileSchema = z.object({
  user_id: z.uuid(),
  display_name: z.string().nullable(),
  observer_initials: z.string().nullable(),
  locale: z.string().nullable(),
  created_at: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<Schemas["Profile"]>;
export type Profile = Schemas["Profile"];
export type ProfilePatch = Schemas["ProfilePatch"];

export const identitySchema = z.object({
  profile: profileSchema,
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
}) satisfies z.ZodType<Schemas["Identity"]>;
export type Identity = Schemas["Identity"];

export const invitationPreviewSchema = z.object({
  organization_name: z.string(),
  project_name: z.string().nullable(),
  role: roleSchema,
  expires_at: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<Schemas["InvitationPreview"]>;
export type InvitationPreview = Schemas["InvitationPreview"];

export const invitationRedeemedSchema = z.object({
  organization_id: z.uuid(),
  project_id: z.uuid().nullable(),
  role: roleSchema,
}) satisfies z.ZodType<Schemas["InvitationRedeemed"]>;
export type InvitationRedeemed = Schemas["InvitationRedeemed"];
