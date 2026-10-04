"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Field } from "@/components/contour/Field";
import { IconButton } from "@/components/contour/IconButton";
import { Select } from "@/components/contour/Select";
import { TextInput } from "@/components/contour/TextInput";
import type { Invite, InviteRole } from "@/components/onboarding/types";
import { generateJoinCode } from "@/components/onboarding/utils";
import { isEmail } from "@/features/auth/params";
import { stateOf } from "@/lib/contour";

import { JoinCodePanel } from "../JoinCodePanel";
import type { StepBodyProps } from "./types";

const ROLES: readonly InviteRole[] = ["observer", "viewer", "manager"];

function newInviteId(): string {
	return typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `invite-${Date.now()}`;
}

/**
 * Step 5: invitations by email with a project role, and the observer join code. Rows left empty are
 * ignored; a row with an incomplete address keeps Finish off until it is completed or removed.
 */
export function TeamStep({ state, update }: StepBodyProps) {
	const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
	const listRef = useRef<HTMLOListElement>(null);

	function patchInvite(id: string, patch: Partial<Invite>) {
		update(current => ({
			invites: current.invites.map(invite => (invite.id === id ? { ...invite, ...patch } : invite))
		}));
	}

	function addInvite() {
		const id = newInviteId();
		update(current => ({ invites: [...current.invites, { id, email: "", role: "observer" }] }));
		// The new row's address field takes focus once it is on screen.
		requestAnimationFrame(() => document.getElementById(`invite-${id}-email`)?.focus());
	}

	function removeInvite(id: string, index: number) {
		update(current => {
			const rest = current.invites.filter(invite => invite.id !== id);
			return { invites: rest.length > 0 ? rest : [{ id: newInviteId(), email: "", role: "observer" }] };
		});
		// Focus stays in the list: on the row that took this one's place, or on the one before it.
		requestAnimationFrame(() => {
			const fields = listRef.current?.querySelectorAll<HTMLInputElement>('input[type="email"]');
			if (!fields || fields.length === 0) return;
			fields[Math.min(index, fields.length - 1)]?.focus();
		});
	}

	const single = state.invites.length === 1;

	return (
		<>
			<section aria-labelledby="invites-title" className="flex flex-col gap-4">
				<h2 id="invites-title" className="type-island text-ink">
					Invitations
				</h2>
				<ol ref={listRef} className="flex flex-col gap-4">
					{state.invites.map((invite, index) => {
						const emailId = `invite-${invite.id}-email`;
						const showError =
							touched.has(invite.id) && invite.email.trim() !== "" && !isEmail(invite.email);
						const name = invite.email.trim() || `row ${index + 1}`;
						return (
							<li
								key={invite.id}
								className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto]">
								<Field
									label="Email address"
									htmlFor={emailId}
									error={showError ? "Enter a full address, such as name@example.org." : undefined}
									className="col-span-2 sm:col-span-1">
									<TextInput
										id={emailId}
										type="email"
										inputMode="email"
										autoComplete="off"
										spellCheck={false}
										placeholder="name@example.org"
										value={invite.email}
										onChange={event => patchInvite(invite.id, { email: event.target.value })}
										onBlur={() => setTouched(current => new Set(current).add(invite.id))}
									/>
								</Field>
								<Field label="Role" htmlFor={`invite-${invite.id}-role`}>
									<Select
										id={`invite-${invite.id}-role`}
										value={invite.role}
										onChange={event =>
											patchInvite(invite.id, { role: event.target.value as InviteRole })
										}>
										{ROLES.map(role => (
											<option key={role} value={role}>
												{stateOf("role", role).label}
											</option>
										))}
									</Select>
								</Field>
								<IconButton
									icon="x"
									variant="outline"
									label={single ? `Clear ${name}` : `Remove ${name}`}
									className="mt-7"
									onClick={() => removeInvite(invite.id, index)}
								/>
							</li>
						);
					})}
				</ol>
				<div>
					<Button variant="outline" icon="plus" onClick={addInvite}>
						Add another person
					</Button>
				</div>
				<dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 type-small">
					{ROLES.map(role => {
						const definition = stateOf("role", role);
						return (
							<div key={role} className="col-span-2 grid grid-cols-subgrid">
								<dt className="font-semibold text-ink">{definition.label}</dt>
								<dd className="text-ink-2">{definition.allows}</dd>
							</div>
						);
					})}
				</dl>
				<p className="type-small text-ink-2">
					Invitations are sent when the project is created. In this preview, nothing is sent.
				</p>
			</section>

			<JoinCodePanel code={state.joinCode} onRotate={() => update({ joinCode: generateJoinCode() })} />
		</>
	);
}
