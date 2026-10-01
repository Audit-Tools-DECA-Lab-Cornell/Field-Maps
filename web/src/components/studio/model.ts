import type { z } from "zod";

import type { Condition, formDefinitionSchema, optionSchema, questionSchema } from "@/lib/forms";

/**
 * The Form Studio edits the definition as authored JSON — the shape `contracts/forms/*.json` holds —
 * rather than the parsed shape, so a downloaded file differs from its source only where a person
 * changed something. Every edit is a pure function that returns a new definition; validation runs
 * on the result, never inside the edit, so an edit can pass through an invalid state while typing.
 */

export type RawDefinition = z.input<typeof formDefinitionSchema>;
export type RawQuestion = z.input<typeof questionSchema>;
export type RawOption = z.input<typeof optionSchema>;
export type QuestionKind = RawQuestion["kind"];
export type Act = RawQuestion["act"];

/** A definition as this build ships it, from `contracts/forms/`. */
export type SourceDefinition = {
	readonly file: string;
	readonly raw: RawDefinition;
};

/* ── Identifiers ──────────────────────────────────────────────────────────── */

/** A stable identifier from a label. Codes are what records store, so they never follow a relabel. */
export function slugify(label: string): string {
	const slug = label
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 40);
	return slug === "" ? "item" : slug;
}

function unique(base: string, taken: ReadonlySet<string>): string {
	if (!taken.has(base)) return base;
	for (let n = 2; ; n++) if (!taken.has(`${base}_${n}`)) return `${base}_${n}`;
}

/** The next version name for a draft started from a published one: `shell-v1` → `shell-v2`. */
export function nextVersion(version: string, taken: ReadonlySet<string>): string {
	const match = /^(.*-v)(\d+)$/.exec(version);
	const stem = match ? match[1] : `${version}-v`;
	let n = match ? Number(match[2]) + 1 : 2;
	while (taken.has(`${stem}${n}`)) n++;
	return `${stem}${n}`;
}

/* ── Questions ────────────────────────────────────────────────────────────── */

function mapQuestion(raw: RawDefinition, id: string, change: (question: RawQuestion) => RawQuestion): RawDefinition {
	return { ...raw, questions: raw.questions.map(question => (question.id === id ? change(question) : question)) };
}

/** Sets or clears fields. `undefined` removes an optional key so the JSON stays as authored. */
export function updateQuestion(raw: RawDefinition, id: string, patch: Partial<RawQuestion>): RawDefinition {
	return mapQuestion(raw, id, question => {
		const next: Record<string, unknown> = { ...question };
		for (const [key, value] of Object.entries(patch)) {
			if (value === undefined) delete next[key];
			else next[key] = value;
		}
		return next as RawQuestion;
	});
}

export function moveQuestion(raw: RawDefinition, id: string, delta: -1 | 1): RawDefinition {
	const index = raw.questions.findIndex(question => question.id === id);
	const target = index + delta;
	if (index < 0 || target < 0 || target >= raw.questions.length) return raw;
	const questions = [...raw.questions];
	[questions[index], questions[target]] = [questions[target], questions[index]];
	return { ...raw, questions };
}

export function removeQuestion(raw: RawDefinition, id: string): RawDefinition {
	return { ...raw, questions: raw.questions.filter(question => question.id !== id) };
}

/** Most questions a manager adds mid-study are yes/no; every other list starts from these two. */
export const STARTER_OPTIONS: readonly RawOption[] = [
	{ code: "yes", label: "Yes" },
	{ code: "no", label: "No" }
];

/**
 * A question added here has no workbook row and no analysis column. Both stay visibly empty —
 * the studio never invents a column name the research team has not agreed.
 */
export function addQuestion(
	raw: RawDefinition,
	act: Act,
	kind: QuestionKind,
	label: string
): { readonly raw: RawDefinition; readonly id: string } {
	const id = unique(slugify(label), new Set(raw.questions.map(question => question.id)));
	const question: RawQuestion = {
		id,
		code: id,
		exportColumn: "",
		act,
		label,
		kind,
		...(kind === "one" || kind === "many" ? { options: [...STARTER_OPTIONS], columns: 2 } : {}),
		...(kind === "text" ? { maxLength: 200 } : {}),
		source: "Added in the Form Studio — no workbook row"
	};
	let at = -1;
	raw.questions.forEach((candidate, index) => {
		if (candidate.act === act) at = index;
	});
	if (at < 0) {
		const order = ACT_ORDER.indexOf(act);
		at = raw.questions.findLastIndex(candidate => ACT_ORDER.indexOf(candidate.act) <= order);
	}
	const questions = [...raw.questions];
	questions.splice(at + 1, 0, question);
	return { raw: { ...raw, questions }, id };
}

export const ACT_ORDER: readonly Act[] = ["Child", "Social", "Play", "Setting", "Record"];

/* ── Options ──────────────────────────────────────────────────────────────── */

/** `set` names a dynamic option set (keyed by the parent's option code); omitted, the question's own. */
export type OptionTarget = { readonly question: string; readonly set?: string };

function mapOptions(
	raw: RawDefinition,
	target: OptionTarget,
	change: (options: readonly RawOption[]) => readonly RawOption[]
): RawDefinition {
	return mapQuestion(raw, target.question, question => {
		if (target.set === undefined) return { ...question, options: [...change(question.options ?? [])] };
		const dynamic = question.dynamicFrom;
		const set = dynamic?.sets[target.set];
		if (!dynamic || !set) return question;
		return {
			...question,
			dynamicFrom: {
				...dynamic,
				sets: { ...dynamic.sets, [target.set]: { ...set, options: [...change(set.options)] } }
			}
		};
	});
}

export function optionsOf(question: RawQuestion, set?: string): readonly RawOption[] {
	if (set === undefined) return question.options ?? [];
	return question.dynamicFrom?.sets[set]?.options ?? [];
}

export function relabelOption(raw: RawDefinition, target: OptionTarget, code: string, label: string): RawDefinition {
	return mapOptions(raw, target, options =>
		options.map(option => (option.code === code ? { ...option, label } : option))
	);
}

export function addOption(raw: RawDefinition, target: OptionTarget, label: string): RawDefinition {
	return mapOptions(raw, target, options => [
		...options,
		{ code: unique(slugify(label), new Set(options.map(option => option.code))), label }
	]);
}

export function removeOption(raw: RawDefinition, target: OptionTarget, code: string): RawDefinition {
	return mapOptions(raw, target, options => options.filter(option => option.code !== code));
}

export function moveOption(raw: RawDefinition, target: OptionTarget, code: string, delta: -1 | 1): RawDefinition {
	return mapOptions(raw, target, options => {
		const index = options.findIndex(option => option.code === code);
		const to = index + delta;
		if (index < 0 || to < 0 || to >= options.length) return options;
		const next = [...options];
		[next[index], next[to]] = [next[to], next[index]];
		return next;
	});
}

/* ── Reading a definition back to a person ────────────────────────────────── */

export const KIND_LABEL: Record<QuestionKind, string> = {
	one: "Single choice",
	many: "Multiple choice",
	text: "Written answer",
	number: "Whole number"
};

export const KIND_GLYPH: Record<QuestionKind, string> = {
	one: "◉",
	many: "▣",
	text: "¶",
	number: "#"
};

function labelOf(raw: RawDefinition, id: string): string {
	return raw.questions.find(question => question.id === id)?.label ?? id;
}

function optionLabelOf(raw: RawDefinition, id: string, code: string): string {
	const question = raw.questions.find(candidate => candidate.id === id);
	return question?.options?.find(option => option.code === code)?.label ?? code;
}

/** A display rule as a sentence: data in, words out. Nothing here is evaluated. */
export function describeCondition(raw: RawDefinition, condition: Condition): string {
	switch (condition.kind) {
		case "answered":
			return `“${labelOf(raw, condition.question)}” is answered`;
		case "equals":
			return `“${labelOf(raw, condition.question)}” is ${optionLabelOf(raw, condition.question, condition.option)}`;
		case "notEquals":
			return `“${labelOf(raw, condition.question)}” is not ${optionLabelOf(raw, condition.question, condition.option)}`;
		case "includes":
			return `“${labelOf(raw, condition.question)}” includes ${optionLabelOf(raw, condition.question, condition.option)}`;
		case "all":
			return condition.of.map(part => describeCondition(raw, part)).join(" and ");
		case "any":
			return condition.of.map(part => describeCondition(raw, part)).join(" or ");
	}
}

/* ── What changed against the shipped file ────────────────────────────────── */

function same(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The edits since the file this build ships, in sentences a research lead can check line by line.
 * Option changes name the stable code, because the code is what existing records hold.
 */
export function describeChanges(before: RawDefinition, after: RawDefinition): readonly string[] {
	const changes: string[] = [];
	const old = new Map(before.questions.map(question => [question.id, question] as const));
	const now = new Map(after.questions.map(question => [question.id, question] as const));

	if (before.version !== after.version) changes.push(`New version ${after.version}, started from ${before.version}.`);
	if (before.title !== after.title) changes.push(`Title changed to “${after.title}”.`);

	for (const question of before.questions) if (!now.has(question.id)) changes.push(`Removed “${question.label}”.`);

	for (const question of after.questions) {
		const previous = old.get(question.id);
		if (!previous) {
			changes.push(`Added “${question.label}” (${KIND_LABEL[question.kind].toLowerCase()}, ${question.act}).`);
			continue;
		}
		const name = `“${previous.label}”`;
		if (previous.label !== question.label) changes.push(`Reworded ${name} to “${question.label}”.`);
		if ((previous.hint ?? "") !== (question.hint ?? ""))
			changes.push(question.hint ? `New guidance on ${name}.` : `Removed the guidance on ${name}.`);
		if ((previous.required ?? false) !== (question.required ?? false))
			changes.push(`${name} is now ${question.required ? "required" : "optional"}.`);
		if (previous.kind !== question.kind)
			changes.push(`${name} is now a ${KIND_LABEL[question.kind].toLowerCase()} question.`);
		if (!same(previous.dependsOn, question.dependsOn))
			changes.push(
				question.dependsOn
					? `${name} now shows when ${describeCondition(after, question.dependsOn as Condition)}.`
					: `${name} is now always shown.`
			);
		if ((previous.protocolFlag ?? "") !== (question.protocolFlag ?? ""))
			changes.push(
				question.protocolFlag
					? `Open question on ${name} updated.`
					: `Open question on ${name} marked resolved.`
			);
		if ((previous.maxLength ?? null) !== (question.maxLength ?? null))
			changes.push(`${name} now allows ${question.maxLength ?? "any number of"} characters.`);
		if ((previous.columns ?? 1) !== (question.columns ?? 1))
			changes.push(
				`${name} lays its options out in ${question.columns ?? 1} column${(question.columns ?? 1) === 1 ? "" : "s"}.`
			);
		changes.push(...describeOptionChanges(name, previous.options ?? [], question.options ?? []));
		const sets = new Set([
			...Object.keys(previous.dynamicFrom?.sets ?? {}),
			...Object.keys(question.dynamicFrom?.sets ?? {})
		]);
		for (const set of sets) {
			const parentLabel = optionLabelOf(after, question.dynamicFrom?.question ?? "", set);
			changes.push(
				...describeOptionChanges(
					`${name} (${parentLabel})`,
					previous.dynamicFrom?.sets[set]?.options ?? [],
					question.dynamicFrom?.sets[set]?.options ?? []
				)
			);
		}
	}

	const order = (raw: RawDefinition) =>
		raw.questions.map(question => question.id).filter(id => old.has(id) && now.has(id));
	if (!same(order(before), order(after))) changes.push("Questions were reordered.");
	return changes;
}

function describeOptionChanges(
	owner: string,
	before: readonly RawOption[],
	after: readonly RawOption[]
): readonly string[] {
	const changes: string[] = [];
	const old = new Map(before.map(option => [option.code, option] as const));
	const now = new Set(after.map(option => option.code));
	for (const option of after) {
		const previous = old.get(option.code);
		if (!previous) changes.push(`Added option “${option.label}” (${option.code}) to ${owner}.`);
		else if (previous.label !== option.label)
			changes.push(`Relabelled ${option.code} on ${owner}: “${previous.label}” → “${option.label}”.`);
	}
	for (const option of before)
		if (!now.has(option.code)) changes.push(`Removed option “${option.label}” (${option.code}) from ${owner}.`);
	const order = (options: readonly RawOption[]) =>
		options.map(option => option.code).filter(code => old.has(code) && now.has(code));
	if (!same(order(before), order(after))) changes.push(`Reordered the options on ${owner}.`);
	return changes;
}

/* ── Download ─────────────────────────────────────────────────────────────── */

/** The file a reviewer drops into `contracts/forms/`, formatted as the repository formats it. */
export function definitionFile(raw: RawDefinition): string {
	return `${JSON.stringify(raw, null, 2)}\n`;
}
