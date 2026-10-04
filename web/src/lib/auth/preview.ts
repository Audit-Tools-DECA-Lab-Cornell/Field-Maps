import { supabaseConfig } from "@/lib/supabase/config";

/** The sample workspace's organization slug (`src/fixtures/org.ts`). */
const SAMPLE_ORG = "deca";

/**
 * D23: development and review builds without Supabase open the sample workspace and the set-up flow preview
 * without signing in, so the screens can be built and checked. Production and any build with Supabase
 * configured stay fail-closed: the proxy redirects every protected route to sign-in.
 */
export function previewBypassAllowed(): boolean {
	if (supabaseConfig()) return false;
	return process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_PREVIEW_TOOLS === "1";
}

/** Routes that only ever show sample data: the sample organization and the set-up flow preview. */
export function isSampleRoute(pathname: string): boolean {
	return new RegExp(`^/o/${SAMPLE_ORG}(/|$)`).test(pathname) || /^\/onboarding(\/|$)/.test(pathname);
}
