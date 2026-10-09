/**
 * What a refused draft save says, placed where the person can fix it. A 422 carries `details.fields`, a list
 * of {id, problem}. The editor's save sends one field, `definition`, whose problem lists what the form
 * checker found ("This form cannot be used yet. questions.2.label: String should have at least 1 character;
 * …"). Problems that name a question go with that question and property; the rest are shown above the
 * editor. These are the one server wording a screen may show as it is (a draft's validation message).
 */

export type DraftProblems = {
	/** Question position (0 is the first) → property ("label", "hint", "options") → problem. */
	readonly byQuestion: Readonly<Record<number, Readonly<Record<string, string>>>>;
	/** Everything that names no question, in the order the API gave it. */
	readonly general: readonly string[];
};

const PREFIX = "This form cannot be used yet.";
const LOCATION = /^(?:definition\.)?questions\.(\d+)\.([^.:]+)(?:\.[^:]*)?$/;
const SEGMENT = /^((?:definition\.)?questions\.\d+\.[^:]+):\s*(.+)$/;

export const NO_PROBLEMS: DraftProblems = { byQuestion: {}, general: [] };

export function draftProblems(fields: Readonly<Record<string, string>> | undefined): DraftProblems {
	if (!fields) return NO_PROBLEMS;
	const byQuestion: Record<number, Record<string, string>> = {};
	const general: string[] = [];

	const place = (location: string, problem: string): boolean => {
		const found = LOCATION.exec(location);
		if (!found) return false;
		const index = Number(found[1]);
		const property = found[2]!;
		const own = (byQuestion[index] ??= {});
		own[property] ??= problem;
		return true;
	};

	for (const [id, problem] of Object.entries(fields)) {
		if (place(id, problem)) continue;
		const text = problem.startsWith(PREFIX) ? problem.slice(PREFIX.length).trim() : problem.trim();
		const segments = text.split(/;\s+/).filter(Boolean);
		let placedAny = false;
		const rest: string[] = [];
		for (const segment of segments) {
			const found = SEGMENT.exec(segment);
			if (found && place(found[1]!, found[2]!)) placedAny = true;
			else rest.push(segment);
		}
		if (!placedAny) general.push(problem.trim());
		else general.push(...rest);
	}
	return { byQuestion, general };
}

/** How many problems were placed on questions. */
export function questionProblemCount(problems: DraftProblems): number {
	return Object.keys(problems.byQuestion).length;
}
