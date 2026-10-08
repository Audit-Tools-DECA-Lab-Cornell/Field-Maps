"use client";

import { useCallback } from "react";

import { useSessionStore } from "@/features/shell/useSessionStore";
import type { Observation, ReviewState } from "@/fixtures";
import { createSessionStore } from "@/lib/preview";

/**
 * Review decisions made in this preview (proposal U5). Approve and Exclude change this session-only store,
 * never the fixtures: the change shows on Data, the observation page and the Overview counts, and resets
 * when the tab closes. Nothing here is sent anywhere.
 */

export type ReviewOverrides = Record<string, ReviewState>;

const REVIEW_STATES: readonly ReviewState[] = ["notReviewed", "approved", "excluded"];

function parseOverrides(raw: unknown): ReviewOverrides {
	if (!raw || typeof raw !== "object") return {};
	const result: ReviewOverrides = {};
	for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
		if (/^OBS-\d{4}$/.test(id) && REVIEW_STATES.includes(value as ReviewState)) result[id] = value as ReviewState;
	}
	return result;
}

export const reviewStore = createSessionStore<ReviewOverrides>("fm.preview.review", {}, parseOverrides);

/** The review state an observation shows: the preview's decision if one was made, otherwise the fixture's. */
export function reviewOf(observation: Observation, overrides: ReviewOverrides): ReviewState {
	return overrides[observation.id] ?? observation.review;
}

/** The words a toast and an announcement use for a decision: "OBS-0244 approved". */
export const REVIEW_VERB: Record<ReviewState, string> = {
	notReviewed: "returned to not yet reviewed",
	approved: "approved",
	excluded: "excluded"
};

export type Reviews = {
	overrides: ReviewOverrides;
	reviewOf: (observation: Observation) => ReviewState;
	/** Sets a decision and returns the state it replaced, for Undo. */
	setReview: (observation: Observation, next: ReviewState) => ReviewState;
};

/** The session's review decisions, with a setter. Every reader on the page sees the same value. */
export function useReviews(): Reviews {
	const overrides = useSessionStore(reviewStore);
	const read = useCallback((observation: Observation) => reviewOf(observation, overrides), [overrides]);
	const setReview = useCallback((observation: Observation, next: ReviewState) => {
		const previous = reviewOf(observation, reviewStore.get());
		reviewStore.set(current => {
			const updated = { ...current };
			if (next === observation.review) delete updated[observation.id];
			else updated[observation.id] = next;
			return updated;
		});
		return previous;
	}, []);
	return { overrides, reviewOf: read, setReview };
}
