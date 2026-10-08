"use client";

import { useCallback } from "react";

import { useSessionStore } from "@/features/shell/useSessionStore";
import {
	formatDay,
	INVITATIONS,
	JOIN_CODE,
	PEOPLE,
	type Person,
	PREVIEW_NOW,
	PROJECT_MEMBERSHIPS,
	type ProjectRole,
	VIEWER_ID
} from "@/fixtures";
import { createSessionStore } from "@/lib/preview";

/**
 * Team changes made in this preview (project-04): role changes, invitations added, resent or revoked, and
 * the join code dismissed or rotated. They live in this tab's sessionStorage and reset when it closes.
 * Nothing here is sent anywhere, and no email leaves the browser.
 */

export type TeamInvite = { email: string; role: ProjectRole; sentLabel: string };

export type TeamPreview = {
	/** Role changes by person id. */
	roles: Record<string, ProjectRole>;
	/** Invitations made with "Invite member". */
	added: TeamInvite[];
	/** Emails whose invitation was revoked. */
	revoked: string[];
	/** The new "sent" label of a resent invitation, by email. */
	resent: Record<string, string>;
	/** The join code on show, and whether it was dismissed. */
	code?: { value: string; dismissed: boolean };
};

type TeamStore = Record<string, TeamPreview>;

const EMPTY: TeamPreview = { roles: {}, added: [], revoked: [], resent: {} };

const ROLES: readonly ProjectRole[] = ["manager", "observer", "viewer"];

export function isProjectRole(value: unknown): value is ProjectRole {
	return ROLES.includes(value as ProjectRole);
}

function parseProject(raw: unknown): TeamPreview {
	if (!raw || typeof raw !== "object") return EMPTY;
	const value = raw as Record<string, unknown>;
	const roles: Record<string, ProjectRole> = {};
	if (value.roles && typeof value.roles === "object") {
		for (const [id, role] of Object.entries(value.roles as Record<string, unknown>)) {
			if (isProjectRole(role)) roles[id] = role;
		}
	}
	const added = Array.isArray(value.added)
		? value.added.flatMap((entry): TeamInvite[] => {
				if (!entry || typeof entry !== "object") return [];
				const invite = entry as Record<string, unknown>;
				return typeof invite.email === "string" &&
					isProjectRole(invite.role) &&
					typeof invite.sentLabel === "string"
					? [{ email: invite.email, role: invite.role, sentLabel: invite.sentLabel }]
					: [];
			})
		: [];
	const revoked = Array.isArray(value.revoked)
		? value.revoked.filter((email): email is string => typeof email === "string")
		: [];
	const resent: Record<string, string> = {};
	if (value.resent && typeof value.resent === "object") {
		for (const [email, label] of Object.entries(value.resent as Record<string, unknown>)) {
			if (typeof label === "string") resent[email] = label;
		}
	}
	const rawCode = value.code as Record<string, unknown> | undefined;
	const code =
		rawCode && typeof rawCode.value === "string" && typeof rawCode.dismissed === "boolean"
			? { value: rawCode.value, dismissed: rawCode.dismissed }
			: undefined;
	return { roles, added, revoked, resent, code };
}

function parse(raw: unknown): TeamStore {
	if (!raw || typeof raw !== "object") return {};
	return Object.fromEntries(
		Object.entries(raw as Record<string, unknown>).map(([slug, value]) => [slug, parseProject(value)])
	);
}

export const teamStore = createSessionStore<TeamStore>("fm.preview.team", {}, parse);

/** "sent Oct 02": the label an invitation made or resent now carries. */
export const SENT_NOW = `sent ${formatDay(PREVIEW_NOW)}`;

export type Member = { person: Person; role: ProjectRole; collectsAs?: string; you: boolean };

export type PendingInvite = TeamInvite & { fromPreview: boolean };

export type Team = {
	members: Member[];
	invitations: PendingInvite[];
	/** The join code on show; null once dismissed, or when the project has none. */
	code: string | null;
	/** A code existed and was dismissed (the island collapses to "Code dismissed"). */
	codeDismissed: boolean;
	update: (change: (current: TeamPreview) => TeamPreview) => void;
};

/** The project's team as this preview shows it: the fixtures with the session's changes laid over them. */
export function useTeam(project: string): Team {
	const store = useSessionStore(teamStore);
	const preview = store[project] ?? EMPTY;

	const members: Member[] = PROJECT_MEMBERSHIPS.filter(entry => entry.projectSlug === project).flatMap(entry => {
		const person = PEOPLE[entry.personId];
		if (!person) return [];
		return [
			{
				person,
				role: preview.roles[entry.personId] ?? entry.role,
				collectsAs: entry.collectsAs,
				you: entry.personId === VIEWER_ID
			}
		];
	});

	const fixtureInvites: PendingInvite[] = INVITATIONS.filter(
		invite => invite.scope === "project" && invite.projectSlug === project && invite.state === "waiting"
	).flatMap(invite =>
		isProjectRole(invite.role)
			? [{ email: invite.email, role: invite.role, sentLabel: invite.sentLabel, fromPreview: false }]
			: []
	);
	const invitations = [...fixtureInvites, ...preview.added.map(invite => ({ ...invite, fromPreview: true }))]
		.filter(invite => !preview.revoked.includes(invite.email))
		.map(invite => ({ ...invite, sentLabel: preview.resent[invite.email] ?? invite.sentLabel }));

	const fixtureCode = JOIN_CODE.projectSlug === project ? JOIN_CODE.code : null;
	const codeState = preview.code ?? (fixtureCode ? { value: fixtureCode, dismissed: false } : null);

	const update = useCallback(
		(change: (current: TeamPreview) => TeamPreview) => {
			teamStore.set(current => ({ ...current, [project]: change(current[project] ?? EMPTY) }));
		},
		[project]
	);

	return {
		members,
		invitations,
		code: codeState && !codeState.dismissed ? codeState.value : null,
		codeDismissed: codeState?.dismissed ?? false,
		update
	};
}

/** What each project role allows (project-04, "What the roles allow"). */
export const ROLE_PERMISSIONS: Record<ProjectRole, string> = {
	manager: "Manage forms, maps, team and publication",
	observer: "Collect observations in the native app",
	viewer: "Read data and reports; export the permitted scope"
};

export const ROLE_ORDER: readonly ProjectRole[] = ROLES;

/* Join codes avoid letters and digits that read alike (O and 0, I and 1). */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A new 8-character join code, made in this browser. It is not registered anywhere. */
export function newJoinCode(): string {
	const values = new Uint32Array(8);
	crypto.getRandomValues(values);
	return Array.from(values, value => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
}
