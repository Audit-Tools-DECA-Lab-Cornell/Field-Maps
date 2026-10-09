import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AppHeader } from "@/components/shell/AppHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { ShellMain } from "@/components/shell/ShellMain";
import { UNKNOWN_ERROR_COPY } from "@/lib/api/errors";
import { getWorkspace, resolveOrg } from "@/lib/api/workspace";

/**
 * The organization's pages: the header for every page under /o/[org]. The organization comes from the
 * person's memberships, so no owner- or admin-only read happens here. An organization they do not belong
 * to is "not found"; a workspace that could not load says why, under the header.
 */
export default async function OrgLayout({
	children,
	params
}: Readonly<{ children: ReactNode; params: Promise<{ org: string }> }>) {
	const { org } = await params;
	const workspace = await getWorkspace();
	if (workspace.status !== "ready") {
		return (
			<>
				<AppHeader />
				<ShellMain>
					<div className="mx-auto max-w-3xl py-4 md:py-10">
						<LoadFailure
							failure={
								workspace.failure ?? { code: "unknown", kind: "retry", message: UNKNOWN_ERROR_COPY }
							}
							what="this organization"
						/>
					</div>
				</ShellMain>
			</>
		);
	}
	if (!(await resolveOrg(org))) notFound();
	return (
		<>
			<AppHeader />
			{children}
		</>
	);
}
