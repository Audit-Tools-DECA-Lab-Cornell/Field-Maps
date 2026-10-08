import type { Metadata } from "next";

import { ProjectFormsScreen } from "@/features/forms/ProjectFormsScreen";

export const metadata: Metadata = { title: "Project forms" };

/** Project forms (project-11). The old /instrument address redirects here (next.config.ts). */
export default async function FormsPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project } = await params;
	return <ProjectFormsScreen org={org} project={project} />;
}
