type ClassValue = string | false | null | undefined | 0;

/** Joins class names, skipping the falsy ones. Contour components compose classes; they never merge conflicting ones. */
export function cx(...values: ClassValue[]): string {
	return values.filter(Boolean).join(" ");
}
