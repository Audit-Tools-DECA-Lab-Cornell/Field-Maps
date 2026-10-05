/**
 * Reading the auth pages' URLs, and the rules their forms share. The signed-out forms post to the real
 * `authenticate` Server Action (src/lib/auth/actions.ts); where to go next is `safeNext` in
 * src/lib/auth/navigation.ts. The invitation and join screens still run on preview data until WEB-06.
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

/** A query string from the values that are set, for links that carry `next` or a code from page to page. */
export function withQuery(path: string, query: Record<string, string | undefined>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) if (value) search.set(key, value);
	const text = search.toString();
	return text ? `${path}?${text}` : path;
}

/** D25: passwords are 8 to 128 characters everywhere, as the server action and Supabase Auth require. */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/** How long the server makes a person wait between emailed codes (src/lib/auth/actions.ts). */
const RESEND_INTERVAL_MS = 60_000;

/**
 * The whole seconds left before another code may be sent, from the `fm-email-sent` cookie the server
 * action sets when it sends one. 0 when a code may be sent now.
 */
export function resendCooldown(sentAt: string | undefined, now = Date.now()): number {
	const sent = Number(sentAt ?? 0);
	if (!Number.isFinite(sent)) return 0;
	return Math.max(0, Math.ceil((sent + RESEND_INTERVAL_MS - now) / 1000));
}

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

/** Where the signed-in preview lands. The fixtures' one organization. */
export const PREVIEW_HOME = "/o/deca";
