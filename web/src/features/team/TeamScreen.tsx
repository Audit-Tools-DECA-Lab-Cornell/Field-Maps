"use client";

import { Fragment, useEffect, useState } from "react";

import { Avatar } from "@/components/contour/Avatar";
import { Button } from "@/components/contour/Button";
import { Island } from "@/components/contour/Island";
import { PageHeader } from "@/components/contour/PageHeader";
import { StateBadge } from "@/components/contour/StateBadge";
import { Table, TBody, Td, Th, THead, Tr } from "@/components/contour/Table";
import { useToast } from "@/components/contour/Toast";
import { usePreview } from "@/features/shell/PreviewProvider";
import { PreviewStateView } from "@/features/shell/PreviewStateView";
import { cx } from "@/lib/cx";

import { InviteDialog } from "./InviteDialog";
import { JoinCodeIsland } from "./JoinCodeIsland";
import { ReviewRoleDialog } from "./ReviewRoleDialog";
import { StackedRows } from "./StackedRows";
import { type Member, type PendingInvite, ROLE_ORDER, ROLE_PERMISSIONS, SENT_NOW, type Team, useTeam } from "./store";

export type TeamScreenProps = {
	project: string;
	projectName: string;
	orgName: string;
};

const OFFLINE_REASON = "You are offline. Invitations wait until you reconnect.";

/** Why the header's Invite member is off in a previewed screen state, if it is. */
const STATE_REASON: Partial<Record<string, string>> = {
	loading: "The team is still loading.",
	error: "The team did not load. Try again first.",
	"no-access": "Your role cannot change this team."
};

function plural(count: number, one: string, many: string): string {
	return `${count} ${count === 1 ? one : many}`;
}

/**
 * Project team (project-04): members and their project roles, pending invitations, the observer join code
 * shown once, and what each role allows. Every change is a session-only preview.
 */
export function TeamScreen({ project, projectName, orgName }: TeamScreenProps) {
	const team = useTeam(project);
	const { screenState, offline } = usePreview();
	const reason = offline ? OFFLINE_REASON : STATE_REASON[screenState];

	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Project team"
				lead="Project roles govern collection, review and reader access."
				actions={<InviteDialog projectName={projectName} team={team} disabledReason={reason} />}
			/>
			<div className="grid gap-6 lg:grid-cols-[minmax(0,27fr)_minmax(0,20fr)] lg:items-start">
				<div className="flex min-w-0 flex-col gap-6">
					<MembersIsland team={team} projectName={projectName} />
					<InvitationsIsland team={team} />
				</div>
				<div className="flex min-w-0 flex-col gap-6">
					<JoinCodeIsland team={team} projectName={projectName} orgName={orgName} />
					<RolesIsland />
				</div>
			</div>
		</div>
	);
}

function PersonCell({ member }: { member: Member }) {
	return (
		<div className="flex items-center gap-3 py-2">
			<Avatar initials={member.person.initials} size="sm" />
			<div className="min-w-0">
				<p className="font-semibold text-ink">
					{member.person.name}
					{member.you && <span className="font-normal"> (you)</span>}
				</p>
				<p className="type-small break-words text-ink-2">{member.person.email}</p>
			</div>
		</div>
	);
}

function MembersIsland({ team, projectName }: { team: Team; projectName: string }) {
	const { screenState, offline } = usePreview();
	const live = screenState === "normal" || screenState === "offline";
	const review = (member: Member) => (
		<ReviewRoleDialog member={member} team={team} projectName={projectName} disabled={offline} />
	);
	return (
		<Island
			flush
			className="relative"
			title="Members"
			meta={live ? plural(team.members.length, "person", "people") : undefined}>
			<PreviewStateView
				loadingLabel="Loading members…"
				rows={3}
				headingLevel={3}
				empty={{
					icon: "users",
					title: "No members yet",
					body: "Invite the people who collect, review or read this project's observations."
				}}
				filtered={{
					title: "No members match this view",
					body: "Change your filters to see more people. Nobody's role has changed."
				}}>
				<div className="hidden sm:block">
					<Table caption={`Members of ${projectName}`}>
						<THead>
							<tr>
								<Th>Person</Th>
								<Th>Role</Th>
								<Th>Collects as</Th>
								<Th>
									<span className="sr-only">Actions</span>
								</Th>
							</tr>
						</THead>
						<TBody>
							{team.members.map(member => (
								<Tr key={member.person.id}>
									<Td>
										<PersonCell member={member} />
									</Td>
									<Td nowrap>
										<StateBadge kind="role" state={member.role} />
									</Td>
									<Td mono>{member.collectsAs ?? <span className="text-ink-2">None</span>}</Td>
									<Td className="text-right">{review(member)}</Td>
								</Tr>
							))}
						</TBody>
					</Table>
				</div>
				<StackedRows
					label={`Members of ${projectName}`}
					rows={team.members.map(member => ({
						key: member.person.id,
						title: <PersonCell member={member} />,
						fields: [
							{ label: "Role", value: <StateBadge kind="role" state={member.role} size="sm" /> },
							{ label: "Collects as", value: member.collectsAs ?? "None", mono: true }
						],
						actions: review(member)
					}))}
				/>
			</PreviewStateView>
		</Island>
	);
}

/* An inline action in a dense row: words, not a pill (DESIGN §5, TextLink). */
const ROW_ACTION =
	"inline-flex min-h-touch items-center rounded-input px-1 font-semibold underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-ink-2 disabled:no-underline";

/** Focuses the one copy of a control that is on screen: the table and the stacked cards each render one. */
function focusShown(selector: string) {
	const shown = [...document.querySelectorAll<HTMLElement>(selector)].find(node => node.offsetParent !== null);
	shown?.focus();
}

function InvitationsIsland({ team }: { team: Team }) {
	const { toast } = useToast();
	const { screenState, offline } = usePreview();
	const [confirming, setConfirming] = useState<string | null>(null);
	const live = screenState === "normal" || screenState === "offline";

	useEffect(() => {
		if (confirming) focusShown(`[data-keep-invite="${CSS.escape(confirming)}"]`);
	}, [confirming]);

	function closeConfirm(email: string) {
		setConfirming(null);
		requestAnimationFrame(() => focusShown(`[data-revoke-invite="${CSS.escape(email)}"]`));
	}

	function resend(invite: PendingInvite) {
		const previous = invite.sentLabel;
		team.update(current => ({ ...current, resent: { ...current.resent, [invite.email]: SENT_NOW } }));
		toast({
			title: `Invitation to ${invite.email} resent in this preview`,
			description: "No email was sent.",
			action: {
				label: "Undo",
				altText: "Undo the resend",
				onClick: () =>
					team.update(current => ({ ...current, resent: { ...current.resent, [invite.email]: previous } }))
			}
		});
	}

	function revoke(invite: PendingInvite) {
		setConfirming(null);
		team.update(current => ({ ...current, revoked: [...current.revoked, invite.email] }));
		toast({
			title: `Invitation to ${invite.email} revoked`,
			description: "In this preview only.",
			action: {
				label: "Undo",
				altText: "Undo the revoke",
				onClick: () =>
					team.update(current => ({
						...current,
						revoked: current.revoked.filter(email => email !== invite.email)
					}))
			}
		});
	}

	const actions = (invite: PendingInvite) => (
		<span className="inline-flex gap-4">
			<button
				type="button"
				className={cx(ROW_ACTION, "text-accent")}
				disabled={offline}
				aria-label={`Resend the invitation to ${invite.email}`}
				onClick={() => resend(invite)}>
				Resend
			</button>
			<button
				type="button"
				data-revoke-invite={invite.email}
				className={cx(ROW_ACTION, "text-ink")}
				disabled={offline}
				aria-expanded={confirming === invite.email}
				aria-label={`Revoke the invitation to ${invite.email}`}
				onClick={() => setConfirming(current => (current === invite.email ? null : invite.email))}>
				Revoke
			</button>
		</span>
	);

	const confirm = (invite: PendingInvite) => (
		<div
			role="group"
			aria-label="Confirm revoke"
			className="flex flex-wrap items-center justify-between gap-3 rounded-input bg-ground px-3 py-3 sm:rounded-none sm:bg-transparent sm:p-0">
			<p className="type-body font-semibold text-ink">Revoke the invitation to {invite.email}?</p>
			<span className="flex flex-wrap gap-3">
				<Button
					data-keep-invite={invite.email}
					variant="outline"
					size="sm"
					onClick={() => closeConfirm(invite.email)}>
					Keep invitation
				</Button>
				<Button variant="ink" size="sm" icon="x" onClick={() => revoke(invite)}>
					Revoke invitation
				</Button>
			</span>
		</div>
	);

	const status = (invite: PendingInvite, size?: "sm") => (
		<StateBadge kind="invitation" state="waiting" label={`Waiting · ${invite.sentLabel}`} size={size} />
	);

	return (
		<Island
			flush
			className="relative"
			title="Pending invitations"
			meta={live ? `${team.invitations.length} waiting` : undefined}>
			<PreviewStateView
				loadingLabel="Loading invitations…"
				rows={1}
				headingLevel={3}
				empty={{
					icon: "mail",
					title: "No invitations waiting",
					body: "Invitations you send appear here until the person accepts them."
				}}
				filtered={{
					title: "No invitations match this view",
					body: "Change your filters to see more invitations. Nothing was revoked."
				}}>
				{team.invitations.length === 0 ? (
					<p className="border-t border-rule px-island-pad py-5 type-body text-ink-2">
						No invitations are waiting. Invite member adds one here.
					</p>
				) : (
					<>
						<div className="hidden sm:block">
							<Table caption="Pending invitations">
								<THead>
									<tr>
										<Th>Email</Th>
										<Th>Role</Th>
										<Th>Status</Th>
										<Th>
											<span className="sr-only">Actions</span>
										</Th>
									</tr>
								</THead>
								<TBody>
									{team.invitations.map(invite => (
										<Fragment key={invite.email}>
											<Tr>
												<Td className="break-words">{invite.email}</Td>
												<Td nowrap>
													<StateBadge kind="role" state={invite.role} />
												</Td>
												<Td>{status(invite)}</Td>
												<Td nowrap className="text-right">
													{actions(invite)}
												</Td>
											</Tr>
											{confirming === invite.email && (
												<tr>
													<td colSpan={4} className="bg-ground px-island-pad py-3">
														{confirm(invite)}
													</td>
												</tr>
											)}
										</Fragment>
									))}
								</TBody>
							</Table>
						</div>
						<StackedRows
							label="Pending invitations"
							rows={team.invitations.map(invite => ({
								key: invite.email,
								title: <p className="font-semibold break-all text-ink">{invite.email}</p>,
								fields: [
									{ label: "Role", value: <StateBadge kind="role" state={invite.role} size="sm" /> },
									{ label: "Status", value: status(invite, "sm") }
								],
								actions: actions(invite),
								after: confirming === invite.email ? confirm(invite) : undefined
							}))}
						/>
					</>
				)}
			</PreviewStateView>
		</Island>
	);
}

function RolesIsland() {
	return (
		<Island flush className="relative" title="What the roles allow">
			<Table caption="What each project role allows">
				<THead>
					<tr>
						<Th>Role</Th>
						<Th>Permissions</Th>
					</tr>
				</THead>
				<TBody>
					{ROLE_ORDER.map(role => (
						<Tr key={role}>
							<Td nowrap>
								<StateBadge kind="role" state={role} />
							</Td>
							<Td>{ROLE_PERMISSIONS[role]}</Td>
						</Tr>
					))}
				</TBody>
			</Table>
		</Island>
	);
}
