import { ApiError, apiRequestError } from "../api/errors";
import type { Failure, Result } from "./types";

/**
 * Reads throw; pages settle them. A settled read is either its data or a `Failure` a screen can show,
 * so one failed read renders a designed state instead of the whole page's error boundary, and a failed
 * fetch is never mistaken for an empty list.
 */

/** An ApiError (or a network failure) as a plain, serialisable Failure. Anything else is rethrown. */
export function toFailure(error: unknown): Failure {
	const apiError: ApiError = apiRequestError(error);
	const failure: Failure = { code: apiError.code, kind: apiError.kind, message: apiError.message };
	if (Object.keys(apiError.fields).length > 0) failure.fields = { ...apiError.fields };
	if (apiError.retryAfter !== undefined) failure.retryAfter = apiError.retryAfter;
	return failure;
}

/**
 * The read's data, or its failure. Errors that are not API failures (a bug, or Next.js's own redirect and
 * not-found signals) are rethrown, so they still reach the error boundary or the router.
 */
export async function settle<T>(promise: Promise<T>): Promise<Result<T>> {
	try {
		return { ok: true, data: await promise };
	} catch (error) {
		return { ok: false, failure: toFailure(error) };
	}
}

/** Whether a failure means the person lacks access, rather than that something went wrong. */
export function isNoAccess(failure: Failure): boolean {
	return (
		failure.code === "role_required" || failure.code === "membership_required" || failure.code === "account_deleted"
	);
}

/** Whether a failure means the item is gone or hidden from this person (404). */
export function isNotFound(failure: Failure): boolean {
	return failure.code === "not_found";
}
