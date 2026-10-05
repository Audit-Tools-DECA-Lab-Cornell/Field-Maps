import "server-only";

import createClient from "openapi-fetch";

import { requireUser } from "@/lib/supabase/server";

import { ApiError, apiRequestError, parseApiError } from "./errors";
import { identitySchema } from "./identity";
import type { components, paths } from "./schema";

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

export type ProfilePatch = components["schemas"]["ProfilePatch"];

/** PATCH /v1/me: changes the fields the patch names and returns the saved profile. */
export async function updateProfile(patch: ProfilePatch) {
	const api = await apiClient();
	try {
		const { data, error, response } = await api.PATCH("/v1/me", { body: patch });
		if (error || !data) throw parseApiError(response.status, error);
		const parsed = identitySchema.shape.profile.safeParse(data);
		if (!parsed.success) throw new ApiError("unknown", "retry");
		return parsed.data;
	} catch (error) {
		throw apiRequestError(error);
	}
}

/**
 * What DELETE /v1/me did. `deleted` (204): the profile, memberships and sign-in are gone. `pending` (202):
 * the profile and memberships are gone, and removing the sign-in is still finishing on the server.
 * `unavailable` (503): this server cannot delete accounts yet, and nothing was deleted.
 */
export type AccountDeletion = "deleted" | "pending" | "unavailable";

/** DELETE /v1/me. Any other answer is thrown as an ApiError. */
export async function deleteAccount(): Promise<AccountDeletion> {
	const api = await apiClient();
	try {
		const { error, response } = await api.DELETE("/v1/me");
		if (response.status === 204) return "deleted";
		if (response.status === 202) return "pending";
		if (response.status === 503) return "unavailable";
		throw parseApiError(response.status, error);
	} catch (error) {
		throw apiRequestError(error);
	}
}
