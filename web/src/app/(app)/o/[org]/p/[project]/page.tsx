import type { Metadata } from "next";

import { StubPage } from "@/features/shell/StubPage";
import { getProject, SNAPSHOT_LABEL } from "@/fixtures";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project } = await params;
	const name = getProject(org, project)?.name ?? project;
	return (
		<StubPage
			title="What came back from the field"
			lead={`${name} · snapshot ${SNAPSHOT_LABEL}. Records still on devices are not counted here.`}
			screen="Overview"
			keepInProduction
		/>
	);
}
