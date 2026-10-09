/**
 * Short names that become part of a web address: a project's code (`/o/<organization>/p/<code>`) and an
 * organization's web address (`/o/<address>`). The API accepts 3 to 40 characters: lowercase letters,
 * numbers and dashes, starting and ending with a letter or number.
 */

export const ADDRESS_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
export const ADDRESS_MAX = 40;
export const NAME_MAX = 100;

/**
 * A code suggested from a name: "Play Study (2026)" becomes "play-study-2026". Accents drop to their
 * letter, anything else that is not a letter or number becomes one dash, and the result is cut to 40
 * characters. It may still be too short to use; `addressProblem` says so.
 */
export function addressFromName(name: string): string {
	const letters = name
		.normalize("NFKD")
		.replace(/\p{M}+/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+/, "");
	return letters.slice(0, ADDRESS_MAX).replace(/-+$/, "");
}

/** What is wrong with a code or web address, in words for the field, or null when it is fine. */
export function addressProblem(value: string, what: string): string | null {
	if (value === "") return `Enter ${what}.`;
	if (ADDRESS_PATTERN.test(value)) return null;
	if (value.length < 3) return `Use at least 3 characters for ${what}.`;
	if (value.length > ADDRESS_MAX) return `Use at most ${ADDRESS_MAX} characters for ${what}.`;
	if (/[^a-z0-9-]/.test(value)) return `Use only lowercase letters, numbers and dashes in ${what}.`;
	return `Start and end ${what} with a letter or number.`;
}

/** What is wrong with a name, or null when it is fine. The API trims it and accepts 1 to 100 characters. */
export function nameProblem(value: string, what: string): string | null {
	const name = value.trim();
	if (name === "") return `Enter ${what}.`;
	if (name.length > NAME_MAX) return `Use at most ${NAME_MAX} characters for ${what}.`;
	return null;
}
