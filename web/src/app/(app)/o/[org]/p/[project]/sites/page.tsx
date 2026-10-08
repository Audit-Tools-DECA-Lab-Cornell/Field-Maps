import type { Metadata } from "next";

import { SitesScreen } from "@/features/sites/SitesScreen";
import { sitesIn } from "@/fixtures";
import type { ProjectedSite } from "@/lib/plan";
import { loadProjectedSite } from "@/lib/plan-sites";

export const metadata: Metadata = { title: "Sites" };

export default async function SitesPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project } = await params;
	const plans: Record<string, ProjectedSite> = {};
	for (const site of sitesIn(project)) plans[site.slug] = loadProjectedSite(site.geometry);
	return <SitesScreen org={org} project={project} plans={plans} />;
}
