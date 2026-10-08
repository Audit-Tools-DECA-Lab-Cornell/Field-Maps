import type { Metadata } from "next";
import { Suspense } from "react";

import { Island } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { ScreenState } from "@/components/contour/ScreenState";
import { DataScreen } from "@/features/data/DataScreen";
import { markerPositions } from "@/features/data/markers";
import { activePackage, getSite, observationsFor, PREVIEW_NOW, sitesIn } from "@/fixtures";
import { loadProjectedSite } from "@/lib/plan-sites";

export const metadata: Metadata = { title: "Observation data" };

/** Shown for the moment the filters are read from the address. */
function DataFallback() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Observation data" lead="One filter set for the map, table and export." />
			<Island flush aria-label="Observations">
				<ScreenState kind="loading" rows={6} />
			</Island>
		</div>
	);
}

export default async function DataPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project } = await params;
	const records = observationsFor(project);
	const siteSlug = records[0]?.siteSlug ?? sitesIn(project)[0]?.slug;
	const site = siteSlug ? getSite(project, siteSlug) : undefined;
	const projected = site ? loadProjectedSite(site.geometry) : null;
	const positions = projected ? markerPositions(projected, records) : {};
	const mapVersion = (site && activePackage(site.slug)?.version) ?? "v1";

	return (
		<Suspense fallback={<DataFallback />}>
			<DataScreen
				org={org}
				project={project}
				site={projected}
				siteName={site?.name ?? ""}
				positions={positions}
				mapVersion={mapVersion}
				fileStem={`${project}-observations-${PREVIEW_NOW.toISOString().slice(0, 10)}`}
			/>
		</Suspense>
	);
}
