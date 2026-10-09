import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/contour/PageHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { SitesScreen } from "@/features/sites/SitesScreen";
import { siteView, sortSites, thumbnailSites } from "@/features/sites/view";
import { getProject, getSitePlan, listSites, resolveProject } from "@/lib/api/workspace";
import type { ProjectedSite } from "@/lib/plan";
import { clock } from "@/lib/time";
import { projectAbilities } from "@/lib/workspace/access";
import { settle } from "@/lib/workspace/result";
import type { Failure } from "@/lib/workspace/types";

export const metadata: Metadata = { title: "Sites" };

function SitesFailure({ failure }: { failure: Failure }) {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Sites" />
			<LoadFailure failure={failure} what="the sites" />
		</div>
	);
}

/**
 * Sites: the project's places with their current map package, zone count and observation count. Every
 * member reads this; managers also get Create site. A site list that cannot load is a load failure, never
 * an empty list.
 */
export default async function SitesPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project: code } = await params;
	const ref = await resolveProject(org, code);
	if (!ref) notFound();

	const [sites, project] = await Promise.all([settle(listSites(ref.id)), settle(getProject(ref.id))]);
	if (!sites.ok) return <SitesFailure failure={sites.failure} />;
	if (!project.ok) return <SitesFailure failure={project.failure} />;

	// The project's timezone decides how every date reads.
	const views = sortSites(sites.data.map(site => siteView(site, clock(project.data.timezone))));

	// A plan for the first few thumbnails. One that cannot be fetched or drawn leaves its row without a picture.
	const plans: Record<string, ProjectedSite> = {};
	await Promise.all(
		thumbnailSites(views).map(async site => {
			if (!site.package) return;
			const plan = await settle(getSitePlan(ref.id, site.package.packageId, site.name));
			if (plan.ok && plan.data) plans[site.code] = plan.data;
		})
	);

	return (
		<SitesScreen
			org={org}
			project={code}
			canManage={projectAbilities(ref.role).manage}
			sites={views}
			plans={plans}
		/>
	);
}
