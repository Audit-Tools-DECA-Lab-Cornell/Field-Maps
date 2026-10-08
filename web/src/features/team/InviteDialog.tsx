"use client";

import { type FormEvent, useId, useRef, useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Field } from "@/components/contour/Field";
import { Note } from "@/components/contour/Note";
import { RadioRows } from "@/components/contour/RadioRows";
import { TextInput } from "@/components/contour/TextInput";
import { useToast } from "@/components/contour/Toast";
import type { ProjectRole } from "@/fixtures";
import { stateOf } from "@/lib/contour";

import { isProjectRole, ROLE_ORDER, ROLE_PERMISSIONS, SENT_NOW, type Team } from "./store";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteDialogProps = {
	projectName: string;
	team: Team;
	/** Why inviting is off (offline, a loading or failed page), shown under the button. */
	disabledReason?: string;
};

/**
 * "Invite member" (project-04): an email and a project role. Sending adds a waiting invitation to this
 * preview's list; no email leaves the browser, and the toast says so.
 */
export function InviteDialog({ projectName, team, disabledReason }: InviteDialogProps) {
	const { toast } = useToast();
	const id = useId();
	const emailRef = useRef<HTMLInputElement>(null);
	const [open, setOpen] = useState(false);
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<ProjectRole>("observer");
	const [error, setError] = useState<string | null>(null);

	function reset() {
		setEmail("");
		setRole("observer");
		setError(null);
	}

	function problemWith(value: string): string | null {
		if (value === "") return "Enter the person's email address, such as name@example.org.";
		if (!EMAIL.test(value)) return "Enter an email address with an @ and a domain, such as name@example.org.";
		if (team.members.some(member => member.person.email.toLowerCase() === value))
			return `${value} is already a member of ${projectName}.`;
		if (team.invitations.some(invite => invite.email.toLowerCase() === value))
			return `${value} already has an invitation waiting. Resend it from the list instead.`;
		return null;
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const value = email.trim().toLowerCase();
		const problem = problemWith(value);
		if (problem) {
			setError(problem);
			emailRef.current?.focus();
			return;
		}
		team.update(current => ({
			...current,
			added: [...current.added, { email: value, role, sentLabel: SENT_NOW }],
			revoked: current.revoked.filter(entry => entry !== value)
		}));
		setOpen(false);
		reset();
		toast({
			title: `Invitation added for ${value}`,
			description: "Waiting in this preview. No email was sent.",
			tone: "waiting"
		});
	}

	const formId = `${id}-form`;

	// A disabled trigger stands alone, so a press on its reason line cannot open the dialog.
	if (disabledReason)
		return (
			<Button icon="plus" disabled disabledReason={disabledReason}>
				Invite member
			</Button>
		);

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				setOpen(next);
				if (!next) reset();
			}}
			title="Invite member"
			description={`Invite someone to ${projectName}. They join with the role you choose here.`}
			trigger={<Button icon="plus">Invite member</Button>}
			footer={
				<>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button type="submit" form={formId} icon="send">
						Send invitation
					</Button>
				</>
			}>
			<form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-5">
				<Field label="Email" htmlFor={`${id}-email`} error={error}>
					<TextInput
						ref={emailRef}
						type="email"
						autoComplete="off"
						spellCheck={false}
						placeholder="name@example.org"
						value={email}
						onChange={event => {
							setEmail(event.target.value);
							if (error) setError(null);
						}}
					/>
				</Field>
				<fieldset className="flex flex-col">
					<legend className="mb-2 type-small font-semibold text-ink">Project role</legend>
					<RadioRows
						label="Project role"
						value={role}
						onValueChange={value => {
							if (isProjectRole(value)) setRole(value);
						}}
						options={ROLE_ORDER.map(entry => ({
							value: entry,
							label: stateOf("role", entry).label,
							description: ROLE_PERMISSIONS[entry]
						}))}
					/>
				</fieldset>
				<Note>What the roles allow is listed on this page. A role can be reviewed after the person joins.</Note>
			</form>
		</Dialog>
	);
}
