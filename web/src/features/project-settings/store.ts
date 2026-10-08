"use client";

import { useCallback } from "react";

import { useSessionStore } from "@/features/shell/useSessionStore";
import { getProject, type Project, PROJECTS } from "@/fixtures";
import { createSessionStore } from "@/lib/preview";

/**
 * Project settings saved in this preview (project-19), the archive switch, and the rounds added to the
 * U6 schedule preview (project-18). They live in this tab's sessionStorage and reset when it closes.
 * Nothing here is sent anywhere.
 */

export type PublicationScope = Project["publicationScope"];

export type ProjectSettings = {
	name: string;
	code: string;
	timezone: string;
	roundsPerZone: number;
	observationsPerRound: number;
	publicationScope: PublicationScope;
	/** "yesterday by JL", or "just now by PS" after a save here. */
	lastSaved: { by: string; label: string };
	archived: boolean;
	/** Planned rounds added to the schedule preview (proposal U6), after the fixture's. */
	plannedRounds: number;
};

type SettingsStore = Record<string, Partial<ProjectSettings>>;

function fromFixture(project: Project): ProjectSettings {
	return {
		name: project.name,
		code: project.code,
		timezone: project.timezone,
		roundsPerZone: project.target.roundsPerZone,
		observationsPerRound: project.target.observationsPerRound,
		publicationScope: project.publicationScope,
		lastSaved: project.lastSaved,
		archived: project.state === "archived",
		plannedRounds: 0
	};
}

function parseOne(raw: unknown): Partial<ProjectSettings> {
	if (!raw || typeof raw !== "object") return {};
	const value = raw as Record<string, unknown>;
	const result: Partial<ProjectSettings> = {};
	if (typeof value.name === "string") result.name = value.name;
	if (typeof value.code === "string") result.code = value.code;
	if (typeof value.timezone === "string") result.timezone = value.timezone;
	if (Number.isInteger(value.roundsPerZone)) result.roundsPerZone = value.roundsPerZone as number;
	if (Number.isInteger(value.observationsPerRound))
		result.observationsPerRound = value.observationsPerRound as number;
	if (value.publicationScope === "accepted" || value.publicationScope === "approved")
		result.publicationScope = value.publicationScope;
	const saved = value.lastSaved as Record<string, unknown> | undefined;
	if (saved && typeof saved.by === "string" && typeof saved.label === "string")
		result.lastSaved = { by: saved.by, label: saved.label };
	if (typeof value.archived === "boolean") result.archived = value.archived;
	if (Number.isInteger(value.plannedRounds)) result.plannedRounds = value.plannedRounds as number;
	return result;
}

function parse(raw: unknown): SettingsStore {
	if (!raw || typeof raw !== "object") return {};
	return Object.fromEntries(
		Object.entries(raw as Record<string, unknown>)
			.filter(([slug]) => PROJECTS.some(project => project.slug === slug))
			.map(([slug, value]) => [slug, parseOne(value)])
	);
}

export const settingsStore = createSessionStore<SettingsStore>("fm.preview.projectSettings", {}, parse);

export type ProjectSettingsApi = {
	settings: ProjectSettings;
	/** Merges a change into this project's saved settings. */
	update: (change: Partial<ProjectSettings>) => void;
};

/** A project's settings as this preview has them: the fixture, with what was saved here laid over it. */
export function useProjectSettings(org: string, project: string): ProjectSettingsApi {
	const store = useSessionStore(settingsStore);
	const fixture = getProject(org, project);
	const base = fixture ? fromFixture(fixture) : null;
	const settings: ProjectSettings = {
		...(base ?? {
			name: project,
			code: "",
			timezone: "America/New_York",
			roundsPerZone: 3,
			observationsPerRound: 2,
			publicationScope: "accepted",
			lastSaved: { by: "", label: "" },
			archived: false,
			plannedRounds: 0
		}),
		...store[project]
	};
	const update = useCallback(
		(change: Partial<ProjectSettings>) => {
			settingsStore.set(current => ({ ...current, [project]: { ...current[project], ...change } }));
		},
		[project]
	);
	return { settings, update };
}

export const SCOPE_LABEL: Record<PublicationScope, string> = {
	accepted: "Every accepted observation",
	approved: "Approved only (proposal U5)"
};
