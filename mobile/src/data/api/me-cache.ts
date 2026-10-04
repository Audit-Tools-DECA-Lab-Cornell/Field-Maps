import { z } from "zod";
import { type Identity, identitySchema } from "./identity";

const cacheSchema = z.object({ identity: identitySchema, activeProjectId: z.uuid().nullable() });
export type MeSnapshot = Readonly<z.infer<typeof cacheSchema>>;
export function selectProject(identity: Identity, preferred: string | null): string | null {
  const projects = identity.project_memberships;
  return (
    projects.find((project) => project.project_id === preferred)?.project_id ??
    projects.find((project) => !project.is_training)?.project_id ??
    projects[0]?.project_id ??
    null
  );
}
export function readMeCache(value: string | null, userId: string): MeSnapshot | null {
  if (!value) return null;
  try {
    const parsed = cacheSchema.safeParse(JSON.parse(value));
    if (!parsed.success || parsed.data.identity.profile.user_id !== userId) return null;
    return {
      identity: parsed.data.identity,
      activeProjectId: selectProject(parsed.data.identity, parsed.data.activeProjectId),
    };
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}
export function refreshMeCache(identity: Identity, previous: MeSnapshot | null): MeSnapshot {
  return { identity, activeProjectId: selectProject(identity, previous?.activeProjectId ?? null) };
}
