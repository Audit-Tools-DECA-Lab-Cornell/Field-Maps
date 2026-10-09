import type { Metadata } from "next";

import { PageHeader } from "@/components/contour/PageHeader";
import { LoadFailure } from "@/components/shell/LoadFailure";
import { transferCandidates } from "@/features/org/members/rules";
import { OrgNoAccess } from "@/features/org/NoAccess";
import { readOrg } from "@/features/org/read";
import { SettingsScreen } from "@/features/org/settings/SettingsScreen";
import { orgTimeZone } from "@/features/org/timezone";
import { memberName } from "@/features/people/names";
import { getOrganization, getWorkspace, listOrgMembers, listOrgProjects } from "@/lib/api/workspace";
import { orgAbilities } from "@/lib/workspace/access";
import { settle } from "@/lib/workspace/result";

export const metadata: Metadata = { title: "Organization settings" };

/**
 * Organization settings, for owners and admins only (the organization read is an owner/admin read, so
 * anyone else gets the no-access state without a request). Owners also read the members, to choose who
 * ownership can pass to.
 */
export default async function OrgSettingsPage({ params }: { params: Promise<{ org: string }> }) {
	const { org: address } = await params;
	const found = await readOrg(address);
	if (!found.ok) return <LoadFailure failure={found.failure} what="the settings" />;
	const org = found.data;
	const abilities = orgAbilities(org.role);
	if (!abilities.manage)
		return <OrgNoAccess what="the settings" noAccess="Only organization owners and admins can open Settings." />;

	const [organization, projects, members, workspace] = await Promise.all([
		settle(getOrganization(org.id)),
		settle(listOrgProjects(org.id)),
		abilities.manageOwners ? settle(listOrgMembers(org.id)) : Promise.resolve(null),
		getWorkspace()
	]);
	if (!organization.ok)
		return (
			<div className="flex flex-col gap-6">
				<PageHeader title="Settings" lead={`The name and web address of ${org.name}.`} />
				<LoadFailure failure={organization.failure} what="the settings" />
			</div>
		);

	const candidates = members?.ok
		? transferCandidates(members.data, workspace.account.userId).map(member => ({
				userId: member.user_id,
				name: memberName(member),
				role: member.role,
				addedAt: member.granted_at
			}))
		: null;

	return (
		<SettingsScreen
			org={{ id: org.id, slug: organization.data.slug, name: organization.data.name, role: org.role }}
			details={{
				createdAt: organization.data.created_at,
				plan: organization.data.plan,
				dataRegion: organization.data.data_region
			}}
			timeZone={orgTimeZone(projects.ok ? projects.data : [])}
			canTransfer={abilities.manageOwners}
			candidates={candidates}
			candidatesFailure={members && !members.ok ? members.failure : null}
		/>
	);
}
