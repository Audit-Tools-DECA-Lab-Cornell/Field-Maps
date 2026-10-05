import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SettingsScreen } from "@/features/project-settings/SettingsScreen";
import { getProject } from "@/fixtures";

export const metadata: Metadata = { title: "Project settings" };

/** Project settings (project-19). */
export default async function SettingsPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project } = await params;
	if (!getProject(org, project)) notFound();
	return <SettingsScreen org={org} project={project} />;
}
