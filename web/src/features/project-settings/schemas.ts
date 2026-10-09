import { z } from "zod";

import { isTimeZone } from "../../lib/time";
import { DESCRIPTION_MAX, DESCRIPTION_PROBLEM, NAME_MAX, NAME_PROBLEM, TIMEZONE_PROBLEM } from "./rules";

/**
 * What the settings actions accept from the browser. Kept apart from rules.ts so the screen, which only
 * needs the rules, does not carry the validation library. Relative imports only, for the unit tests.
 */

const address = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
export const settingsContextSchema = z.object({ org: address, project: address, projectId: z.guid() });

/** The change the server action accepts: at least one field, each one valid. */
export const patchSchema = z
	.object({
		name: z.string().trim().min(1, NAME_PROBLEM).max(NAME_MAX, NAME_PROBLEM).optional(),
		description: z.string().trim().max(DESCRIPTION_MAX, DESCRIPTION_PROBLEM).nullable().optional(),
		timezone: z
			.string()
			.trim()
			.refine(value => isTimeZone(value), TIMEZONE_PROBLEM)
			.optional()
	})
	.strict()
	.refine(patch => Object.keys(patch).length > 0, "There is nothing to save.");

export const statusSchema = z.enum(["active", "archived"]);
