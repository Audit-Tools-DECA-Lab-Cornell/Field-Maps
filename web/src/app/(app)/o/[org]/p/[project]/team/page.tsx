import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TeamScreen } from "@/features/team/TeamScreen";
import { getOrg, getProject } from "@/fixtures";

export const metadata: Metadata = { title: "Team" };

/** Project team (project-04). */
export default async function TeamPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project: slug } = await params;
	const project = getProject(org, slug);
	if (!project) notFound();
	return <TeamScreen project={slug} projectName={project.name} orgName={getOrg(org)?.name ?? org} />;
}
