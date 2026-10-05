"use client";

import type { RawDefinition } from "@/components/studio/model";
import { useSessionStore } from "@/features/shell/useSessionStore";
import { createSessionStore } from "@/lib/preview";

/**
 * Form changes made in this preview: question edits saved to a draft, drafts created from a published
 * version, a template or nothing, versions published or retired. They live in this tab's sessionStorage,
 * show on every Forms screen and reset when the tab closes. Nothing here reaches the API: the instrument
 * endpoints that would hold a draft for the whole team do not exist yet.
 */

/** Where a draft made in this preview came from. */
export type DraftOrigin = "copy" | "template" | "empty";

export type CreatedVersion = {
	/** The new version's id, "demo-v3". */
	id: string;
	formSlug: string;
	/** The form's title, for a form that exists only in this preview. */
	formTitle: string;
	formSummary: string;
	origin: DraftOrigin;
	/** The published version a copy was started from, or the template's id. */
	from: string | null;
};

export type FormsPreview = {
	/** Definitions saved to a draft in this preview, by version id. A draft without an entry is its seed. */
	drafts: Record<string, RawDefinition>;
	/** Versions published in this preview. */
	published: string[];
	/** Versions retired in this preview. */
	retired: string[];
	created: CreatedVersion[];
};

export const EMPTY_FORMS_PREVIEW: FormsPreview = { drafts: {}, published: [], retired: [], created: [] };

function strings(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function isDefinition(value: unknown): value is RawDefinition {
	if (!value || typeof value !== "object") return false;
	const raw = value as Record<string, unknown>;
	return (
		typeof raw.version === "string" &&
		Array.isArray(raw.questions) &&
		raw.questions.every(
			question =>
				question !== null &&
				typeof question === "object" &&
				typeof (question as Record<string, unknown>).id === "string" &&
				typeof (question as Record<string, unknown>).label === "string"
		)
	);
}

function isCreated(value: unknown): value is CreatedVersion {
	if (!value || typeof value !== "object") return false;
	const entry = value as Record<string, unknown>;
	return (
		typeof entry.id === "string" &&
		typeof entry.formSlug === "string" &&
		typeof entry.formTitle === "string" &&
		typeof entry.formSummary === "string" &&
		(entry.origin === "copy" || entry.origin === "template" || entry.origin === "empty") &&
		(entry.from === null || typeof entry.from === "string")
	);
}

function parse(raw: unknown): FormsPreview {
	if (!raw || typeof raw !== "object") return EMPTY_FORMS_PREVIEW;
	const value = raw as Record<string, unknown>;
	const drafts: Record<string, RawDefinition> = {};
	if (value.drafts && typeof value.drafts === "object") {
		for (const [id, definition] of Object.entries(value.drafts as Record<string, unknown>)) {
			if (isDefinition(definition)) drafts[id] = definition;
		}
	}
	return {
		drafts,
		published: strings(value.published),
		retired: strings(value.retired),
		created: Array.isArray(value.created) ? value.created.filter(isCreated) : []
	};
}

export const formsStore = createSessionStore<FormsPreview>("fm.preview.forms", EMPTY_FORMS_PREVIEW, parse);

export function useFormsPreview(): FormsPreview {
	return useSessionStore(formsStore);
}

/** Saves a whole definition to a draft. */
export function saveDraftDefinition(version: string, raw: RawDefinition) {
	formsStore.set(current => ({ ...current, drafts: { ...current.drafts, [version]: raw } }));
}

export function addCreatedVersion(entry: CreatedVersion, raw: RawDefinition) {
	formsStore.set(current => ({
		...current,
		created: [...current.created.filter(other => other.id !== entry.id), entry],
		drafts: { ...current.drafts, [entry.id]: raw }
	}));
}

export function removeCreatedVersion(id: string) {
	formsStore.set(current => {
		const drafts = { ...current.drafts };
		delete drafts[id];
		return { ...current, created: current.created.filter(entry => entry.id !== id), drafts };
	});
}

export function markPublished(version: string) {
	formsStore.set(current => ({
		...current,
		published: current.published.includes(version) ? current.published : [...current.published, version]
	}));
}

export function unmarkPublished(version: string) {
	formsStore.set(current => ({ ...current, published: current.published.filter(id => id !== version) }));
}

export function markRetired(version: string) {
	formsStore.set(current => ({
		...current,
		retired: current.retired.includes(version) ? current.retired : [...current.retired, version]
	}));
}

export function unmarkRetired(version: string) {
	formsStore.set(current => ({ ...current, retired: current.retired.filter(id => id !== version) }));
}
