"use client";

import { useState } from "react";

import { Field } from "@/components/contour/Field";
import { InnerPanel } from "@/components/contour/InnerPanel";
import { Mono } from "@/components/contour/Mono";
import { TextInput } from "@/components/contour/TextInput";
import { cleanSlugInput, isValidSlug, slugify, WORKSPACE_HOST } from "@/components/onboarding/utils";

import type { StepBodyProps } from "./types";

/** Step 1: the organization's name, and the address its workspace opens at, derived from the name. */
export function OrganizationStep({ state, update }: StepBodyProps) {
	const [slugTouched, setSlugTouched] = useState(false);
	const slugError =
		slugTouched && state.orgSlug !== "" && !isValidSlug(state.orgSlug)
			? "Use lowercase letters, digits and single hyphens, such as deca-lab."
			: undefined;

	return (
		<>
			<Field label="Organization name" htmlFor="org-name">
				<TextInput
					id="org-name"
					name="organization"
					placeholder="e.g. DECA Lab"
					autoComplete="organization"
					value={state.orgName}
					onChange={event => {
						const orgName = event.target.value;
						update({ orgName, ...(state.orgSlugEdited ? {} : { orgSlug: slugify(orgName) }) });
					}}
				/>
			</Field>

			<div className="flex flex-col gap-3">
				<Field
					label="Workspace address"
					htmlFor="org-slug"
					hint={
						slugError
							? undefined
							: "Lowercase letters, digits and hyphens. Members open the workspace at this address."
					}
					error={slugError}>
					<TextInput
						id="org-slug"
						name="address"
						placeholder="e.g. deca-lab"
						autoComplete="off"
						autoCapitalize="none"
						spellCheck={false}
						className="font-mono"
						value={state.orgSlug}
						onChange={event => {
							const orgSlug = cleanSlugInput(event.target.value);
							// An emptied field hands the address back to the name on its next change.
							update({ orgSlug, orgSlugEdited: orgSlug !== "" });
						}}
						onBlur={() => setSlugTouched(true)}
					/>
				</Field>
				<InnerPanel tone="well">
					<p className="type-mono-label text-ink-2">Address preview</p>
					<p className="mt-1 type-body wrap-anywhere text-ink">
						{state.orgSlug === "" ? (
							<span className="text-ink-2">The address appears here as you type.</span>
						) : (
							<Mono>
								{WORKSPACE_HOST}/o/<strong className="font-semibold">{state.orgSlug}</strong>
							</Mono>
						)}
					</p>
				</InnerPanel>
			</div>
		</>
	);
}
