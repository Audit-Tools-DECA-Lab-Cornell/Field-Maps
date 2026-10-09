import type { Metadata } from "next";

import { PageHeader } from "@/components/contour/PageHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { MembersScreen } from "@/features/org/members/MembersScreen";
import { OrgNoAccess } from "@/features/org/NoAccess";
import { readOrg } from "@/features/org/read";
import { orgTimeZone } from "@/features/org/timezone";
import { getWorkspace, listOrgInvitations, listOrgMembers, listOrgProjects } from "@/lib/api/workspace";
import { orgAbilities } from "@/lib/workspace/access";
import { settle } from "@/lib/workspace/result";

export const metadata: Metadata = { title: "Members" };

/**
 * Organization members and invitations, for owners and admins only: the lists are owner/admin reads, so
 * anyone else gets the no-access state without a request being made.
 */
export default async function OrgMembersPage({ params }: { params: Promise<{ org: string }> }) {
	const { org: address } = await params;
	const found = await readOrg(address);
	if (!found.ok) return <LoadFailure failure={found.failure} what="the members" />;
	const org = found.data;
	if (!orgAbilities(org.role).manage)
		return <OrgNoAccess what="the members" noAccess="Only organization owners and admins can open Members." />;

	const [members, invitations, projects, workspace] = await Promise.all([
		settle(listOrgMembers(org.id)),
		settle(listOrgInvitations(org.id)),
		settle(listOrgProjects(org.id)),
		getWorkspace()
	]);
	if (!members.ok)
		return (
			<div className="flex flex-col gap-6">
				<PageHeader title="Members" lead={`People in ${org.name}.`} />
				<LoadFailure failure={members.failure} what="the members" />
			</div>
		);

	return (
		<MembersScreen
			org={{ id: org.id, name: org.name, role: org.role }}
			currentUserId={workspace.account.userId}
			members={members.data}
			invitations={invitations.ok ? invitations.data : null}
			invitationsFailure={invitations.ok ? null : invitations.failure}
			nowIso={new Date().toISOString()}
			timeZone={orgTimeZone(projects.ok ? projects.data : [])}
		/>
	);
}
