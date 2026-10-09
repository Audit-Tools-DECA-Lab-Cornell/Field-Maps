import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/contour/PageHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { formRows } from "@/features/forms/model";
import { ProjectFormsScreen } from "@/features/forms/ProjectFormsScreen";
import { listTemplates } from "@/features/forms/templates";
import { getProject, listForms, listSites, resolveProject } from "@/lib/api/workspace";
import { projectAbilities } from "@/lib/workspace/access";
import { settle } from "@/lib/workspace/result";

export const metadata: Metadata = { title: "Forms" };

/**
 * Forms: each form with its published version, its draft (managers only; the API sends drafts to nobody
 * else), its question count and the sites whose current map package uses it. A list that cannot load is a
 * load failure, never "No forms yet".
 */
export default async function FormsPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project: code } = await params;
	const ref = await resolveProject(org, code);
	if (!ref) notFound();

	const [forms, sites, project] = await Promise.all([
		settle(listForms(ref.id)),
		settle(listSites(ref.id)),
		settle(getProject(ref.id))
	]);
	const failed = !forms.ok ? forms.failure : !project.ok ? project.failure : null;
	if (failed || !forms.ok || !project.ok)
		return (
			<div className="flex flex-col gap-6">
				<PageHeader title="Forms" />
				<LoadFailure failure={failed ?? { code: "unknown", kind: "retry", message: "" }} what="the forms" />
			</div>
		);

	const canManage = projectAbilities(ref.role).manage;
	return (
		<ProjectFormsScreen
			org={org}
			project={code}
			forms={formRows(forms.data, sites.ok ? sites.data : [])}
			timeZone={project.data.timezone}
			canManage={canManage}
			templates={canManage ? listTemplates() : []}
			sitesProblem={sites.ok ? null : sites.failure.message}
		/>
	);
}
