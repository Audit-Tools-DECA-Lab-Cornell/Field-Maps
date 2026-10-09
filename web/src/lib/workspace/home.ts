import type { OrgRef, OrgRole, ProjectRef, WorkspaceIndex } from "./types";

/**
 * Where `/o` sends a signed-in person, in order:
 *
 * 1. the place they were last (the `fm-place` cookie), while they still belong there;
 * 2. their only project (observers go to their organization's collect page instead);
 * 3. their first organization, owned before administered before joined, then by name; observers whose
 *    every project there is an observer project go to its collect page;
 * 4. nowhere (null): the shell says they are not in a project yet and offers "Enter a join code".
 *
 * An owner or admin of an organization without projects still lands on it, where they can create one.
 * An unavailable index also returns null; the caller shows the failure instead.
 */

const ROLE_RANK: Record<OrgRole, number> = { owner: 0, admin: 1, member: 2 };

/** A path the cookie may hold: `/o/<slug>` and below, with nothing that leaves the site. */
const SAFE_PATH = /^\/o\/[A-Za-z0-9_-]+(?:\/[A-Za-z0-9._~-]+)*\/?$/;

export function projectPath(project: ProjectRef): string {
	return project.role === "observer" ? collectPath(project.orgSlug) : `/o/${project.orgSlug}/p/${project.code}`;
}

export function collectPath(orgSlug: string): string {
	return `/o/${orgSlug}/collect`;
}

/** The remembered path, when it is a real place and the person still belongs there. */
function remembered(index: WorkspaceIndex, path: string | undefined): string | null {
	if (!path) return null;
	const clean = path.split(/[?#]/, 1)[0] ?? "";
	if (!SAFE_PATH.test(clean) || clean.includes("..")) return null;
	const [, , orgSlug, section, code] = clean.replace(/\/$/, "").split("/");
	const org = index.orgs.find(entry => entry.slug === orgSlug);
	const projects = index.projects.filter(entry => entry.orgSlug === orgSlug);
	if (section === "p") {
		const project = projects.find(entry => entry.code === code);
		if (!project) return null;
		return project.role === "observer" ? collectPath(project.orgSlug) : clean.replace(/\/$/, "");
	}
	if (section === "collect") return projects.some(entry => entry.role === "observer") ? clean : null;
	return org ? clean.replace(/\/$/, "") : null;
}

function firstOrg(orgs: readonly OrgRef[]): OrgRef | undefined {
	return [...orgs].sort(
		(a, b) =>
			ROLE_RANK[a.role] - ROLE_RANK[b.role] || a.name.localeCompare(b.name, "en") || a.slug.localeCompare(b.slug)
	)[0];
}

export function homeFor(index: WorkspaceIndex, rememberedPath?: string): string | null {
	if (index.status !== "ready") return null;
	const kept = remembered(index, rememberedPath);
	if (kept) return kept;

	const { projects } = index;
	if (projects.length === 1) return projectPath(projects[0]!);

	if (projects.length === 0) {
		const managed = firstOrg(index.orgs.filter(org => org.role === "owner" || org.role === "admin"));
		return managed ? `/o/${managed.slug}` : null;
	}

	const withProjects = index.orgs.filter(org => projects.some(project => project.orgId === org.id));
	const org = firstOrg(withProjects.length > 0 ? withProjects : index.orgs);
	if (!org) return projectPath(projects[0]!);
	const inOrg = projects.filter(project => project.orgId === org.id);
	if (inOrg.length > 0 && inOrg.every(project => project.role === "observer")) return collectPath(org.slug);
	return `/o/${org.slug}`;
}
