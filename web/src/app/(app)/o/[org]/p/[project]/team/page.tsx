import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/contour/PageHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { teamInvitations, teamMember } from "@/features/team/rules";
import { TeamScreen } from "@/features/team/TeamScreen";
import {
	getProject,
	getWorkspace,
	listProjectInvitations,
	listProjectMembers,
	resolveOrg,
	resolveProject
} from "@/lib/api/workspace";
import { stateOf } from "@/lib/contour";
import { orgAbilities, projectAbilities } from "@/lib/workspace/access";
import { settle } from "@/lib/workspace/result";

export const metadata: Metadata = { title: "Team" };

/**
 * Project team (project-04): members and waiting invitations. Only managers may read either list, so the
 * page checks the role first and never calls those endpoints for anyone else; a viewer who opens this
 * address gets the no-access state, not the team.
 */
export default async function TeamPage({ params }: { params: Promise<{ org: string; project: string }> }) {
	const { org, project: code } = await params;
	const [ref, orgRef] = await Promise.all([resolveProject(org, code), resolveOrg(org)]);
	if (!ref) notFound();

	if (!projectAbilities(ref.role).manage) {
		return (
			<div className="flex flex-col gap-6">
				<PageHeader title="Project team" />
				<LoadFailure
					failure={{
						code: "role_required",
						kind: "rejected",
						message: `You are a ${stateOf("role", ref.role).label.toLowerCase()} on ${ref.name}. Ask a project manager if you need to invite or remove people.`
					}}
					what="the team"
					noAccess="Only project managers can open the team."
				/>
			</div>
		);
	}

	const [project, members, invitations, workspace] = await Promise.all([
		settle(getProject(ref.id)),
		settle(listProjectMembers(ref.id)),
		settle(listProjectInvitations(ref.id)),
		getWorkspace()
	]);
	// The project's timezone decides how every date on the page reads, so without it there is no page.
	if (!project.ok) {
		return (
			<div className="flex flex-col gap-6">
				<PageHeader title="Project team" />
				<LoadFailure
					failure={project.failure}
					what="the team"
					noAccess="Only project managers can open the team."
				/>
			</div>
		);
	}

	return (
		<TeamScreen
			context={{ org, project: code, projectId: ref.id }}
			projectName={project.data.name}
			timeZone={project.data.timezone}
			currentUserId={workspace.account.userId}
			nowIso={new Date().toISOString()}
			members={members.ok ? { ok: true, data: members.data.map(teamMember) } : members}
			invitations={invitations.ok ? { ok: true, data: teamInvitations(invitations.data) } : invitations}
			canOpenOrgMembers={orgAbilities(orgRef?.role ?? null).manage}
		/>
	);
}
