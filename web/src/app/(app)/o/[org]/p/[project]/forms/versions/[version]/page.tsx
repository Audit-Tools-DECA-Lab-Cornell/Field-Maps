import type { Metadata } from "next";

import { DraftEditorScreen } from "@/features/forms/DraftEditorScreen";
import { previewSession } from "@/features/forms/session";
import { formVersion } from "@/fixtures";

type Params = { org: string; project: string; version: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
	const { version } = await params;
	const found = formVersion(version);
	return { title: found && found.state !== "draft" ? `Form ${version}` : `Draft form editor · ${version}` };
}

/**
 * The draft form editor (project-13). A draft made with "Create form draft" lives only in this tab's
 * preview, so the browser resolves the version; a published one opens read-only.
 */
export default async function FormVersionPage({ params }: { params: Promise<Params> }) {
	const { org, project, version } = await params;
	return (
		<DraftEditorScreen
			org={org}
			project={project}
			versionId={decodeURIComponent(version)}
			session={previewSession(project)}
		/>
	);
}
