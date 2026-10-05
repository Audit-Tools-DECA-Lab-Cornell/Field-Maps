import type { Metadata } from "next";

import { SessionSitePage } from "@/features/sites/SessionSite";
import { SiteScreen } from "@/features/sites/SiteScreen";
import { getSite } from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

type Params = { org: string; project: string; site: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
	const { project, site } = await params;
	return { title: getSite(project, site)?.name ?? "Site" };
}

export default async function SitePage({ params }: { params: Promise<Params> }) {
	const { org, project, site: slug } = await params;
	const site = getSite(project, slug);
	// A site made with "Create site" lives only in this tab's preview, so the browser resolves it.
	if (!site) return <SessionSitePage org={org} project={project} slug={slug} />;
	return <SiteScreen org={org} site={site} plan={loadProjectedSite(site.geometry)} />;
}
