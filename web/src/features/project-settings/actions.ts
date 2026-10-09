"use server";

import { revalidatePath } from "next/cache";

import { apiRequestError, failedWrite } from "@/lib/api/errors";
import { patchProject } from "@/lib/api/mutations";

import { formOf, problemsOf, type SaveResult, type SettingsContext, type StatusResult } from "./rules";
import { patchSchema, settingsContextSchema, statusSchema } from "./schemas";

/**
 * Changes to a project's settings. The name shows in the header and the project switcher, so a saved
 * change refreshes everything under /o. The API decides whether the signed-in person is a manager.
 */

/** Saves the fields that changed. A 422 comes back as problems next to the fields they belong to. */
export async function saveSettings(context: SettingsContext, patch: unknown): Promise<SaveResult> {
	const nothing = "Nothing was saved.";
	const where = settingsContextSchema.safeParse(context);
	if (!where.success) return { status: "failed", message: `${nothing} Reload the page and try again.` };
	const checked = patchSchema.safeParse(patch);
	if (!checked.success) {
		const fields = problemsOf(
			Object.fromEntries(checked.error.issues.map(issue => [String(issue.path[0] ?? ""), issue.message]))
		);
		const message =
			Object.keys(fields).length > 0
				? `${nothing} Check the fields marked below.`
				: `${nothing} There is nothing new to save.`;
		return { status: "failed", message, fields };
	}
	let project;
	try {
		project = await patchProject(where.data.projectId, checked.data);
	} catch (error) {
		const failure = apiRequestError(error);
		const fields = problemsOf(failure.fields);
		return {
			status: "failed",
			message: failedWrite(nothing, failure),
			...(Object.keys(fields).length > 0 ? { fields } : {})
		};
	}
	revalidatePath("/o", "layout");
	return { status: "done", saved: formOf(project) };
}

/** Marks the project finished, or active again. It changes the status only: nothing else is locked. */
export async function setProjectStatus(context: SettingsContext, status: string): Promise<StatusResult> {
	const archiving = status === "archived";
	const nothing = archiving ? "The project was not archived." : "The project was not unarchived.";
	const where = settingsContextSchema.safeParse(context);
	const next = statusSchema.safeParse(status);
	if (!where.success || !next.success)
		return { status: "failed", message: `${nothing} Reload the page and try again.` };
	try {
		await patchProject(where.data.projectId, { status: next.data });
	} catch (error) {
		return { status: "failed", message: failedWrite(nothing, apiRequestError(error)) };
	}
	revalidatePath("/o", "layout");
	return { status: "done", projectStatus: next.data };
}
