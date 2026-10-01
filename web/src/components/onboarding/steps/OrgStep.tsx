"use client";

import { Input } from "@/components/nocturne/chrome";

import { Field } from "../Field";
import type { SetupState } from "../types";
import { isValidSlug, slugify } from "../utils";

export function OrgStep({
	state,
	onChange
}: {
	readonly state: SetupState;
	readonly onChange: (patch: Partial<SetupState>) => void;
}) {
	const slugError =
		state.orgSlug !== "" && !isValidSlug(state.orgSlug)
			? "Use lowercase letters, numbers and hyphens only."
			: undefined;

	return (
		<div className="flex flex-col gap-loose">
			<Field label="Organization name" htmlFor="org-name">
				<Input
					className="min-h-11"
					id="org-name"
					placeholder="DECA Lab"
					autoComplete="off"
					value={state.orgName}
					onChange={event => {
						const orgName = event.target.value;
						onChange({
							orgName,
							...(state.orgSlugEdited ? {} : { orgSlug: slugify(orgName) })
						});
					}}
				/>
			</Field>

			<Field label="Workspace address" htmlFor="org-slug" error={slugError}>
				<div className="flex min-h-11 items-center rounded-md border border-rule bg-raised transition-colors duration-100 focus-within:border-accent hover:border-neutral-500">
					<span className="pl-snug text-detail text-neutral-500" aria-hidden>
						/o/
					</span>
					<input
						id="org-slug"
						placeholder="deca-lab"
						autoComplete="off"
						value={state.orgSlug}
						onChange={event => onChange({ orgSlug: event.target.value, orgSlugEdited: true })}
						className="min-h-11 min-w-0 flex-1 bg-transparent py-tight pr-snug text-detail text-text caret-accent outline-none placeholder:text-neutral-600"
					/>
				</div>
			</Field>

			<p className="text-micro text-neutral-500">
				You become its owner. Owners manage admins and can transfer ownership.
			</p>
		</div>
	);
}
