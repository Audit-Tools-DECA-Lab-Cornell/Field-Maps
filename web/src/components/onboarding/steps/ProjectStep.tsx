"use client";

import { Input } from "@/components/nocturne/chrome";

import { Field } from "../Field";
import type { SetupState } from "../types";
import { initialsCode, sanitizeCode } from "../utils";

const TIMEZONES: readonly { readonly value: string; readonly label: string }[] = [
	{ value: "America/New_York", label: "Eastern — America/New_York" },
	{ value: "America/Chicago", label: "Central — America/Chicago" },
	{ value: "America/Denver", label: "Mountain — America/Denver" },
	{ value: "America/Phoenix", label: "Mountain, no DST — America/Phoenix" },
	{ value: "America/Los_Angeles", label: "Pacific — America/Los_Angeles" },
	{ value: "America/Anchorage", label: "Alaska — America/Anchorage" },
	{ value: "Pacific/Honolulu", label: "Hawaii — Pacific/Honolulu" },
	{ value: "UTC", label: "UTC" }
];

export function ProjectStep({
	state,
	onChange
}: {
	readonly state: SetupState;
	readonly onChange: (patch: Partial<SetupState>) => void;
}) {
	return (
		<div className="flex flex-col gap-loose">
			<Field label="Project name" htmlFor="project-name">
				<Input
					className="min-h-11"
					id="project-name"
					placeholder="Riverside Play Study"
					autoComplete="off"
					value={state.projectName}
					onChange={event => {
						const projectName = event.target.value;
						onChange({
							projectName,
							...(state.projectCodeEdited ? {} : { projectCode: initialsCode(projectName) })
						});
					}}
				/>
			</Field>

			<Field
				label="Short code"
				htmlFor="project-code"
				hint="Up to 12 characters. Shown on every record this project collects.">
				<Input
					id="project-code"
					placeholder="RPS"
					autoComplete="off"
					value={state.projectCode}
					onChange={event =>
						onChange({ projectCode: sanitizeCode(event.target.value), projectCodeEdited: true })
					}
					className="min-h-11 max-w-[9rem] uppercase"
				/>
			</Field>

			<Field label="Time zone" htmlFor="project-timezone">
				<select
					id="project-timezone"
					value={state.timezone}
					onChange={event => onChange({ timezone: event.target.value })}
					className="min-h-11 w-full max-w-sm rounded-md border border-rule bg-raised px-snug py-tight text-detail text-text transition-colors duration-100 hover:border-neutral-500 focus-visible:border-accent focus-visible:outline-offset-0">
					{TIMEZONES.map(zone => (
						<option key={zone.value} value={zone.value}>
							{zone.label}
						</option>
					))}
				</select>
			</Field>

			<p className="text-micro text-neutral-500">
				Every observer also joins the shared Training project automatically, so they can practise before they
				join yours.
			</p>
		</div>
	);
}
