import type { Metadata } from "next";

import { PageHeader } from "@/components/contour/PageHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { CreateProjectDialog } from "@/features/org/projects/CreateProjectDialog";
import { ProjectList } from "@/features/org/projects/ProjectList";
import {
	countsFromSites,
	listedProjects,
	type ProjectCounts,
	type ProjectRow,
	SITE_READ_LIMIT
} from "@/features/org/projects/rows";
import { readOrg } from "@/features/org/read";
import { orgTimeZone } from "@/features/org/timezone";
import { listOrgProjects, listSites } from "@/lib/api/workspace";
import { plural } from "@/lib/labels";
import { orgAbilities } from "@/lib/workspace/access";
import { settle } from "@/lib/workspace/result";

export const metadata: Metadata = { title: "Projects" };

/**
 * The organization's projects: the ones this person can open, each with its role, status and size. Sites
 * are read for the first 12 projects, in parallel; a project whose sites could not be read says so
 * instead of showing zero. Owners and admins create projects here.
 */
export default async function OrgProjectsPage({ params }: { params: Promise<{ org: string }> }) {
	const { org: address } = await params;
	const found = await readOrg(address);
	if (!found.ok) return <LoadFailure failure={found.failure} what="the projects" />;
	const org = found.data;
	const canCreate = orgAbilities(org.role).createProject;

	const listed = await settle(listOrgProjects(org.id));
	if (!listed.ok)
		return (
			<div className="flex flex-col gap-6">
				<PageHeader title="Projects" lead={org.name} />
				<LoadFailure failure={listed.failure} what="the projects" />
			</div>
		);

	const projects = listedProjects(listed.data);
	const counted = projects.slice(0, SITE_READ_LIMIT);
	const sites = await Promise.all(counted.map(project => settle(listSites(project.project_id))));

	const rows: ProjectRow[] = projects.map((project, index) => {
		const read = sites[index];
		const counts: ProjectCounts = !read
			? { state: "skipped" }
			: read.ok
				? countsFromSites(read.data)
				: { state: "failed" };
		return {
			id: project.project_id,
			code: project.code,
			name: project.name,
			description: project.description?.trim() || null,
			role: project.role,
			status: project.status,
			counts
		};
	});

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Projects"
				lead={`${org.name} · ${plural(rows.length, "project")}`}
				actions={
					canCreate ? (
						<CreateProjectDialog
							orgId={org.id}
							orgSlug={org.slug}
							defaultTimeZone={orgTimeZone(projects)}
							takenCodes={listed.data.map(project => project.code)}
						/>
					) : undefined
				}
			/>
			<ProjectList orgSlug={org.slug} rows={rows} canCreate={canCreate} />
			{rows.length > SITE_READ_LIMIT && (
				<p className="type-small text-ink-2">
					Sites and observations are counted for the first {SITE_READ_LIMIT} projects. Open any other project
					to see its own.
				</p>
			)}
		</div>
	);
}
