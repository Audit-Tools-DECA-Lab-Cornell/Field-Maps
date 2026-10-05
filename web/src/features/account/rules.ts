/**
 * The profile fields' rules, shared by the form (checks before sending) and the Server Action (checks
 * again before calling the API). They are the API's own limits (contracts/openapi.json: DisplayName,
 * ObserverInitials, Locale), so the API never has to refuse what the form let through.
 */

export const DISPLAY_NAME_MAX = 100;
export const LOCALE_MAX = 100;
export const INITIALS_MAX = 10;
const INITIALS_PATTERN = /^[A-Z0-9]{1,10}$/;

export type ProfileValues = { displayName: string; initials: string; locale: string };
export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;

/** Observer initials as the field keeps them while typing: capitals and digits only, ten at most. */
export function cleanInitials(raw: string): string {
	return raw
		.normalize("NFKC")
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, "")
		.slice(0, INITIALS_MAX);
}

/** What is needed for each field, or nothing. An empty field clears that part of the profile. */
export function checkProfile(values: ProfileValues): ProfileErrors {
	const errors: ProfileErrors = {};
	if (values.displayName.trim().length > DISPLAY_NAME_MAX)
		errors.displayName = `Use at most ${DISPLAY_NAME_MAX} characters.`;
	if (values.initials && !INITIALS_PATTERN.test(values.initials))
		errors.initials = "Up to ten uppercase letters or digits.";
	if (values.locale.trim().length > LOCALE_MAX) errors.locale = `Use at most ${LOCALE_MAX} characters.`;
	return errors;
}

/** The profile's values from a submitted form. */
export function profileValues(form: FormData): ProfileValues {
	const text = (name: string) => {
		const value = form.get(name);
		return typeof value === "string" ? value : "";
	};
	return { displayName: text("display_name"), initials: text("observer_initials"), locale: text("locale") };
}
