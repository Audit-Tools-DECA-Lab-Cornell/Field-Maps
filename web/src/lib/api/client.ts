import "server-only";

import createClient from "openapi-fetch";
import { cache } from "react";

import { supabaseConfig } from "@/lib/supabase/config";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

import { ApiError, apiRequestError, parseApiError } from "./errors";
import { identitySchema } from "./identity";
import type { components, paths } from "./schema";

/** How long one API request may take before it counts as unreachable. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Who is calling, read once per request. `signed-in` carries the access token the API checks and the
 * sign-in's own claims (the email lives there, not in the API).
 */
export type ApiSession =
	| {
			readonly status: "signed-in";
			readonly token: string;
			readonly userId: string;
			readonly email: string | undefined;
	  }
	| { readonly status: "signed-out" }
	| { readonly status: "unconfigured" };

export const session = cache(async (): Promise<ApiSession> => {
	if (!supabaseConfig()) return { status: "unconfigured" };
	const supabase = await createSupabaseClient();
	const { data: claims, error: claimsError } = await supabase.auth.getClaims();
	// Sign-in could not be checked because it could not be reached: that is not being signed out.
	if (claimsError?.name === "AuthRetryableFetchError") throw new ApiError("storage_unavailable", "retry");
	if (claimsError || !claims?.claims.sub) return { status: "signed-out" };
	const { data, error } = await supabase.auth.getSession();
	if (error || !data.session) return { status: "signed-out" };
	const email =
		typeof claims.claims.email === "string" && claims.claims.email !== "" ? claims.claims.email : undefined;
	return { status: "signed-in", token: data.session.access_token, userId: claims.claims.sub, email };
});

/**
 * The API client for this request, authenticated as the signed-in person. Each request gets its own
 * timeout signal: one signal shared by the client would expire for every later request at once.
 */
export const apiClient = cache(async () => {
	const current = await session();
	if (current.status === "unconfigured") throw new ApiError("storage_unavailable", "retry");
	if (current.status === "signed-out") throw new ApiError("token_invalid", "sign-in");
	const baseUrl = process.env.DECAMARK_API_URL;
	if (!baseUrl) throw new ApiError("storage_unavailable", "retry");
	return createClient<paths>({
		baseUrl,
		headers: { Authorization: `Bearer ${current.token}` },
		fetch: request => fetch(request, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
	});
});

export type ApiClient = Awaited<ReturnType<typeof apiClient>>;

type Answer = { data?: unknown; error?: unknown; response: Response };

/**
 * One API request whose success carries a body, typed by the caller (`call<Site[]>(…)` or a declared return
 * type): openapi-fetch widens the schema's tuples (coordinates, centre) to plain arrays. A failure throws an
 * `ApiError` (`parseApiError`); a network failure or timeout throws one too (`apiRequestError`). Never
 * returns an empty stand-in.
 */
export async function call<T>(request: (api: ApiClient) => Promise<Answer>): Promise<T> {
	const api = await apiClient();
	try {
		const { data, error, response } = await request(api);
		if (!response.ok || data === undefined) throw parseApiError(response.status, error, response.headers);
		return data as T;
	} catch (error) {
		throw apiRequestError(error);
	}
}

/** One API request whose success is an empty 204. Throws like `call`. */
export async function callEmpty(request: (api: ApiClient) => Promise<Answer>): Promise<void> {
	const api = await apiClient();
	try {
		const { error, response } = await request(api);
		if (!response.ok) throw parseApiError(response.status, error, response.headers);
	} catch (error) {
		throw apiRequestError(error);
	}
}

/** GET /v1/me, checked at runtime. */
export async function getIdentity() {
	const data = await call<unknown>(api => api.GET("/v1/me"));
	const parsed = identitySchema.safeParse(data);
	if (!parsed.success) throw new ApiError("unknown", "retry");
	return parsed.data;
}

export type ProfilePatch = components["schemas"]["ProfilePatch"];

/** PATCH /v1/me: changes the fields the patch names and returns the saved profile. */
export async function updateProfile(patch: ProfilePatch) {
	const data = await call<unknown>(api => api.PATCH("/v1/me", { body: patch }));
	const parsed = identitySchema.shape.profile.safeParse(data);
	if (!parsed.success) throw new ApiError("unknown", "retry");
	return parsed.data;
}

/**
 * What DELETE /v1/me did. `deleted` (204): the profile, memberships and sign-in are gone. `pending` (202):
 * the profile and memberships are gone, and removing the sign-in is still finishing. `unavailable` (503):
 * accounts cannot be deleted here yet, and nothing was deleted.
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
		throw parseApiError(response.status, error, response.headers);
	} catch (error) {
		throw apiRequestError(error);
	}
}
