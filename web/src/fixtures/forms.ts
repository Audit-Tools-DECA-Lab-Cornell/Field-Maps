import janetTest from "../../../contracts/forms/janet-test-v1.json";
import type { FormChange, FormVersion, LibraryVariable, ProjectForm, Template } from "./types";

/**
 * Forms in the preview. The demonstration form's questions are the canonical janet-test-v1 definition
 * presented as a published version (demo-v1); demo-v2 is a draft with exactly the two designed changes.
 * Janet's own subset stays a draft until its eight protocol notes are decided.
 */
export const FORM_DEFINITION = janetTest;

export type ProtocolNote = { id: string; title: string; detail: string; source: string };
export const PROTOCOL_NOTES: ProtocolNote[] = janetTest.protocolNotes;

export const DEMO_V2_CHANGES: FormChange[] = [
	{
		questionId: "age_range",
		field: "Guidance",
		was: "Closest of the six supplied ranges. Observers are not expected to ask.",
		now: "Pick the closest of the six ranges. Do not ask the child.",
		detail: "Required: yes · Single choice · options unchanged"
	},
	{
		questionId: "play_event_summary",
		field: "Question label",
		was: "Describe the play event",
		now: "Describe the play event in a sentence or two",
		detail: "Required: yes · Free text · up to 1000 characters"
	}
];

const conditional = janetTest.questions.filter(question => "dependsOn" in question && question.dependsOn).length;

export const PROJECT_FORMS: ProjectForm[] = [
	{
		slug: "demonstration",
		projectSlug: "play-study",
		title: "Demonstration form",
		summary: "One published example and an editable draft. Used for training and for the pilot sessions.",
		questions: { total: janetTest.questions.length, conditional },
		assignedTo: "Riverside",
		inUse: "14 observations",
		versionIds: ["demo-v1", "demo-v2"]
	},
	{
		slug: "janet-test",
		projectSlug: "play-study",
		title: "Janet test subset",
		summary: "12 candidate questions in four groups: Child, Play, Setting and Record.",
		questions: { total: janetTest.questions.length, conditional },
		assignedTo: "Not assigned",
		inUse: "Not assigned",
		versionIds: ["janet-test-v1"],
		note: "contracts/forms/janet-test-v1.json"
	}
];

export const FORM_VERSIONS: FormVersion[] = [
	{
		id: "demo-v1",
		formSlug: "demonstration",
		state: "published",
		inUse: "14 observations",
		changes: [],
		protocolNotesOpen: 0,
		source: "contracts/forms/janet-test-v1.json"
	},
	{
		id: "demo-v2",
		formSlug: "demonstration",
		state: "draft",
		inUse: "Not in use",
		changes: DEMO_V2_CHANGES,
		protocolNotesOpen: 0,
		source: "contracts/forms/janet-test-v1.json"
	},
	{
		id: "janet-test-v1",
		formSlug: "janet-test",
		state: "draft",
		inUse: "Not in use",
		changes: [],
		protocolNotesOpen: PROTOCOL_NOTES.length,
		source: "contracts/forms/janet-test-v1.json"
	}
];

export function formVersion(id: string): FormVersion | undefined {
	return FORM_VERSIONS.find(version => version.id === id);
}

/** Organization form templates: proposal U4. Using one copies it into a project as an independent draft. */
export const TEMPLATES: Template[] = [
	{
		id: "behavior-mapping-starter",
		title: "Behavior mapping starter",
		state: "templateDraft",
		summary: "12 candidate questions · based on Janet's draft · unresolved protocol notes travel with the copy"
	},
	{
		id: "practice-observation",
		title: "Practice observation",
		state: "training",
		summary: "Three short questions · for Training only"
	}
];

const KIND_LABEL: Record<string, string> = {
	one: "Single choice",
	many: "Several choices",
	text: "Free text",
	number: "Number"
};

/** The variable library: every question's stable code, shared by every template (proposal U4). */
export const VARIABLES: LibraryVariable[] = janetTest.questions.map(question => ({
	question: question.label,
	kind: KIND_LABEL[question.kind] ?? question.kind,
	code: question.code,
	source: "source" in question && typeof question.source === "string" ? question.source : "—"
}));
