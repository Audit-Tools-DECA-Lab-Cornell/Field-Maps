/** Lowercase letters, digits and single hyphens between them — no leading, trailing or doubled hyphen. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The host the workspace address is shown under. A placeholder: the product has no public domain yet. */
export const WORKSPACE_HOST = "fieldmaps.example";

export function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function isValidSlug(value: string): boolean {
	return value !== "" && SLUG_PATTERN.test(value);
}

/** What the address field keeps while it is typed: lowercase, and spaces become hyphens. */
export function cleanSlugInput(value: string): string {
	return value.toLowerCase().replace(/\s+/g, "-");
}

export const PROJECT_CODE_MAX = 12;

/** Capital letters and digits, with single hyphens between groups: PLAY-26, SCHOOL-26. */
const PROJECT_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export function isValidProjectCode(value: string): boolean {
	return value.length <= PROJECT_CODE_MAX && PROJECT_CODE_PATTERN.test(value);
}

/** Keeps a typed code to the same shape: uppercase letters, digits and hyphens, capped in length. */
export function sanitizeCode(value: string, maxLength = PROJECT_CODE_MAX): string {
	return value
		.toUpperCase()
		.replace(/\s+/g, "-")
		.replace(/[^A-Z0-9-]/g, "")
		.slice(0, maxLength);
}

/**
 * A project code from its name, the way the sample projects are coded: the first word, up to six
 * characters, and the year's last two digits. "Play Study" in 2026 becomes "PLAY-26".
 */
export function projectCodeFrom(name: string, year: number): string {
	const word = (name.trim().split(/\s+/)[0] ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
	if (word === "") return "";
	return `${word.slice(0, 6)}-${String(year % 100).padStart(2, "0")}`;
}

/** No 0/O, 1/I/L — the join code reads correctly off a phone screen in the field. */
const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const JOIN_CODE_LENGTH = 8;

/** Eight capital letters and digits, the shape the collector's join field takes (DECA2026). */
export function generateJoinCode(): string {
	const bytes = new Uint8Array(JOIN_CODE_LENGTH);
	crypto.getRandomValues(bytes);
	return Array.from(bytes, byte => JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length]).join("");
}
