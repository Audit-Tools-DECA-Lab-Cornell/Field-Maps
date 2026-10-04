"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button, ButtonLink } from "@/components/contour/Button";
import { FactsList } from "@/components/contour/FactsList";
import { Island } from "@/components/contour/Island";
import { ScreenState } from "@/components/contour/ScreenState";
import { StateBadge } from "@/components/contour/StateBadge";
import { useToast } from "@/components/contour/Toast";
import { AuthPanel } from "@/components/shell/AuthSplit";

import { leaveFlash } from "./flash";
import { invitationFor } from "./invitation";
import { OfflineNote } from "./OfflineNote";
import { type AuthPreviewState, PREVIEW_HOME, withQuery } from "./params";

export type InviteScreenProps = {
	/** A join code from /join. Without one, the page shows the invitation its link opened (`/invite#t=…`). */
	code?: string;
	state: AuthPreviewState;
};

const KICKER = "Invitation";
const LEAD = "Check the project and role before accepting this invitation.";
const FOOTNOTE = "Nothing is shared with the project until you join. You can leave it later from your account.";

/**
 * Join Play Study? (Org 11). Opening an invitation never enrols anyone: the person reads the organization,
 * project, role and inviter, then decides. The link's token stays in the URL fragment, which never
 * reaches a server; this preview does not read it. Joining here sends nothing: a toast says so and the page
 * moves on to the observer's next step.
 */
export function InviteScreen({ code, state }: InviteScreenProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [pending, startTransition] = useTransition();
	const [joined, setJoined] = useState(false);
	const invitation = invitationFor(code);
	const differentCode = withQuery("/join", { code });

	if (state === "loading" || state === "error" || state === "no-access" || !invitation) {
		return (
			<AuthPanel kicker={KICKER} title="Your invitation" lead={LEAD} footnote={FOOTNOTE} footnoteRule={false}>
				<Island flush>
					{state === "loading" ? (
						<ScreenState kind="loading" rows={5} loadingLabel="Loading the invitation…" />
					) : state === "error" ? (
						<ScreenState
							kind="error"
							headingLevel={2}
							title="We could not load this invitation"
							body="Nothing was shared, and you have not joined anything. Check your connection and try again."
							actions={
								<>
									<ButtonLink variant="ink" icon="rotate-cw" href={withQuery("/invite", { code })}>
										Try again
									</ButtonLink>
									<ButtonLink variant="outline" href={differentCode}>
										Use a different code
									</ButtonLink>
								</>
							}
						/>
					) : state === "no-access" ? (
						<ScreenState
							kind="no-access"
							headingLevel={2}
							title="This invitation is no longer open"
							body="It was withdrawn or has already been used. Nothing was shared. Ask your coordinator for a new invitation or a join code."
							actions={
								<ButtonLink variant="ink" href={differentCode}>
									Enter a join code
								</ButtonLink>
							}
						/>
					) : (
						<ScreenState
							kind="empty"
							icon="search"
							headingLevel={2}
							title="We could not find that project"
							body="We could not find a project for that code. Check it with your coordinator."
							actions={
								<ButtonLink variant="ink" icon="arrow-left" href={differentCode}>
									Use a different code
								</ButtonLink>
							}
						/>
					)}
				</Island>
				{state === "loading" && (
					<div className="mt-6">
						<Button
							size="lg"
							fullWidth
							icon="check"
							disabled
							disabledReason="The button turns on once the invitation has loaded.">
							Join project
						</Button>
					</div>
				)}
			</AuthPanel>
		);
	}

	const offline = state === "offline";

	function join() {
		if (pending || offline || !invitation) return;
		const message = {
			title: "Preview · Nothing was sent",
			description: `You have not joined ${invitation.project}.`
		};
		setJoined(true);
		toast(message);
		leaveFlash(message);
		startTransition(() => router.push(`${PREVIEW_HOME}/collect`));
	}

	return (
		<AuthPanel
			kicker={KICKER}
			title={`Join ${invitation.project}?`}
			lead={LEAD}
			footnote={FOOTNOTE}
			footnoteRule={false}>
			<div className="flex flex-col gap-6">
				{offline && (
					<OfflineNote>
						This is the invitation as it last loaded. Nothing has been shared with the project.
					</OfflineNote>
				)}
				<Island flush aria-label="Invitation details">
					<FactsList
						labelWidth="7.5rem"
						className="px-5 py-4"
						items={[
							{ label: "Organization", value: invitation.organization },
							{
								label: "Project",
								value: <strong className="font-semibold">{invitation.project}</strong>
							},
							{ label: "Your role", value: <StateBadge kind="role" state={invitation.role} /> },
							{ label: "Invited by", value: invitation.invitedBy },
							{ label: "Access", value: invitation.access }
						]}
					/>
				</Island>
				<div className="flex flex-col gap-3">
					<Button
						size="lg"
						fullWidth
						icon="check"
						onClick={join}
						busy={pending || joined}
						disabled={offline}
						disabledReason="Joining needs a connection.">
						Join project
					</Button>
					<ButtonLink variant="outline" size="lg" fullWidth href={differentCode}>
						Use a different code
					</ButtonLink>
				</div>
			</div>
		</AuthPanel>
	);
}
