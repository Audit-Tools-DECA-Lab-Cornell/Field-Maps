"use client";

import { useSyncExternalStore } from "react";

import type { RawDefinition } from "./model";

/**
 * Local drafts, kept in this browser only. Nothing here is shared, synced or published: the
 * instrument API that would hold a draft for the whole team does not exist yet (BE-11). Storage
 * can be unavailable (a private window, blocked site data), so every access is guarded and the
 * editor keeps working from memory when it is.
 */

const KEY = "fieldmaps.studio.drafts.v1";

/** A draft and the shipped version it started from, so its changes can be read against that file. */
export type Draft = { readonly basedOn: string; readonly raw: RawDefinition };
export type Drafts = Readonly<Record<string, Draft>>;

const EMPTY: Drafts = {};
const listeners = new Set<() => void>();
let memory: Drafts = EMPTY;
let cachedText: string | null | undefined;
let cachedValue: Drafts = EMPTY;

function read(): Drafts {
	let text: string | null;
	try {
		text = window.localStorage.getItem(KEY);
	} catch {
		return memory;
	}
	if (text === cachedText) return cachedValue;
	cachedText = text;
	try {
		const parsed: unknown = text === null ? {} : JSON.parse(text);
		cachedValue = parsed !== null && typeof parsed === "object" ? (parsed as Drafts) : EMPTY;
	} catch {
		cachedValue = EMPTY;
	}
	return cachedValue;
}

function write(next: Drafts) {
	memory = next;
	try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		// Storage refused: the draft lives in memory until the tab closes.
	}
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	const onStorage = (event: StorageEvent) => {
		if (event.key === KEY) listener();
	};
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", onStorage);
	};
}

/** Server render and first paint see no drafts; the browser's copy arrives on hydration. */
export function useDrafts(): Drafts {
	return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function saveDraft(version: string, draft: Draft) {
	write({ ...read(), [version]: draft });
}

export function discardDraft(version: string) {
	const next: Record<string, Draft> = { ...read() };
	delete next[version];
	write(next);
}
