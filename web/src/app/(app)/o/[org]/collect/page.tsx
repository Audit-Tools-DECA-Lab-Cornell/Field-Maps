import type { Metadata } from "next";

import { LoadFailure } from "@/components/shell/LoadFailure";
import { ShellMain } from "@/components/shell/ShellMain";
import { androidAppUrl } from "@/features/auth/androidApp";
import { CollectHandoff } from "@/features/shell/CollectHandoff";
import { UNKNOWN_ERROR_COPY } from "@/lib/api/errors";
import { getWorkspace } from "@/lib/api/workspace";

export const metadata: Metadata = { title: "Collect with the app" };

/**
 * The observer handoff: the projects the signed-in person observes in this organization, read from their
 * own workspace, and how to continue in the app. The organization layout has already found the
 * organization among their memberships.
 */
export default async function CollectPage({ params }: { params: Promise<{ org: string }> }) {
	const { org: slug } = await params;
	const workspace = await getWorkspace();
	if (workspace.status !== "ready") {
		return (
			<ShellMain>
				<LoadFailure
					failure={workspace.failure ?? { code: "unknown", kind: "retry", message: UNKNOWN_ERROR_COPY }}
					what="your projects"
				/>
			</ShellMain>
		);
	}
	const org = workspace.orgs.find(entry => entry.slug === slug);
	const projects = workspace.projects
		.filter(project => project.orgSlug === slug && project.role === "observer")
		.map(({ code, name }) => ({ code, name }));
	return (
		<ShellMain>
			<CollectHandoff
				organization={org?.name ?? "this organization"}
				projects={projects}
				androidUrl={androidAppUrl()}
			/>
		</ShellMain>
	);
}
