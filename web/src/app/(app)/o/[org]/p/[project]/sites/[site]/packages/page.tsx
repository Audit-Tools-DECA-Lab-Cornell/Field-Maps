import type { Metadata } from "next";

import { isPackageStep } from "@/features/packages/model";
import { PackagesScreen } from "@/features/packages/PackagesScreen";
import { SessionPackagesPage } from "@/features/packages/SessionPackages";
import { getSite } from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

type Params = { org: string; project: string; site: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
	const { project, site } = await params;
	const found = getSite(project, site);
	return { title: found ? `${found.name} map packages` : "Map packages" };
}

/** A site's map packages. The old /basemaps address redirects here (next.config.ts). */
export default async function PackagesPage({
	params,
	searchParams
}: {
	params: Promise<Params>;
	searchParams: Promise<{ step?: string | string[] }>;
}) {
	const [{ org, project, site: slug }, query] = await Promise.all([params, searchParams]);
	const step = isPackageStep(query.step) ? query.step : undefined;
	const site = getSite(project, slug);
	// A site made with "Create site" lives only in this tab's preview, so the browser resolves it.
	if (!site) return <SessionPackagesPage org={org} project={project} slug={slug} step={step} />;
	return (
		<PackagesScreen
			org={org}
			project={project}
			site={{ slug: site.slug, name: site.name }}
			plan={loadProjectedSite(site.geometry)}
			step={step}
		/>
	);
}
