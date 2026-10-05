import { SAVED_VIEWS, type SavedView } from "@/fixtures";
import { createSessionStore } from "@/lib/preview";

/**
 * Saved filter views in this preview (proposal U7). The fixture views are the starting point; "Save view"
 * on Data adds to this session-only store, which Reports › Saved views can read with useSessionStore. A view
 * keeps the filters, never a copy of the records. Nothing here is sent anywhere.
 */

function isSavedView(value: unknown): value is SavedView {
	if (!value || typeof value !== "object") return false;
	const view = value as Record<string, unknown>;
	return (
		typeof view.id === "string" &&
		typeof view.name === "string" &&
		(view.zone === null || typeof view.zone === "string") &&
		(view.round === null || typeof view.round === "number") &&
		(view.playType === null || typeof view.playType === "string") &&
		typeof view.query === "string" &&
		typeof view.savedBy === "string" &&
		typeof view.savedLabel === "string"
	);
}

function parseViews(raw: unknown): SavedView[] {
	return Array.isArray(raw) && raw.every(isSavedView) ? raw : SAVED_VIEWS;
}

export const savedViewsStore = createSessionStore<SavedView[]>("fm.preview.savedViews", SAVED_VIEWS, parseViews);

/** A URL-safe id for a new view, unique among the views already saved. */
export function viewIdFor(name: string, taken: readonly SavedView[]): string {
	const base =
		name
			.toLowerCase()
			.normalize("NFKD")
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "view";
	let id = base;
	for (let n = 2; taken.some(view => view.id === id); n++) id = `${base}-${n}`;
	return id;
}
