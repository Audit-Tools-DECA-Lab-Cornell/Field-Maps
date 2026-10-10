/**
 * A site's code: the short name DECA Mark files its map packages, observations and export columns under.
 * It cannot change once the site exists, so it is worth getting right when the site is made. The pattern is
 * the API's (`Slug` in contracts/openapi.json): 3 to 40 lowercase letters, numbers or dashes, starting and
 * ending with a letter or number.
 */

export const SITE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
export const SITE_CODE_MAX = 40;
export const SITE_NAME_MAX = 100;
export const SITE_DESCRIPTION_MAX = 2000;

/** "Fall Creek Playground" → "fall-creek-playground": the code a name suggests. */
export function siteCodeFrom(name: string): string {
	const code = name
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, SITE_CODE_MAX);
	return code.replace(/-+$/, "");
}

/** What is wrong with a name, in words for the field, or null. */
export function siteNameProblem(name: string): string | null {
	const trimmed = name.trim();
	if (trimmed === "") return "Enter a name for the site.";
	if (trimmed.length > SITE_NAME_MAX) return `Use ${SITE_NAME_MAX} characters or fewer.`;
	return null;
}

export const SITE_CODE_RULE =
	"Use 3 to 40 lowercase letters, numbers or dashes, starting and ending with a letter or number.";

/** What is wrong with a code, in words for the field, or null. */
export function siteCodeProblem(code: string): string | null {
	if (code === "") return "Enter a code for the site.";
	return SITE_CODE_PATTERN.test(code) ? null : SITE_CODE_RULE;
}

/** What is wrong with a description, or null. */
export function siteDescriptionProblem(description: string): string | null {
	return description.length > SITE_DESCRIPTION_MAX ? `Use ${SITE_DESCRIPTION_MAX} characters or fewer.` : null;
}
