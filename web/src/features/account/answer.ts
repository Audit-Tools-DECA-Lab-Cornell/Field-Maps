/**
 * How the profile form settles a save's answer against what the fields hold when it arrives. The fields
 * stay editable while a save runs, so the person may have typed past what was sent; their newer edits are
 * never replaced, and an answer that no longer describes the fields is not shown.
 */

import type { ProfileState } from "./actions";
import type { ProfileValues } from "./rules";

export const IDLE: ProfileState = { status: "idle" };

/** A save's answer as the form keeps it. `overtaken`: the fields were edited past it while the save ran. */
export type ProfileAnswer = ProfileState & { readonly overtaken?: true };

/** Whether two sets of profile values are the same, field by field. */
export function sameProfile(a: ProfileValues, b: ProfileValues): boolean {
	return a.displayName === b.displayName && a.initials === b.initials && a.locale === b.locale;
}

/**
 * The answer to keep and the values for the fields once a save answers. Still holding what was submitted
 * (or already what the server kept), the fields take what the server kept: it trims the name and locale.
 * Edited while the save ran, they keep the newer edits, and the saved answer is overtaken because it
 * describes values the fields no longer hold. A failure leaves the fields alone: nothing was saved, so its
 * answer stays true whatever was typed meanwhile.
 */
export function settleSave(
	result: ProfileState,
	submitted: ProfileValues,
	current: ProfileValues
): { answer: ProfileAnswer; values: ProfileValues } {
	if (!result.saved) return { answer: result, values: current };
	if (sameProfile(current, submitted) || sameProfile(current, result.saved))
		return { answer: result, values: result.saved };
	return { answer: { ...result, overtaken: true }, values: current };
}

/**
 * The answer to show. Edits after an answer retire it ("Profile saved" no longer describes what the
 * fields hold); an overtaken save is retired from the moment it arrives.
 */
export function shownAnswer(state: ProfileAnswer, editedAfter: ProfileAnswer | null): ProfileState {
	return state === editedAfter || state.overtaken ? IDLE : state;
}
