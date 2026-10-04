import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ShellMain, ShellTabsRow } from "@/components/shell/ShellMain";
import { ProjectTabs } from "@/components/shell/WorkspaceTabs";
import { AccessGate } from "@/features/shell/AccessGate";
import { getProject } from "@/fixtures";

/** A project's pages under its eight tabs (D21). An unknown project is the in-shell 404. */
export default async function ProjectLayout({
	children,
	params
}: Readonly<{ children: ReactNode; params: Promise<{ org: string; project: string }> }>) {
	const { org, project } = await params;
	if (!getProject(org, project)) notFound();
	return (
		<>
			<ShellTabsRow>
				<ProjectTabs org={org} project={project} />
			</ShellTabsRow>
			<ShellMain afterTabs>
				<AccessGate>{children}</AccessGate>
			</ShellMain>
		</>
	);
}
