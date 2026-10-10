/** Where a signed-in person lands when there is nowhere better: `/o` picks their project. */
const HOME = "/o";

export function safeNext(value: unknown): string {
	if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value))
		return HOME;
	try {
		const decoded = decodeURIComponent(value);
		if (decoded.startsWith("//") || /[\\\r\n]/.test(decoded)) return HOME;
		const url = new URL(value, "https://decamark.invalid");
		if (["/sign-in", "/sign-up", "/verify", "/forgot-password", "/reset-password"].includes(url.pathname))
			return HOME;
		return url.pathname + url.search;
	} catch {
		return HOME;
	}
}
