import { nextVersion, type RawDefinition, type RawQuestion } from "@/components/studio/model";
import {
	DEMO_V2_CHANGES,
	FORM_DEFINITION,
	FORM_VERSIONS,
	type FormVersion,
	OBSERVATIONS,
	PROJECT_FORMS,
	type ProjectForm,
	PROTOCOL_NOTES,
	TEMPLATES
} from "@/fixtures";
import type { Condition, FormDefinition, Question } from "@/lib/forms";

import type { CreatedVersion, FormsPreview } from "./store";

/**
 * The Forms screens' view of the preview: the fixture versions, with this tab's session changes laid over
 * them (drafts edited, created, published or retired). Plain functions, so a server page can read the
 * fixture side too. Every count here is derived from the definitions and the observation fixtures.
 */

export type VersionState = "draft" | "published" | "retired";

export type VersionView = {
	id: string;
	formSlug: string;
	formTitle: string;
	state: VersionState;
	/** The published version this one is compared with, "demo-v1"; null for a first version. */
	base: string | null;
	/** Observations collected with this version. */
	observations: number;
	/** Protocol decisions still open on this version. Publishing waits for all of them. */
	protocolNotesOpen: number;
	/** Made in this preview. */
	created: boolean;
};

export type FormView = {
	slug: string;
	title: string;
	summary: string;
	/** A file path shown under the summary, in mono. */
	source?: string;
	questions: { total: number; conditional: number };
	assignedTo: string | null;
	versions: VersionView[];
	created: boolean;
};

/* ── Definitions ──────────────────────────────────────────────────────────── */

/** The canonical definition file, as the studio edits it (authored JSON). */
const JANET = FORM_DEFINITION as unknown as RawDefinition;

const DEMO_V1: RawDefinition = {
	...JANET,
	version: "demo-v1",
	title: "Demonstration form",
	summary: "One published example and an editable draft. Used for training and for the pilot sessions.",
	status: "published"
};

/** demo-v2 as the fixtures describe it: demo-v1 with exactly the two designed changes. */
const DEMO_V2: RawDefinition = {
	...DEMO_V1,
	version: "demo-v2",
	status: "draft",
	questions: DEMO_V1.questions.map(question => {
		let next: RawQuestion = question;
		for (const change of DEMO_V2_CHANGES) {
			if (change.questionId !== question.id) continue;
			next = change.field === "Guidance" ? { ...next, hint: change.now } : { ...next, label: change.now };
		}
		return next;
	})
};

const SEEDS: Record<string, RawDefinition> = {
	"demo-v1": DEMO_V1,
	"demo-v2": DEMO_V2,
	"janet-test-v1": JANET
};

const FIXTURE_BASE: Record<string, string | null> = {
	"demo-v1": null,
	"demo-v2": "demo-v1",
	"janet-test-v1": null
};

/** The one template with a definition behind it (proposal U4): it copies Janet's draft. */
export const STARTER_TEMPLATE = TEMPLATES.find(template => template.id === "behavior-mapping-starter") ?? TEMPLATES[0];

export function templateDefinition(version: string, title: string): RawDefinition {
	return { ...JANET, version, title, status: "draft" };
}

export function emptyDefinition(version: string, title: string): RawDefinition {
	return {
		...JANET,
		version,
		title,
		summary: "A form started empty in this preview.",
		status: "draft",
		protocolNotes: [],
		questions: []
	};
}

export function copyDefinition(from: RawDefinition, version: string): RawDefinition {
	return { ...from, version, status: "draft" };
}

/** The definition a version shows: its saved draft in this preview, or the shipped one. */
export function definitionOf(id: string, preview: FormsPreview): RawDefinition | undefined {
	return preview.drafts[id] ?? SEEDS[id];
}

/**
 * The authored JSON as the engine reads it, with the schema's defaults filled in. Lenient on purpose: a
 * label being retyped can be empty for a moment, and the live preview should keep running through it.
 */
export function toForm(raw: RawDefinition): FormDefinition {
	return {
		version: raw.version,
		title: raw.title,
		summary: raw.summary,
		source: raw.source,
		status: raw.status,
		inclusion: raw.inclusion,
		knownExportCollisions: raw.knownExportCollisions ?? [],
		protocolNotes: raw.protocolNotes ?? [],
		questions: raw.questions.map(
			(question): Question => ({
				...question,
				dependsOn: question.dependsOn as Condition | undefined,
				hint: question.hint ? question.hint : undefined,
				options: question.options ?? [],
				columns: question.columns ?? 1,
				required: question.required ?? false
			})
		)
	};
}

/* ── Versions and forms ───────────────────────────────────────────────────── */

const DEMONSTRATION_FORM_VERSIONS = new Set(["demo-v1", "demo-v2"]);

export function countObservations(version: string): number {
	return OBSERVATIONS.filter(observation => observation.formVersion === version).length;
}

function stateOf(fixture: VersionState, id: string, preview: FormsPreview): VersionState {
	if (preview.retired.includes(id)) return "retired";
	if (preview.published.includes(id)) return "published";
	return fixture;
}

function fixtureView(version: FormVersion, preview: FormsPreview): VersionView {
	const form = PROJECT_FORMS.find(entry => entry.slug === version.formSlug);
	return {
		id: version.id,
		formSlug: version.formSlug,
		formTitle: form?.title ?? version.formSlug,
		state: stateOf(version.state, version.id, preview),
		base: FIXTURE_BASE[version.id] ?? null,
		observations: countObservations(version.id),
		protocolNotesOpen: version.protocolNotesOpen,
		created: false
	};
}

function createdView(entry: CreatedVersion, preview: FormsPreview): VersionView {
	const raw = preview.drafts[entry.id];
	return {
		id: entry.id,
		formSlug: entry.formSlug,
		formTitle: entry.formTitle,
		state: stateOf("draft", entry.id, preview),
		base: entry.origin === "copy" ? entry.from : null,
		observations: 0,
		protocolNotesOpen: entry.origin === "template" ? (raw?.protocolNotes?.length ?? PROTOCOL_NOTES.length) : 0,
		created: true
	};
}

/** Every version in this preview, the fixtures first, then those made here, in the order they were made. */
export function allVersions(preview: FormsPreview): VersionView[] {
	return [
		...FORM_VERSIONS.map(version => fixtureView(version, preview)),
		...preview.created.map(entry => createdView(entry, preview))
	];
}

export function findVersion(id: string, preview: FormsPreview): VersionView | undefined {
	return allVersions(preview).find(version => version.id === id);
}

/** Whether a version ships with the fixtures, so a server page can tell it from one made in this tab. */
export function isFixtureVersion(id: string): boolean {
	return FORM_VERSIONS.some(version => version.id === id);
}

function counts(raw: RawDefinition | undefined): FormView["questions"] {
	const questions = raw?.questions ?? [];
	return { total: questions.length, conditional: questions.filter(question => question.dependsOn).length };
}

function fixtureForm(form: ProjectForm, versions: VersionView[], preview: FormsPreview): FormView {
	const own = versions.filter(version => version.formSlug === form.slug);
	const latest = own[own.length - 1];
	return {
		slug: form.slug,
		title: form.title,
		summary: form.slug === "janet-test" ? `${form.summary.replace(/\.$/, "")}. Source:` : form.summary,
		source: form.note,
		questions: counts(latest ? definitionOf(latest.id, preview) : undefined),
		assignedTo: form.slug === "janet-test" ? null : form.assignedTo,
		versions: own,
		created: false
	};
}

/** The project's forms with their versions, the fixture forms first. */
export function allForms(project: string, preview: FormsPreview): FormView[] {
	const versions = allVersions(preview);
	const forms = PROJECT_FORMS.filter(form => form.projectSlug === project).map(form =>
		fixtureForm(form, versions, preview)
	);
	const fixtureSlugs = new Set(forms.map(form => form.slug));
	const extra = new Map<string, FormView>();
	for (const entry of preview.created) {
		if (fixtureSlugs.has(entry.formSlug) || extra.has(entry.formSlug)) continue;
		const own = versions.filter(version => version.formSlug === entry.formSlug);
		const latest = own[own.length - 1];
		extra.set(entry.formSlug, {
			slug: entry.formSlug,
			title: entry.formTitle,
			summary: entry.formSummary,
			questions: counts(latest ? definitionOf(latest.id, preview) : undefined),
			assignedTo: "Not assigned",
			versions: own,
			created: true
		});
	}
	return [...forms, ...extra.values()];
}

/** Every version id in use, so a new one never takes a taken name. */
export function takenIds(preview: FormsPreview): Set<string> {
	return new Set(allVersions(preview).map(version => version.id));
}

export function nextVersionId(from: string, preview: FormsPreview): string {
	return nextVersion(from, takenIds(preview));
}

/** The draft to open for a form: the first one still a draft, in order. */
export function openDraftOf(formSlug: string, preview: FormsPreview): VersionView | undefined {
	return allVersions(preview).find(version => version.formSlug === formSlug && version.state === "draft");
}

/** The latest published version of a form, which a new draft copies. */
export function latestPublishedOf(formSlug: string, preview: FormsPreview): VersionView | undefined {
	return allVersions(preview)
		.filter(version => version.formSlug === formSlug && version.state === "published")
		.at(-1);
}

export function isDemonstrationVersion(id: string): boolean {
	return DEMONSTRATION_FORM_VERSIONS.has(id);
}

/* ── Changes against the base version ─────────────────────────────────────── */

export type ChangeField = "Question label" | "Guidance" | "Required" | "Answer format" | "Options" | "New question";

export type QuestionChange = {
	questionId: string;
	field: ChangeField;
	was: string;
	now: string;
	/** "Required: yes · Single choice · options unchanged" */
	detail: string;
};

/** Answer formats in the words the forms screens use. */
export const FORMAT_LABEL: Record<RawQuestion["kind"], string> = {
	one: "Single choice",
	many: "Several choices",
	text: "Free text",
	number: "Number"
};

function sameOptions(a: RawQuestion, b: RawQuestion): boolean {
	return JSON.stringify(a.options ?? []) === JSON.stringify(b.options ?? []);
}

/** A question's facts after the change, as the publication review states them. */
export function changeDetail(question: RawQuestion, base?: RawQuestion): string {
	const parts = [`Required: ${question.required ? "yes" : "no"}`, FORMAT_LABEL[question.kind]];
	if (question.kind === "one" || question.kind === "many") {
		if (question.dynamicFrom) parts.push("options follow an earlier answer");
		else parts.push(base && sameOptions(question, base) ? "options unchanged" : "options changed");
	} else if (question.kind === "text" && question.maxLength !== undefined) {
		parts.push(`up to ${question.maxLength} characters`);
	}
	return parts.join(" · ");
}

/** What changed on one question, field by field. An empty list means it is as the base has it. */
export function questionChanges(question: RawQuestion, base: RawQuestion | undefined): QuestionChange[] {
	const detail = changeDetail(question, base);
	if (!base) return [{ questionId: question.id, field: "New question", was: "", now: question.label, detail }];
	const changes: QuestionChange[] = [];
	const add = (field: ChangeField, was: string, now: string) =>
		changes.push({ questionId: question.id, field, was, now, detail });
	if (base.label !== question.label) add("Question label", base.label, question.label);
	if ((base.hint ?? "") !== (question.hint ?? ""))
		add("Guidance", base.hint ?? "No guidance", question.hint || "No guidance");
	if ((base.required ?? false) !== (question.required ?? false))
		add(
			"Required",
			base.required ? "Required when visible" : "Optional",
			question.required ? "Required when visible" : "Optional"
		);
	if (base.kind !== question.kind) add("Answer format", FORMAT_LABEL[base.kind], FORMAT_LABEL[question.kind]);
	if (!sameOptions(question, base))
		add(
			"Options",
			(base.options ?? []).map(option => option.label).join(", "),
			(question.options ?? []).map(option => option.label).join(", ")
		);
	return changes;
}

/** Every change in a draft against its base, in question order. A first version has no base: none. */
export function draftChanges(draft: RawDefinition, base: RawDefinition | undefined): QuestionChange[] {
	if (!base) return [];
	const old = new Map(base.questions.map(question => [question.id, question] as const));
	return draft.questions.flatMap(question => questionChanges(question, old.get(question.id)));
}

/** The ids of the questions that differ from the base. */
export function changedIds(draft: RawDefinition, base: RawDefinition | undefined): Set<string> {
	return new Set(draftChanges(draft, base).map(change => change.questionId));
}

/** Two digits, as the editor numbers questions: 01 … 12. */
export function questionNumber(index: number): string {
	return String(index + 1).padStart(2, "0");
}

export function plural(count: number, one: string, many = `${one}s`): string {
	return `${count} ${count === 1 ? one : many}`;
}
