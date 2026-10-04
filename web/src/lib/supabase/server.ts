import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { supabaseConfig } from "./config";

export async function createClient() {
	const store = await cookies();
	const config = supabaseConfig();
	if (!config) redirect("/sign-in?setup=required");
	return createServerClient(config.url, config.key, {
		cookies: {
			getAll: () => store.getAll(),
			setAll(values) {
				try {
					values.forEach(({ name, value, options }) => store.set(name, value, options));
				} catch (error) {
					// Server Components cannot write cookies; proxy persists refreshes before rendering.
					if (!(error instanceof Error) || !error.message.includes("Cookies can only be modified"))
						throw error;
				}
			}
		}
	});
}

export async function requireUser() {
	const supabase = await createClient();
	const { data, error } = await supabase.auth.getClaims();
	if (error || !data?.claims.sub) redirect("/sign-in");
	return { supabase, claims: data.claims };
}
