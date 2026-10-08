"use client";

import { useSessionStore } from "@/features/shell/useSessionStore";
import { createSessionStore } from "@/lib/preview";

/**
 * Site changes made in this preview: sites created with "Create site" and zone descriptions edited on a
 * zone page. They live in this tab's sessionStorage, show wherever the site or zone appears, and reset
 * when the tab closes. Nothing here is sent anywhere.
 */

export type CreatedSite = { slug: string; projectSlug: string; name: string };

export type SitesPreview = {
	created: CreatedSite[];
	/** Zone descriptions by "site/zone" slug pair. */
	descriptions: Record<string, string>;
};

const INITIAL: SitesPreview = { created: [], descriptions: {} };

function parse(raw: unknown): SitesPreview {
	if (!raw || typeof raw !== "object") return INITIAL;
	const value = raw as Record<string, unknown>;
	const created = Array.isArray(value.created)
		? value.created.flatMap((entry): CreatedSite[] => {
				if (!entry || typeof entry !== "object") return [];
				const site = entry as Record<string, unknown>;
				return typeof site.slug === "string" &&
					typeof site.name === "string" &&
					typeof site.projectSlug === "string"
					? [{ slug: site.slug, name: site.name, projectSlug: site.projectSlug }]
					: [];
			})
		: [];
	const descriptions: Record<string, string> = {};
	if (value.descriptions && typeof value.descriptions === "object") {
		for (const [key, text] of Object.entries(value.descriptions as Record<string, unknown>)) {
			if (typeof text === "string") descriptions[key] = text;
		}
	}
	return { created, descriptions };
}

export const sitesStore = createSessionStore<SitesPreview>("fm.preview.sites", INITIAL, parse);

export function useSitesPreview(): SitesPreview {
	return useSessionStore(sitesStore);
}

export function descriptionKey(siteSlug: string, zoneSlug: string): string {
	return `${siteSlug}/${zoneSlug}`;
}

/** "Willow Park" → "willow-park". */
export function slugify(name: string): string {
	return name
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}
