"use client";

import { Button } from "@/components/contour/Button";
import { Note } from "@/components/contour/Note";
import { PageHeader } from "@/components/contour/PageHeader";
import { usePreview } from "@/features/shell/PreviewProvider";
import { getOrg } from "@/fixtures";

import { ProjectList } from "./ProjectList";

/**
 * The organization's home, "Your projects" (org-01): every project with its state, size, the reader's role
 * and coverage, and the one action, Create project, for owners and admins.
 */
export function YourProjects({ org }: { org: string }) {
	const { canOrg, offline } = usePreview();
	const name = getOrg(org)?.name ?? org;
	const mayCreate = canOrg("createProject");

	const action =
		mayCreate && !offline ? undefined : (
			<Button
				icon="plus"
				disabled
				disabledReason={
					offline
						? "You are offline. Projects can be created once the connection returns."
						: "Only organization owners and admins can create projects."
				}>
				Create project
			</Button>
		);

	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Your projects" lead={`${name} · research workspaces`} actions={action} />
			<ProjectList org={org} />
			<Note>
				Each project has independent forms, membership and QGIS access. Organization templates are copied into
				drafts.
			</Note>
		</div>
	);
}
