export * from "./definition";
export * from "./engine";

import type { FormDefinition } from "./definition";
import { formDefinitionSchema, validateFormDefinition } from "./definition";

/**
 * Parses and validates an unknown value as a form definition, without throwing. For an
 * in-browser editor that must show every problem — parse issues and structural ones alike —
 * rather than crash on bad input.
 */
export function loadDefinition(input: unknown): {
	form: FormDefinition | null;
	problems: readonly string[];
} {
	const parsed = formDefinitionSchema.safeParse(input);
	if (!parsed.success) {
		const problems = parsed.error.issues.map(issue => {
			const path = issue.path.join(".");
			return path === "" ? issue.message : `${path}: ${issue.message}`;
		});
		return { form: null, problems };
	}
	const problems = validateFormDefinition(parsed.data);
	return { form: problems.length === 0 ? parsed.data : null, problems };
}
