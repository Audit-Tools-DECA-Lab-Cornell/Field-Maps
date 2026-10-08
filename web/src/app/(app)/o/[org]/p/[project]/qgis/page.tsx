import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { markerPositions } from "@/features/data/markers";
import { QgisScreen } from "@/features/qgis/QgisScreen";
import { getProject, getSite, observationsFor, PREVIEW_NOW, sitesIn } from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

export const metadata: Metadata = { title: "QGIS" };

/** QGIS (project-05): map packages in, a typed read-only layer out. */
export default async function QgisPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project: slug } = await params;
	const project = getProject(org, slug);
	if (!project) notFound();
	const records = observationsFor(slug);
	const siteSlug = records[0]?.siteSlug ?? sitesIn(slug)[0]?.slug;
	const site = siteSlug ? getSite(slug, siteSlug) : undefined;
	const positions = site ? markerPositions(loadProjectedSite(site.geometry), records) : {};

	return (
		<QgisScreen
			org={org}
			project={slug}
			projectName={project.name}
			positions={positions}
			fileStem={`${slug}-qgis-scope-${PREVIEW_NOW.toISOString().slice(0, 10)}`}
		/>
	);
}
