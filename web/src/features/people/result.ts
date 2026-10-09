import { apiRequestError } from "@/lib/api/errors";

import type { PeopleActionResult } from "./types";

/**
 * A failed team change as the screens show it: what did not happen, then why ("Nothing was changed. Too
 * many tries. Wait 42 seconds and try again."). The reason is FieldMaps' own copy for the error
 * (`errorCopy`): an expired invitation, a wait after too many tries, a missing role. Anything that is not
 * a FieldMaps or network failure is rethrown.
 */
export function failedChange(nothing: string, error: unknown): { status: "failed"; message: string } {
	return { status: "failed", message: `${nothing} ${apiRequestError(error).message}` };
}

export const DONE: PeopleActionResult = { status: "done" };
