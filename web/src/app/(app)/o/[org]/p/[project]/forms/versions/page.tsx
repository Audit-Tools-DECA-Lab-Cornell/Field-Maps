import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/contour/PageHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { FormVersionsScreen } from "@/features/forms/FormVersionsScreen";
import { formRows } from "@/features/forms/model";
import { getProject, listForms, listSites, resolveProject } from "@/lib/api/workspace";
import { projectAbilities } from "@/lib/workspace/access";
import { settle } from "@/lib/workspace/result";

export const metadata: Metadata = { title: "Form versions" };

/**
 * Form versions: the versions of the form named in the address (`?form=<code>`), or of every form. Drafts
 * come from the API only for managers, so a reader's table lists published and retired versions alone.
 */
export default async function FormVersionsPage({
	params,
	searchParams
}: {
	params: Promise<{ org: string; project: string }>;
	searchParams: Promise<{ form?: string | string[] }>;
}) {
	const [{ org, project: code }, query] = await Promise.all([params, searchParams]);
	const requested = typeof query.form === "string" && query.form !== "" ? query.form : null;
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
				<PageHeader title="Form versions" />
				<LoadFailure
					failure={failed ?? { code: "unknown", kind: "retry", message: "" }}
					what="the form versions"
				/>
			</div>
		);

	const rows = formRows(forms.data, sites.ok ? sites.data : []);
	return (
		<FormVersionsScreen
			org={org}
			project={code}
			forms={requested ? rows.filter(form => form.code === requested) : rows}
			requested={requested}
			timeZone={project.data.timezone}
			canManage={projectAbilities(ref.role).manage}
			sitesProblem={sites.ok ? null : sites.failure.message}
		/>
	);
}
