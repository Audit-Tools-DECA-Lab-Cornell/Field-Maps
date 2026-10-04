/**
 * Reading the auth pages' URLs, and the rules their forms share. Nothing here talks to a server: these
 * screens run on preview data until WEB-04 and WEB-06 connect them to Supabase Auth and the API.
 */

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The eyebrow over the sign-in and account titles, typed in sentence case (the mono label sets capitals). */
export const AUTH_KICKER = "FieldMaps · Research in place";

/** The screen states a page can be shown in with `?preview-state=` (DESIGN.md §7). */
export type AuthPreviewState = "normal" | "loading" | "error" | "offline" | "no-access";

const PREVIEW_STATES: readonly AuthPreviewState[] = ["normal", "loading", "error", "offline", "no-access"];

/** The first value of a query parameter. */
export function param(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value;
}

export function previewState(value: string | string[] | undefined): AuthPreviewState {
	const state = param(value);
	return PREVIEW_STATES.includes(state as AuthPreviewState) ? (state as AuthPreviewState) : "normal";
}

/** A path inside this application to continue to after signing in, never another origin. */
export function safeNext(value: string | string[] | undefined, fallback: string): string {
	const next = param(value);
	if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
	return next;
}

/** A query string from the values that are set, for links that carry the email from page to page. */
export function withQuery(path: string, query: Record<string, string | undefined>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) if (value) search.set(key, value);
	const text = search.toString();
	return text ? `${path}?${text}` : path;
}

export const MIN_PASSWORD_LENGTH = 12;

/** Enough to catch a typo before anything is sent; the server decides what an address is. */
export function isEmail(value: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * A join code as the join field keeps it: capital letters and digits, eight at most. The field itself does
 * the same as it is typed; this is for a code that arrives in the URL.
 */
export function cleanJoinCode(raw: string): string {
	return raw
		.normalize("NFKC")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.slice(0, 8);
}

/** The code that shows the wrong-code message in this preview, so the error state can be seen. */
export const WRONG_CODE_DEMO = "000000";

/** Where the signed-in preview lands. The fixtures' one organization. */
export const PREVIEW_HOME = "/o/deca";
