import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SavedViewsScreen } from "@/features/reports/SavedViewsScreen";
import { getProject } from "@/fixtures";

export const metadata: Metadata = { title: "Saved views" };

/** Saved filter views (project-17, proposal U7). */
export default async function SavedViewsPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project } = await params;
	if (!getProject(org, project)) notFound();
	return <SavedViewsScreen org={org} project={project} />;
}
