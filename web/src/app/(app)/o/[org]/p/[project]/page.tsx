import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtonLink } from "@/components/contour/Button";
import { PageHeader } from "@/components/contour/PageHeader";
import { ActivityIsland } from "@/features/overview/ActivityIsland";
import { BlockingIsland } from "@/features/overview/BlockingIsland";
import { CoverageIsland } from "@/features/overview/CoverageIsland";
import { FieldReturnIsland } from "@/features/overview/FieldReturnIsland";
import { projectHref } from "@/features/shell/navigation";
import {
	activePackage,
	ACTIVITY,
	blockingItems,
	coverageFor,
	getProject,
	observationsFor,
	sitesIn,
	SNAPSHOT_LABEL,
	zonesFor
} from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

export const metadata: Metadata = { title: "Overview" };

/**
 * The project's Overview (project-01): what came back from the field, coverage by zone against the
 * illustrative target, what is blocking, and recent activity. Records still on devices are never counted.
 */
export default async function OverviewPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project: slug } = await params;
	const project = getProject(org, slug);
	if (!project) notFound();

	const base = projectHref(org, slug);
	const records = observationsFor(slug);
	// The site the field return is about: where the observations are, or the project's first counted site.
	const site =
		sitesIn(slug).find(entry => entry.slug === records[0]?.siteSlug) ??
		sitesIn(slug).find(entry => !entry.training && entry.zoneSlugs.length > 0);
	const projected = site ? loadProjectedSite(site.geometry) : null;
	const zoneHrefs = Object.fromEntries(
		(site ? zonesFor(site.slug) : []).map(zone => [zone.slug, `${base}/sites/${site?.slug}/zones/${zone.slug}`])
	);
	const counted = project.counted && records.length > 0;

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="What came back from the field"
				lead={`${project.name} · snapshot ${SNAPSHOT_LABEL}. Records still on devices are not counted here.`}
				actions={
					<ButtonLink href={`${base}/data?review=notReviewed`} iconRight="arrow-right">
						Review observations
					</ButtonLink>
				}
			/>
			<FieldReturnIsland org={org} project={project} />
			<div className="grid gap-6 xl:grid-cols-[minmax(0,4fr)_minmax(0,3fr)] xl:items-start">
				<CoverageIsland
					site={projected}
					siteName={site?.name ?? ""}
					siteHref={site ? `${base}/sites/${site.slug}` : `${base}/sites`}
					sitesHref={`${base}/sites`}
					mapVersion={(site && activePackage(site.slug)?.version) ?? "v1"}
					coverage={site ? coverageFor(slug, site.slug) : []}
					target={project.target}
					zoneHrefs={zoneHrefs}
				/>
				<div className="flex flex-col gap-6">
					<BlockingIsland items={counted ? blockingItems(org, slug) : []} />
					<ActivityIsland items={counted ? ACTIVITY : []} dataHref={`${base}/data`} />
				</div>
			</div>
		</div>
	);
}
