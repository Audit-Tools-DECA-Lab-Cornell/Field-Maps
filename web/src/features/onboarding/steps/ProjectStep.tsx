"use client";

import { useState } from "react";

import { Field } from "@/components/contour/Field";
import { Select } from "@/components/contour/Select";
import { TextInput } from "@/components/contour/TextInput";
import { TIMEZONES } from "@/components/onboarding/types";
import { isValidProjectCode, PROJECT_CODE_MAX, projectCodeFrom, sanitizeCode } from "@/components/onboarding/utils";

import type { StepBodyProps } from "./types";

/** Step 2 (org-13): the project's name, its short code (derived from the name until typed) and its timezone. */
export function ProjectStep({ state, update }: StepBodyProps) {
	const [codeTouched, setCodeTouched] = useState(false);
	const codeError =
		codeTouched && state.projectCode !== "" && !isValidProjectCode(state.projectCode)
			? `Use capital letters and digits, with single hyphens between them, up to ${PROJECT_CODE_MAX} characters.`
			: undefined;

	return (
		<>
			<Field label="Project name" htmlFor="project-name">
				<TextInput
					id="project-name"
					name="project"
					placeholder="e.g. Play Study"
					autoComplete="off"
					value={state.projectName}
					onChange={event => {
						const projectName = event.target.value;
						update({
							projectName,
							...(state.projectCodeEdited
								? {}
								: { projectCode: projectCodeFrom(projectName, new Date().getFullYear()) })
						});
					}}
				/>
			</Field>

			<Field
				label="Project code"
				htmlFor="project-code"
				hint={codeError ? undefined : "Short and unique. It appears in export file names."}
				error={codeError}>
				<TextInput
					id="project-code"
					name="code"
					placeholder="e.g. PLAY-26"
					autoComplete="off"
					autoCapitalize="characters"
					spellCheck={false}
					maxLength={PROJECT_CODE_MAX}
					value={state.projectCode}
					onChange={event => {
						const projectCode = sanitizeCode(event.target.value);
						update({ projectCode, projectCodeEdited: projectCode !== "" });
					}}
					onBlur={() => setCodeTouched(true)}
				/>
			</Field>

			<Field
				label="Project timezone"
				htmlFor="project-timezone"
				hint="Capture times are shown in this timezone on the web.">
				<Select
					id="project-timezone"
					name="timezone"
					value={state.timezone}
					onChange={event => update({ timezone: event.target.value })}>
					{TIMEZONES.map(zone => (
						<option key={zone} value={zone}>
							{zone}
						</option>
					))}
				</Select>
			</Field>
		</>
	);
}
