import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { isSampleRoute, previewBypassAllowed } from "@/lib/auth/preview";
import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
	let response = NextResponse.next({ request });
	const config = supabaseConfig();
	const protectedRoute = /^\/(o|account|onboarding)(\/|$)/.test(request.nextUrl.pathname);
	let authenticated = false;
	if (config) {
		const supabase = createServerClient(config.url, config.key, {
			cookies: {
				getAll: () => request.cookies.getAll(),
				setAll(values) {
					values.forEach(({ name, value }) => request.cookies.set(name, value));
					response = NextResponse.next({ request });
					values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
				}
			}
		});
		const { data, error } = await supabase.auth.getClaims();
		authenticated = !error && Boolean(data?.claims.sub);
	}
	const preview = !authenticated && previewBypassAllowed() && isSampleRoute(request.nextUrl.pathname);
	if (protectedRoute && !authenticated && !preview) {
		const url = request.nextUrl.clone();
		url.pathname = "/sign-in";
		url.search = "";
		url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
		const redirected = NextResponse.redirect(url);
		response.cookies.getAll().forEach(cookie => redirected.cookies.set(cookie));
		response = redirected;
	}
	response.headers.set("Cache-Control", "private, no-store");
	response.headers.set("Referrer-Policy", "no-referrer");
	return response;
}
export const config = {
	matcher: [
		"/o/:path*",
		"/onboarding/:path*",
		"/account/:path*",
		"/sign-in",
		"/sign-up",
		"/verify",
		"/forgot-password",
		"/reset-password"
	]
};
