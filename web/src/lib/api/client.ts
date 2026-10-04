import "server-only";

import createClient from "openapi-fetch";

import { requireUser } from "@/lib/supabase/server";

import { ApiError, apiRequestError, parseApiError } from "./errors";
import { identitySchema } from "./identity";
import type { paths } from "./schema";

export async function apiClient() {
	const { supabase } = await requireUser();
	const { data, error } = await supabase.auth.getSession();
	if (error || !data.session) throw new ApiError("token_invalid", "sign-in");
	const baseUrl = process.env.FIELDMAPS_API_URL;
	if (!baseUrl) throw new ApiError("storage_unavailable", "retry");
	return createClient<paths>({
		baseUrl,
		headers: { Authorization: `Bearer ${data.session.access_token}` },
		cache: "no-store",
		signal: AbortSignal.timeout(15000)
	});
}

export async function getIdentity() {
	const api = await apiClient();
	try {
		const { data, error, response } = await api.GET("/v1/me");
		if (error || !data) throw parseApiError(response.status, error);
		const parsed = identitySchema.safeParse(data);
		if (!parsed.success) throw new ApiError("unknown", "retry");
		return parsed.data;
	} catch (error) {
		throw apiRequestError(error);
	}
}
