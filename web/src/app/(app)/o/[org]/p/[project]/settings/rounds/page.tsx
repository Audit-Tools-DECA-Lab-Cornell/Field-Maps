import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RoundsScreen } from "@/features/project-settings/RoundsScreen";
import { getProject } from "@/fixtures";

export const metadata: Metadata = { title: "Rounds" };

/** Rounds (project-18, proposal U6). */
export default async function RoundsPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project } = await params;
	if (!getProject(org, project)) notFound();
	return <RoundsScreen org={org} project={project} />;
}
