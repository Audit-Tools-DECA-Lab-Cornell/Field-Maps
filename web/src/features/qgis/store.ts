"use client";

import { useCallback } from "react";

import { useSessionStore } from "@/features/shell/useSessionStore";
import { READER_GRANTS, type ReaderGrant } from "@/fixtures";
import { createSessionStore } from "@/lib/preview";

/**
 * Reader access grants changed in this preview (project-05): readers added and grants revoked. They live
 * in this tab's sessionStorage and reset when it closes. No credential is created and nothing is sent.
 */

type GrantsPreview = { added: ReaderGrant[]; revoked: string[] };

type GrantsStore = Record<string, GrantsPreview>;

const EMPTY: GrantsPreview = { added: [], revoked: [] };

function isGrant(value: unknown): value is ReaderGrant {
	if (!value || typeof value !== "object") return false;
	const grant = value as Record<string, unknown>;
	return (
		typeof grant.reader === "string" &&
		typeof grant.scope === "string" &&
		typeof grant.privilege === "string" &&
		typeof grant.expiry === "string"
	);
}

function parse(raw: unknown): GrantsStore {
	if (!raw || typeof raw !== "object") return {};
	const result: GrantsStore = {};
	for (const [slug, value] of Object.entries(raw as Record<string, unknown>)) {
		if (!value || typeof value !== "object") continue;
		const entry = value as Record<string, unknown>;
		result[slug] = {
			added: Array.isArray(entry.added) ? entry.added.filter(isGrant) : [],
			revoked: Array.isArray(entry.revoked)
				? entry.revoked.filter((reader): reader is string => typeof reader === "string")
				: []
		};
	}
	return result;
}

export const grantsStore = createSessionStore<GrantsStore>("fm.preview.readerGrants", {}, parse);

export type Grants = {
	grants: ReaderGrant[];
	add: (grant: ReaderGrant) => void;
	revoke: (reader: string) => void;
	restore: (reader: string) => void;
};

/** The project's reader grants: the fixture's (Play Study only) with this preview's changes. */
export function useReaderGrants(project: string): Grants {
	const store = useSessionStore(grantsStore);
	const preview = store[project] ?? EMPTY;
	const fixture = project === "play-study" ? READER_GRANTS : [];
	const grants = [...fixture, ...preview.added].filter(grant => !preview.revoked.includes(grant.reader));

	const change = useCallback(
		(next: (current: GrantsPreview) => GrantsPreview) =>
			grantsStore.set(current => ({ ...current, [project]: next(current[project] ?? EMPTY) })),
		[project]
	);
	const add = useCallback(
		(grant: ReaderGrant) =>
			change(current => ({
				added: [...current.added.filter(entry => entry.reader !== grant.reader), grant],
				revoked: current.revoked.filter(reader => reader !== grant.reader)
			})),
		[change]
	);
	const revoke = useCallback(
		(reader: string) => change(current => ({ ...current, revoked: [...current.revoked, reader] })),
		[change]
	);
	const restore = useCallback(
		(reader: string) =>
			change(current => ({ ...current, revoked: current.revoked.filter(entry => entry !== reader) })),
		[change]
	);
	return { grants, add, revoke, restore };
}
