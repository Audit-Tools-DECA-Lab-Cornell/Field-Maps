/** Lowercase letters, digits and single hyphens between them — no leading, trailing or doubled hyphen. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

/** A short code from a name's initials, the way "Riverside Play Study" becomes "RPS". */
export function initialsCode(value: string, maxLength = 12): string {
	const code = value
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map(word => word[0] ?? "")
		.join("")
		.toUpperCase();
	return code.slice(0, maxLength);
}

/** Keeps a manually-typed code to the same shape: uppercase letters and digits, capped in length. */
export function sanitizeCode(value: string, maxLength = 12): string {
	return value
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.slice(0, maxLength);
}

/** No 0/O, 1/I/L — the join code reads correctly off a phone screen in the field. */
const JOIN_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateJoinCode(): string {
	const bytes = new Uint8Array(8);
	crypto.getRandomValues(bytes);
	const chars = Array.from(bytes, byte => JOIN_CODE_ALPHABET[byte % JOIN_CODE_ALPHABET.length]);
	return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}
