"use client";

import { useState } from "react";

import { Button } from "@/components/contour/Button";
import { Dialog, DialogClose } from "@/components/contour/Dialog";
import { Note } from "@/components/contour/Note";
import { RadioRows } from "@/components/contour/RadioRows";
import { useToast } from "@/components/contour/Toast";
import type { ProjectRole } from "@/fixtures";
import { stateOf } from "@/lib/contour";

import { isProjectRole, type Member, ROLE_ORDER, ROLE_PERMISSIONS, type Team } from "./store";

/** "a Manager", "an Observer". */
function roleWithArticle(role: ProjectRole): string {
	const label = stateOf("role", role).label;
	return `${/^[AEIOU]/.test(label) ? "an" : "a"} ${label}`;
}

/** What changes for the person, in words, for the role they would have. */
const CONSEQUENCE: Record<ProjectRole, string> = {
	manager: "They can manage forms, maps, the team and publication, and review observations.",
	observer:
		"They collect in the native app. The web workspace sends them to the app, and they no longer see Team or Settings.",
	viewer: "They read data and reports and export the permitted scope. They can no longer collect or change the project."
};

export type ReviewRoleDialogProps = {
	member: Member;
	team: Team;
	projectName: string;
	disabled?: boolean;
};

/**
 * "Review role" (project-04): change a member's project role after reading what changes. The last manager
 * cannot be demoted; the choices that would leave the project without one are off, with the reason shown.
 */
export function ReviewRoleDialog({ member, team, projectName, disabled = false }: ReviewRoleDialogProps) {
	const { toast } = useToast();
	const [open, setOpen] = useState(false);
	const [role, setRole] = useState<ProjectRole>(member.role);
	const managers = team.members.filter(entry => entry.role === "manager").length;
	const lastManager = member.role === "manager" && managers <= 1;
	const changed = role !== member.role;
	const first = member.person.name.split(" ")[0] ?? member.person.name;

	function apply() {
		const previous = member.role;
		const personId = member.person.id;
		team.update(current => ({ ...current, roles: { ...current.roles, [personId]: role } }));
		setOpen(false);
		toast({
			title: `${member.person.name} is now ${roleWithArticle(role)}`,
			description: "Changed in this preview only.",
			action: {
				label: "Undo",
				altText: "Undo the role change",
				onClick: () =>
					team.update(current => ({ ...current, roles: { ...current.roles, [personId]: previous } }))
			}
		});
	}

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				setOpen(next);
				if (next) setRole(member.role);
			}}
			title={`Review ${first}'s role`}
			description={`${member.person.name} is ${roleWithArticle(member.role)} on ${projectName}.`}
			trigger={
				<Button
					variant="outline"
					icon="settings"
					disabled={disabled}
					aria-label={`Review role, ${member.person.name}`}>
					Review role
				</Button>
			}
			footer={
				<>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button
						icon="check"
						disabled={!changed}
						disabledReason={changed ? undefined : "Choose a different role to change it."}
						onClick={apply}>
						Change role
					</Button>
				</>
			}>
			<div className="flex flex-col gap-4">
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
							description: ROLE_PERMISSIONS[entry],
							disabled: lastManager && entry !== "manager"
						}))}
					/>
				</fieldset>
				{lastManager && (
					<p className="type-small text-ink-2">
						{projectName} needs at least one manager. Make someone else a manager before you change {first}
						&rsquo;s role.
					</p>
				)}
				{changed && (
					<Note tone="waiting" title={`${first} becomes ${roleWithArticle(role)}.`}>
						{CONSEQUENCE[role]} Records {first} already uploaded keep their observer code.
					</Note>
				)}
			</div>
		</Dialog>
	);
}
