"use client";

import { useSessionStore } from "@/features/shell/useSessionStore";
import { createSessionStore } from "@/lib/preview";

/**
 * Map package changes made in this preview: a version activated on the Inspect step, and a package draft
 * saved from the zone editor (proposal U2). They live in this tab's sessionStorage, show on the site, the
 * package history and the zone editor, and reset when the tab closes. Nothing here reaches the API; the real
 * upload on the Upload step is the only call this area makes.
 */

/** A zone's outer ring in plan units, as the zone editor leaves it. */
export type ZoneRing = [x: number, y: number][];

export type PackageDraft = {
	/** The draft's version, "v4". */
	version: string;
	/** The version it was drawn from, "v3". */
	base: string;
	/** Edited boundaries by zone id ("zone-a"). Zones left out keep the base geometry. */
	zones: Record<string, ZoneRing>;
};

export type SitePackagePreview = {
	/** A version activated in this preview, "v4". */
	activated?: string;
	/** Boundaries the activated version carries from the zone editor, by zone id. */
	activatedZones?: Record<string, ZoneRing>;
	draft?: PackageDraft;
};

export type PackagesPreview = Record<string, SitePackagePreview>;

function isRing(value: unknown): value is ZoneRing {
	return (
		Array.isArray(value) &&
		value.length >= 3 &&
		value.every(
			point =>
				Array.isArray(point) &&
				point.length === 2 &&
				point.every(coordinate => typeof coordinate === "number" && Number.isFinite(coordinate))
		)
	);
}

function parseRings(raw: unknown): Record<string, ZoneRing> {
	const zones: Record<string, ZoneRing> = {};
	if (raw && typeof raw === "object") {
		for (const [id, ring] of Object.entries(raw as Record<string, unknown>)) {
			if (isRing(ring)) zones[id] = ring;
		}
	}
	return zones;
}

function parseDraft(raw: unknown): PackageDraft | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const value = raw as Record<string, unknown>;
	if (typeof value.version !== "string" || typeof value.base !== "string") return undefined;
	return { version: value.version, base: value.base, zones: parseRings(value.zones) };
}

function parse(raw: unknown): PackagesPreview {
	if (!raw || typeof raw !== "object") return {};
	const result: PackagesPreview = {};
	for (const [site, entry] of Object.entries(raw as Record<string, unknown>)) {
		if (!entry || typeof entry !== "object") continue;
		const value = entry as Record<string, unknown>;
		const draft = parseDraft(value.draft);
		const activatedZones = parseRings(value.activatedZones);
		result[site] = {
			...(typeof value.activated === "string" ? { activated: value.activated } : {}),
			...(Object.keys(activatedZones).length > 0 ? { activatedZones } : {}),
			...(draft ? { draft } : {})
		};
	}
	return result;
}

export const packagesStore = createSessionStore<PackagesPreview>("fm.preview.packages", {}, parse);

/** This preview's package changes for one site. */
export function useSitePackagePreview(siteSlug: string): SitePackagePreview {
	return useSessionStore(packagesStore)[siteSlug] ?? NONE;
}

const NONE: SitePackagePreview = {};

/** Changes one site's entry, leaving the others alone. */
export function updateSitePackages(siteSlug: string, change: (current: SitePackagePreview) => SitePackagePreview) {
	packagesStore.set(current => ({ ...current, [siteSlug]: change(current[siteSlug] ?? {}) }));
}
