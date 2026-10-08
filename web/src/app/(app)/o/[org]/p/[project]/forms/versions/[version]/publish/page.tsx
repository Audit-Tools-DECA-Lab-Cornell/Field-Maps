import type { Metadata } from "next";

import { PublishScreen } from "@/features/forms/PublishScreen";

type Params = { org: string; project: string; version: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
	const { version } = await params;
	return { title: `Review publication · ${decodeURIComponent(version)}` };
}

/** Review publication (project-14): the draft's differences, the field effects and the open blockers. */
export default async function PublishPage({ params }: { params: Promise<Params> }) {
	const { org, project, version } = await params;
	return <PublishScreen org={org} project={project} versionId={decodeURIComponent(version)} />;
}
