import type { Project, ProjectPatch } from "../../lib/api/types";
import { isTimeZone } from "../../lib/time";

/**
 * What the project settings form accepts, shared by the screen and the server action. Relative imports
 * only, so the unit tests can load this file.
 */

export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 10_000;

export const NAME_PROBLEM = `Enter a project name of up to ${NAME_MAX} characters.`;
export const DESCRIPTION_PROBLEM = `Keep the description to ${DESCRIPTION_MAX.toLocaleString("en-US")} characters or fewer.`;
export const TIMEZONE_PROBLEM = "Choose a timezone from the list, such as America/New_York.";

/** What the three fields hold, as text. An empty description is "no description". */
export type SettingsForm = { name: string; description: string; timezone: string };
export type SettingsField = keyof SettingsForm;
export type SettingsErrors = Partial<Record<SettingsField, string>>;

export const SETTINGS_FIELDS: readonly SettingsField[] = ["name", "description", "timezone"];

/** The form as the project last saved it. */
export function formOf(project: Pick<Project, "name" | "description" | "timezone">): SettingsForm {
	return { name: project.name, description: project.description ?? "", timezone: project.timezone };
}

/** What would be saved: names and descriptions without stray spaces around them. */
export function normalised(form: SettingsForm): SettingsForm {
	return { name: form.name.trim(), description: form.description.trim(), timezone: form.timezone.trim() };
}

/** The fields whose value differs from the saved project, in form order. */
export function changedFields(saved: SettingsForm, next: SettingsForm): SettingsField[] {
	const was = normalised(saved);
	const now = normalised(next);
	return SETTINGS_FIELDS.filter(field => was[field] !== now[field]);
}

/** Problems with the values, keyed by field. Empty when the form can be saved. */
export function checkSettings(form: SettingsForm): SettingsErrors {
	const now = normalised(form);
	const errors: SettingsErrors = {};
	if (now.name === "" || now.name.length > NAME_MAX) errors.name = NAME_PROBLEM;
	if (now.description.length > DESCRIPTION_MAX) errors.description = DESCRIPTION_PROBLEM;
	if (!isTimeZone(now.timezone)) errors.timezone = TIMEZONE_PROBLEM;
	return errors;
}

/** The API's change for the fields that differ. A cleared description is sent as null, which clears it. */
export function patchOf(saved: SettingsForm, next: SettingsForm): ProjectPatch {
	const now = normalised(next);
	const patch: ProjectPatch = {};
	for (const field of changedFields(saved, next)) {
		if (field === "description") patch.description = now.description === "" ? null : now.description;
		else patch[field] = now[field];
	}
	return patch;
}

/** The API's field problems (a 422) as problems on this form's fields. Other ids are left out. */
export function problemsOf(fields: Readonly<Record<string, string>>): SettingsErrors {
	const errors: SettingsErrors = {};
	for (const field of SETTINGS_FIELDS) {
		const problem = fields[field];
		if (problem) errors[field] = problem;
	}
	return errors;
}

/** The zones to offer: the runtime's list, with the project's own zone first if the list lacks it. */
export function zoneOptions(zones: readonly string[], saved: string): string[] {
	return zones.includes(saved) || saved === "" ? [...zones] : [saved, ...zones];
}

/** The project a settings change is for. `org` and `project` name the pages to refresh. */
export type SettingsContext = { org: string; project: string; projectId: string };

export type ProjectStatus = "active" | "archived";

/** What the settings actions answer. A failure says what did not happen and why. */
export type SaveResult =
	| { status: "done"; saved: SettingsForm }
	| { status: "failed"; message: string; fields?: SettingsErrors };

export type StatusResult = { status: "done"; projectStatus: ProjectStatus } | { status: "failed"; message: string };
