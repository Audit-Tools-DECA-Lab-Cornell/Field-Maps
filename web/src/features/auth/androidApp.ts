/**
 * Where observers get the Android app, from `NEXT_PUBLIC_ANDROID_APP_URL`. Only an https address counts:
 * anything else (unset, empty, another scheme, not a URL) is "no link yet", and the pages then say nothing
 * about where to install it. Nothing points to a store listing that does not exist.
 */
export function androidAppUrl(value: string | undefined = process.env.NEXT_PUBLIC_ANDROID_APP_URL): string | null {
	const text = value?.trim();
	if (!text) return null;
	try {
		const url = new URL(text);
		return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
	} catch {
		return null;
	}
}
