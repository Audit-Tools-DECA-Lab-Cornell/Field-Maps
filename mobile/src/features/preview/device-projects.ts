import type { Identity } from "../../data/api/identity";
import { PREVIEW_PROJECTS, type PreviewProject } from "./fixtures";

/**
 * The collector's projects on device data, from the account's `/v1/me` (D24). Memberships carry the
 * project, its organization id, the role and the Training flag; the organization's name comes from the
 * account's organization memberships. Training belongs to an organization the observer is not a member
 * of, so its name falls back to "DECA Mark".
 *
 * Training opens the practice sites that ship with the app. Every other project lists the sites its
 * managers created, read from the DECA Mark API (MOB-14); it never claims bundled sites as its own.
 */

/** The organization name when the account is not a member of the project's organization. */
export const FALLBACK_ORG = "DECA Mark";

const TRAINING_FIXTURE = PREVIEW_PROJECTS.find((project) => project.training);
const TRAINING_SUMMARY =
  TRAINING_FIXTURE?.summary ?? "Practice every step · never in research exports";
const TRAINING_SITE_IDS = TRAINING_FIXTURE?.siteIds ?? [];

export function deviceProjects(
  projects: Identity["project_memberships"],
  organizations: Identity["organization_memberships"],
  hostedSiteIds: (projectId: string) => string[] = () => [],
): PreviewProject[] {
  return projects.map((membership) => {
    const org =
      organizations.find((entry) => entry.organization_id === membership.organization_id)?.name ??
      FALLBACK_ORG;
    return {
      id: membership.project_id,
      name: membership.name,
      org,
      summary: membership.is_training ? TRAINING_SUMMARY : `${org} · ${membership.role} access`,
      siteIds: membership.is_training
        ? [...TRAINING_SITE_IDS]
        : hostedSiteIds(membership.project_id),
      training: membership.is_training,
    };
  });
}
