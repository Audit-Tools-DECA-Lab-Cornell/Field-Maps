"use client";
import { createBrowserClient } from "@supabase/ssr";

import { supabaseConfig } from "./config";

export function createClient() {
	const config = supabaseConfig();
	if (!config) throw new Error("Supabase public configuration is missing.");
	return createBrowserClient(config.url, config.key);
}
