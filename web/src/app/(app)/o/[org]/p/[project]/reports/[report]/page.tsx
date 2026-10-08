import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { markerPositions } from "@/features/data/markers";
import { ReportScreen } from "@/features/reports/ReportScreen";
import { getOrg, getProject, getSite, observationsFor, REPORTS } from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

type Params = Promise<{ org: string; project: string; report: string }>;

function findReport(project: string, slug: string) {
	const report = REPORTS.find(entry => entry.slug === slug);
	return report && getSite(project, report.siteSlug) ? report : undefined;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
	const { project, report: slug } = await params;
	return { title: findReport(project, slug)?.title ?? "Report" };
}

/** A printable summary (project-16, proposal U7). */
export default async function ReportPage({ params }: { params: Params }) {
	const { org, project: slug, report: reportSlug } = await params;
	const project = getProject(org, slug);
	const report = findReport(slug, reportSlug);
	if (!project || !report) notFound();
	const site = getSite(slug, report.siteSlug);
	const projected = site ? loadProjectedSite(site.geometry) : null;
	const positions = projected ? markerPositions(projected, observationsFor(slug, report.siteSlug)) : {};

	return (
		<ReportScreen
			org={org}
			project={slug}
			orgName={getOrg(org)?.name ?? org}
			projectName={project.name}
			report={report}
			siteName={site?.name ?? report.siteSlug}
			site={projected}
			positions={positions}
			target={project.target}
		/>
	);
}
