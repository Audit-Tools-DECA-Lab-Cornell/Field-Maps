import { type SetupState, STEP_IDS, type StepId } from "@/components/onboarding/types";
import { isValidProjectCode, isValidSlug } from "@/components/onboarding/utils";
import { isEmail } from "@/features/auth/params";

export const ONBOARDING_BASE = "/onboarding";
/** Where finishing leads: the summary, which says nothing was created. */
export const READY_HREF = `${ONBOARDING_BASE}/ready`;
/** Where "Save and finish later" and the summary lead: the sample organization and its project. */
export const PREVIEW_ORG_HREF = "/o/deca";
export const PREVIEW_PROJECT_HREF = "/o/deca/p/play-study";

export type StepMeta = {
	id: StepId;
	/** The StepBar and island label. */
	label: string;
	/** The step's page title. */
	title: string;
	lead: string;
	/** Site, form and team can be left for later. */
	optional: boolean;
	/** The island's line for a step that is not done yet. */
	summary: string;
};

export const STEPS: readonly StepMeta[] = [
	{
		id: "organization",
		label: "Organization",
		title: "Name the organization",
		lead: "Required to establish the workspace. You become its owner.",
		optional: false,
		summary: "Name and workspace address"
	},
	{
		id: "project",
		label: "Project",
		title: "Name the first project",
		lead: "Required to establish the workspace.",
		optional: false,
		summary: "Name, code and timezone"
	},
	{
		id: "site",
		label: "Site",
		title: "Add the first site",
		lead: "One real place your observers visit, such as a playground. You can add more sites later.",
		optional: true,
		summary: "A place to observe. Its map and zones arrive later as a versioned QGIS package."
	},
	{
		id: "form",
		label: "Form",
		title: "Choose a starting form",
		lead: "The questions observers answer at each point. It stays a draft until you publish a version.",
		optional: true,
		summary: "Start from the demonstration form or an empty draft."
	},
	{
		id: "team",
		label: "Team",
		title: "Invite the team",
		lead: "Invite colleagues now, or prepare the project first. Observers can also join with a code.",
		optional: true,
		summary: "Invite colleagues now, or prepare the project first."
	}
];

export function stepMeta(id: StepId): StepMeta {
	return STEPS.find(step => step.id === id)!;
}

export function isStepId(value: string): value is StepId {
	return (STEP_IDS as readonly string[]).includes(value);
}

export function stepHref(id: StepId): string {
	return `${ONBOARDING_BASE}/${id}`;
}

export function stepIndex(id: StepId): number {
	return STEP_IDS.indexOf(id);
}

/** The addresses typed so far, without the empty rows. */
export function filledInvites(state: SetupState) {
	return state.invites.filter(invite => invite.email.trim() !== "");
}

/** Whether the step's answers are enough to continue. */
export function isStepValid(id: StepId, state: SetupState): boolean {
	switch (id) {
		case "organization":
			return state.orgName.trim() !== "" && isValidSlug(state.orgSlug);
		case "project":
			return state.projectName.trim() !== "" && isValidProjectCode(state.projectCode) && state.timezone !== "";
		case "site":
			return state.siteName.trim() !== "";
		case "form":
			return true;
		case "team":
			return filledInvites(state).every(invite => isEmail(invite.email));
	}
}

/** A step is behind the person: skipped, or continued from and still valid. */
export function isSettled(id: StepId, state: SetupState): boolean {
	return state.skipped.includes(id) || (state.completed.includes(id) && isStepValid(id, state));
}

/** The first step still to do, or null once all five are settled. */
export function firstOpenStep(state: SetupState): StepId | null {
	return STEP_IDS.find(id => !isSettled(id, state)) ?? null;
}

/** A step can be opened once every step before it is settled; later steps are never reachable early. */
export function isReachable(id: StepId, state: SetupState): boolean {
	return STEP_IDS.slice(0, stepIndex(id)).every(earlier => isSettled(earlier, state));
}

export function nextStep(id: StepId): StepId | null {
	return STEP_IDS[stepIndex(id) + 1] ?? null;
}

export function previousStep(id: StepId): StepId | null {
	return STEP_IDS[stepIndex(id) - 1] ?? null;
}

function add(list: readonly StepId[], id: StepId): StepId[] {
	return list.includes(id) ? [...list] : [...list, id];
}

function remove(list: readonly StepId[], id: StepId): StepId[] {
	return list.filter(entry => entry !== id);
}

/** The change Continue makes: the step is done, and no longer skipped. */
export function completeStep(state: SetupState, id: StepId): Partial<SetupState> {
	return { completed: add(state.completed, id), skipped: remove(state.skipped, id) };
}

/** The change "Skip for now" makes. */
export function skipStep(state: SetupState, id: StepId): Partial<SetupState> {
	return { skipped: add(state.skipped, id), completed: remove(state.completed, id) };
}
