"use client";

import { useParams } from "next/navigation";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import { type OrgAbilities, orgAbilities, type ProjectAbilities, projectAbilities } from "@/lib/workspace/access";
import type { AccountSummary, OrgRef, ProjectRef, WorkspaceIndex } from "@/lib/workspace/types";

/**
 * The signed-in person's workspace for the shell: who they are, the organizations and projects they can
 * open, and their role in each. The `(app)` layout reads it once per request (`getWorkspace()`) and hands
 * it down here, so the header, switchers, tabs, account menu, shortcuts and palette agree with the API.
 */

const WorkspaceContext = createContext<WorkspaceIndex | null>(null);

/** Outside the workspace (the public 404 page) there is nobody to place: no organizations, no projects. */
const NOBODY: WorkspaceIndex = {
	status: "unavailable",
	account: { userId: null, name: "Your account", initials: "?" },
	orgs: [],
	projects: []
};

export function WorkspaceProvider({ value, children }: { value: WorkspaceIndex; children: ReactNode }) {
	return <WorkspaceContext value={value}>{children}</WorkspaceContext>;
}

export type Workspace = {
	index: WorkspaceIndex;
	/** False outside the workspace layout, where `index` is empty. */
	mounted: boolean;
	account: AccountSummary;
	/** The organization in the address, when the person belongs to it. */
	org: OrgRef | null;
	/** The project in the address, when the person belongs to it. */
	project: ProjectRef | null;
	/** What the person may do in `org` (nothing when there is none). */
	orgAbilities: OrgAbilities;
	/** What the person may do in `project` (nothing when there is none). */
	projectAbilities: ProjectAbilities;
	/** The person's projects in `org`, in the order the API listed them. */
	orgProjects: ProjectRef[];
};

/** The workspace, placed at the page's address: `/o/<org>` and `/o/<org>/p/<project>`. */
export function useWorkspace(): Workspace {
	const provided = useContext(WorkspaceContext);
	const params = useParams<{ org?: string; project?: string }>();
	const orgSlug = typeof params?.org === "string" ? params.org : undefined;
	const projectCode = typeof params?.project === "string" ? params.project : undefined;

	return useMemo(() => {
		const index = provided ?? NOBODY;
		const org = orgSlug ? (index.orgs.find(entry => entry.slug === orgSlug) ?? null) : null;
		const orgProjects = org ? index.projects.filter(entry => entry.orgId === org.id) : [];
		const project = projectCode ? (orgProjects.find(entry => entry.code === projectCode) ?? null) : null;
		return {
			index,
			mounted: provided !== null,
			account: index.account,
			org,
			project,
			orgAbilities: orgAbilities(org?.role ?? null),
			projectAbilities: projectAbilities(project?.role ?? null),
			orgProjects
		};
	}, [provided, orgSlug, projectCode]);
}
