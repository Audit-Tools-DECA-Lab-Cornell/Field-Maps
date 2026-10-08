import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { markerPositions } from "@/features/data/markers";
import { ObservationDetail } from "@/features/observation/ObservationDetail";
import { getSite, observationById, observationsFor } from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

type Params = { org: string; project: string; observation: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
	const { observation } = await params;
	return { title: observationById(observation)?.id ?? "Observation" };
}

/** One observation (project-03). An ID this project does not hold is the in-shell 404. */
export default async function ObservationPage({ params }: { params: Promise<Params> }) {
	const { org, project, observation } = await params;
	const record = observationById(observation);
	if (!record || record.projectSlug !== project) notFound();

	const site = getSite(project, record.siteSlug);
	const projected = site ? loadProjectedSite(site.geometry) : null;
	const positions = projected ? markerPositions(projected, observationsFor(project)) : {};

	return (
		<ObservationDetail
			org={org}
			project={project}
			id={record.id}
			site={projected}
			siteName={site?.name ?? record.siteSlug}
			siteSlug={record.siteSlug}
			positions={positions}
		/>
	);
}
