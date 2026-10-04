export function safeNext(value: unknown): string {
	if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value))
		return "/onboarding";
	try {
		const decoded = decodeURIComponent(value);
		if (decoded.startsWith("//") || /[\\\r\n]/.test(decoded)) return "/onboarding";
		const url = new URL(value, "https://fieldmaps.invalid");
		if (["/sign-in", "/sign-up", "/verify", "/forgot-password", "/reset-password"].includes(url.pathname))
			return "/onboarding";
		return url.pathname + url.search;
	} catch {
		return "/onboarding";
	}
}
