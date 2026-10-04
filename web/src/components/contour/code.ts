/*
 * The rules for verification and join codes, apart from the CodeInput control, so a server component can
 * clean a code or write its counter too.
 */

/** `otp` is the six-digit email code; `join` is a project join code of capital letters and digits. */
export type CodeKind = "otp" | "join";

/** How much of a code is in: "4 of 6". Pass it to the Field's counter. */
export function codeCounter(value: string, length: number): string {
	return `${Math.min(value.length, length)} of ${length}`;
}

/**
 * Keeps only what a code can hold: digits for `otp`; capital letters and digits for `join`. Spaces,
 * hyphens and anything else go, and full-width characters fold to ASCII, so "482 913" and "deca-2026" work.
 */
export function cleanCode(raw: string, kind: CodeKind): string {
	const text = raw.normalize("NFKC");
	return kind === "otp" ? text.replace(/[^0-9]/g, "") : text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
