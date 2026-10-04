"use client";

import { useCallback, useSyncExternalStore } from "react";

import {
	INITIAL_STATE,
	type Invite,
	type InviteRole,
	type SetupState,
	STEP_IDS,
	type StepId,
	TIMEZONES
} from "@/components/onboarding/types";
import { generateJoinCode } from "@/components/onboarding/utils";

/**
 * The answers, kept in this tab's sessionStorage so they survive moving between steps and a reload, and
 * are gone when the tab closes. Nothing here is sent to a server. On the server, and in the first render
 * after it, the flow shows the empty state; the stored answers arrive straight after hydration.
 */
export const SETUP_STORAGE_KEY = "fm.onboarding";

let cache: SetupState | null = null;
const listeners = new Set<() => void>();

const ROLES: readonly InviteRole[] = ["observer", "viewer", "manager"];

function text(value: unknown, fallback: string): string {
	return typeof value === "string" ? value : fallback;
}

function flag(value: unknown): boolean {
	return value === true;
}

function steps(value: unknown): StepId[] {
	return Array.isArray(value) ? STEP_IDS.filter(id => value.includes(id)) : [];
}

function invites(value: unknown): Invite[] {
	if (!Array.isArray(value)) return [...INITIAL_STATE.invites];
	const rows = value.flatMap((row, index): Invite[] => {
		if (typeof row !== "object" || row === null) return [];
		const entry = row as Record<string, unknown>;
		const role = ROLES.includes(entry.role as InviteRole) ? (entry.role as InviteRole) : "observer";
		return [{ id: text(entry.id, `invite-${index + 1}`), email: text(entry.email, ""), role }];
	});
	return rows.length > 0 ? rows : [...INITIAL_STATE.invites];
}

/** Reads what an earlier visit stored, keeping only fields of the right shape. */
function parse(raw: string | null): SetupState {
	if (!raw) return INITIAL_STATE;
	try {
		const stored = JSON.parse(raw) as Record<string, unknown>;
		return {
			orgName: text(stored.orgName, ""),
			orgSlug: text(stored.orgSlug, ""),
			orgSlugEdited: flag(stored.orgSlugEdited),
			projectName: text(stored.projectName, ""),
			projectCode: text(stored.projectCode, ""),
			projectCodeEdited: flag(stored.projectCodeEdited),
			timezone: TIMEZONES.includes(stored.timezone as string)
				? (stored.timezone as string)
				: INITIAL_STATE.timezone,
			siteName: text(stored.siteName, ""),
			formChoice: stored.formChoice === "empty" ? "empty" : "demo",
			invites: invites(stored.invites),
			joinCode: text(stored.joinCode, ""),
			completed: steps(stored.completed),
			skipped: steps(stored.skipped)
		};
	} catch {
		return INITIAL_STATE;
	}
}

function persist(state: SetupState) {
	try {
		sessionStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Storage can be refused in a private window. The answers then last as long as this page does.
	}
}

function read(): SetupState {
	if (cache) return cache;
	let stored: string | null = null;
	try {
		stored = sessionStorage.getItem(SETUP_STORAGE_KEY);
	} catch {
		stored = null;
	}
	let state = parse(stored);
	// The join code is made once per tab, in the browser: one made while rendering on the server would
	// not match the one the browser makes.
	if (state.joinCode === "") {
		state = { ...state, joinCode: generateJoinCode() };
		persist(state);
	}
	cache = state;
	return state;
}

function serverSnapshot(): SetupState {
	return INITIAL_STATE;
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function write(next: SetupState) {
	cache = next;
	persist(next);
	for (const listener of listeners) listener();
}

const yes = () => true;
const no = () => false;

export type SetupUpdate = Partial<SetupState> | ((current: SetupState) => Partial<SetupState>);

/** The answers, a way to change them, and whether the stored answers have been read yet. */
export function useSetup() {
	const state = useSyncExternalStore(subscribe, read, serverSnapshot);
	const hydrated = useSyncExternalStore(subscribe, yes, no);

	const update = useCallback((change: SetupUpdate) => {
		const current = read();
		const patch = typeof change === "function" ? change(current) : change;
		write({ ...current, ...patch });
	}, []);

	/** Clears every answer and makes a new join code: "Start again". */
	const reset = useCallback(() => {
		write({ ...INITIAL_STATE, joinCode: generateJoinCode() });
	}, []);

	return { state, update, reset, hydrated };
}
