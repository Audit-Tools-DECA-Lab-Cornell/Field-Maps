/**
 * The preview world: everything the rebuilt screens show until they are wired to the API. Import from
 * here, not from the individual files. Nothing in this folder is read from or written to a database.
 */
export * from "./activity";
export * from "./derive";
export * from "./forms";
export * from "./observations";
export * from "./org";
export * from "./people";
export * from "./qgis";
export * from "./reports";
export * from "./sites";
export * from "./time";
export type * from "./types";

import { ORGANIZATIONS, PROJECTS } from "./org";
import { SITES, ZONES } from "./sites";

export function getOrg(slug: string) {
	return ORGANIZATIONS.find(org => org.slug === slug);
}

export function getProject(orgSlug: string, slug: string) {
	return PROJECTS.find(project => project.orgSlug === orgSlug && project.slug === slug);
}

export function projectsIn(orgSlug: string) {
	return PROJECTS.filter(project => project.orgSlug === orgSlug);
}

export function getSite(projectSlug: string, slug: string) {
	return SITES.find(site => site.projectSlug === projectSlug && site.slug === slug);
}

export function sitesIn(projectSlug: string) {
	return SITES.filter(site => site.projectSlug === projectSlug);
}

export function getZone(siteSlug: string, slug: string) {
	return ZONES.find(zone => zone.siteSlug === siteSlug && zone.slug === slug);
}
