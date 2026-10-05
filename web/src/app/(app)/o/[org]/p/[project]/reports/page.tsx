import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReportsScreen } from "@/features/reports/ReportsScreen";
import { getProject, REPORTS, sitesIn } from "@/fixtures";

export const metadata: Metadata = { title: "Reports" };

/** Reports and saved views (project-15, proposal U7). */
export default async function ReportsPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project: slug } = await params;
	if (!getProject(org, slug)) notFound();
	const sites = sitesIn(slug).map(site => site.slug);
	return (
		<ReportsScreen org={org} project={slug} reports={REPORTS.filter(report => sites.includes(report.siteSlug))} />
	);
}
