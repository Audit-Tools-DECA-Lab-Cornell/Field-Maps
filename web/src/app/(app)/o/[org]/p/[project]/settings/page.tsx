import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/contour/PageHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { formOf } from "@/features/project-settings/rules";
import { SettingsScreen } from "@/features/project-settings/SettingsScreen";
import { getProject, resolveOrg, resolveProject } from "@/lib/api/workspace";
import { stateOf } from "@/lib/contour";
import { timeZones } from "@/lib/time";
import { projectAbilities } from "@/lib/workspace/access";
import { settle } from "@/lib/workspace/result";

export const metadata: Metadata = { title: "Project settings" };

const NO_ACCESS = "Only project managers can open the project settings.";

/**
 * Project settings (project-19). Only managers change a project, so the page checks the role first; a
 * viewer who opens this address gets the no-access state, not the form.
 */
export default async function SettingsPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project: code } = await params;
	const [ref, orgRef] = await Promise.all([resolveProject(org, code), resolveOrg(org)]);
	if (!ref) notFound();

	if (!projectAbilities(ref.role).manage) {
		return (
			<div className="flex flex-col gap-6">
				<PageHeader title="Project settings" />
				<LoadFailure
					failure={{
						code: "role_required",
						kind: "rejected",
						message: `You are a ${stateOf("role", ref.role).label.toLowerCase()} on ${ref.name}. Ask a project manager if you need to change the project’s name, timezone or status.`
					}}
					what="the project settings"
					noAccess={NO_ACCESS}
				/>
			</div>
		);
	}

	const project = await settle(getProject(ref.id));
	if (!project.ok) {
		return (
			<div className="flex flex-col gap-6">
				<PageHeader title="Project settings" />
				<LoadFailure failure={project.failure} what="the project settings" noAccess={NO_ACCESS} />
			</div>
		);
	}

	return (
		<SettingsScreen
			context={{ org, project: code, projectId: ref.id }}
			organizationName={orgRef?.name ?? "Organization"}
			saved={formOf(project.data)}
			code={project.data.code}
			status={project.data.status}
			zones={timeZones()}
		/>
	);
}
