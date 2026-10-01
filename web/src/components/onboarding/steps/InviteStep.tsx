"use client";

import { useState } from "react";

import { GhostAction, Input, Prose, SecondaryAction } from "@/components/nocturne/chrome";

import { Field } from "../Field";
import { PhoneJoinMock } from "../PhoneJoinMock";
import { Segmented } from "../Segmented";
import type { InviteExpiresDays, InviteRole, SetupState } from "../types";

const ROLE_OPTIONS: readonly { readonly value: InviteRole; readonly label: string }[] = [
	{ value: "observer", label: "Observer" },
	{ value: "viewer", label: "Viewer" },
	{ value: "manager", label: "Manager" }
];

const EXPIRES_OPTIONS: readonly { readonly value: InviteExpiresDays; readonly label: string }[] = [
	{ value: 7, label: "7 days" },
	{ value: 30, label: "30 days" },
	{ value: 90, label: "90 days" }
];

export function InviteStep({
	state,
	onChange,
	joinCode,
	onNewCode,
	projectName,
	orgName
}: {
	readonly state: SetupState;
	readonly onChange: (patch: Partial<SetupState>) => void;
	readonly joinCode: string;
	readonly onNewCode: () => void;
	readonly projectName: string;
	readonly orgName: string;
}) {
	const [copied, setCopied] = useState(false);

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(joinCode);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		} catch {
			// Clipboard access can be denied by the browser; the code is still shown on screen to
			// copy by hand, so there is nothing more to do here.
		}
	}

	return (
		<div className="flex flex-col gap-loose">
			<Field label="Role" htmlFor="invite-role">
				<Segmented
					label="Role"
					value={state.inviteRole}
					options={ROLE_OPTIONS}
					onChange={value => onChange({ inviteRole: value })}
				/>
			</Field>

			<Field label="Uses" htmlFor="invite-uses" hint="How many times this code can be redeemed.">
				<Input
					id="invite-uses"
					type="number"
					min={1}
					max={500}
					inputMode="numeric"
					value={state.inviteUses}
					onChange={event => {
						const parsed = Number(event.target.value);
						onChange({ inviteUses: Number.isFinite(parsed) ? Math.max(1, Math.round(parsed)) : 1 });
					}}
					className="min-h-11 max-w-[7rem]"
				/>
			</Field>

			<Field label="Expires" htmlFor="invite-expires">
				<Segmented
					label="Expires"
					value={state.inviteExpiresDays}
					options={EXPIRES_OPTIONS}
					onChange={value => onChange({ inviteExpiresDays: value })}
				/>
			</Field>

			<div className="flex flex-col gap-loose rounded-lg border border-edge bg-surface p-loose sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<p className="text-meta text-neutral-400">Preview code — not registered</p>
					<p className="tnum mt-tight text-title text-text" translate="no">
						{joinCode === "" ? "········" : joinCode}
					</p>
					<div className="mt-base flex flex-wrap gap-snug">
						<SecondaryAction onClick={copyCode} disabled={joinCode === ""}>
							{copied ? "Copied" : "Copy"}
						</SecondaryAction>
						<GhostAction onClick={onNewCode}>New code</GhostAction>
					</div>
					<Prose tone="faint" className="mt-loose max-w-[38ch]">
						Invite link:{" "}
						<span className="text-neutral-400" translate="no">
							/invite#t=…
						</span>{" "}
						— the token rides in the URL fragment, so it never reaches a server log.
					</Prose>
				</div>

				<PhoneJoinMock code={joinCode} projectName={projectName} orgName={orgName} role={state.inviteRole} />
			</div>
		</div>
	);
}
