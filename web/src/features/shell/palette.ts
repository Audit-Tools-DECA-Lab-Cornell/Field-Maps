import type { IconName } from "@/components/contour/Icon";
import {
	FORM_VERSIONS,
	OBSERVATIONS,
	ORG_MEMBERSHIPS,
	PEOPLE,
	PROJECT_FORMS,
	PROJECT_MEMBERSHIPS,
	projectsIn,
	sitesIn,
	ZONES
} from "@/fixtures";
import { stateOf } from "@/lib/contour";
import type { PreviewAction } from "@/lib/preview";

import { ORG_SECTIONS, orgHref, PROJECT_SECTIONS, projectHref } from "./navigation";

/** One row in the ⌘K palette: a place to go, or an action. */
export type PaletteEntry = {
	id: string;
	label: string;
	/** Set the label in mono: OBS-0244, demo-v1. */
	labelMono?: boolean;
	/** Secondary words after the label: "Woodland edge · Round 3". */
	meta?: string;
	metaMono?: boolean;
	icon: IconName;
	href?: string;
	/** Words that find the row besides its label. */
	keywords?: string[];
	/** Keys that do the same from the page, shown on the right: ["g", "d"]. */
	shortcut?: string[];
};

export type PaletteGroup = { heading: string; entries: PaletteEntry[] };

/** An observation ID as people type it: "obs-0244", "OBS0244", "obs 24". */
export const OBSERVATION_QUERY = /obs[-\s]?\d+/i;

const RECENT_KEY = "fm.palette.recent";
const RECENT_LIMIT = 5;

export type RecentEntry = Pick<PaletteEntry, "label" | "labelMono" | "meta" | "metaMono" | "icon" | "href">;

/** The last five places opened from the palette, newest first, kept in this browser. */
export function readRecent(): RecentEntry[] {
	try {
		const raw = localStorage.getItem(RECENT_KEY);
		const list = raw ? (JSON.parse(raw) as unknown) : [];
		if (!Array.isArray(list)) return [];
		return list
			.filter(
				(entry): entry is RecentEntry =>
					Boolean(entry) && typeof entry.label === "string" && typeof entry.href === "string"
			)
			.slice(0, RECENT_LIMIT);
	} catch {
		return [];
	}
}

export function rememberRecent(entry: PaletteEntry) {
	if (!entry.href) return;
	const recent: RecentEntry = {
		label: entry.label,
		labelMono: entry.labelMono,
		meta: entry.meta,
		metaMono: entry.metaMono,
		icon: entry.icon,
		href: entry.href
	};
	const next = [recent, ...readRecent().filter(item => item.href !== entry.href)].slice(0, RECENT_LIMIT);
	try {
		localStorage.setItem(RECENT_KEY, JSON.stringify(next));
	} catch {
		// Storage refused: the palette simply has no recent list.
	}
}

type Context = {
	org: string;
	orgName: string;
	/** The project on screen, if any. */
	project?: string;
	/** The project whose sites, forms and observations are searched: the one on screen, or the first. */
	searchProject: string;
	can: (action: PreviewAction) => boolean;
	/** Organization actions go by the organization role (an admin is a manager on a project page). */
	canOrg: (action: PreviewAction) => boolean;
};

/** The places the palette jumps to (DESIGN §8): tabs, projects, sites, zones, form versions, people, OBS- IDs. */
export function placeGroups(context: Context, query: string): PaletteGroup[] {
	const { org, orgName, project, searchProject, can, canOrg } = context;
	const visible = <T extends { requires?: PreviewAction }>(list: T[], check = can) =>
		list.filter(item => !item.requires || check(item.requires));
	const projects = projectsIn(org);
	const searchName = projects.find(entry => entry.slug === searchProject)?.name ?? searchProject;
	const groups: PaletteGroup[] = [];

	const goTo: PaletteEntry[] = [];
	if (project) {
		const name = projects.find(entry => entry.slug === project)?.name ?? project;
		for (const section of visible(PROJECT_SECTIONS))
			goTo.push({
				id: `go-project-${section.segment || "overview"}`,
				label: section.label,
				meta: name,
				icon: section.icon,
				href: projectHref(org, project, section.segment),
				keywords: [section.pageName],
				shortcut: ["g", section.go]
			});
	}
	for (const section of visible(ORG_SECTIONS, canOrg))
		goTo.push({
			id: `go-org-${section.segment || "projects"}`,
			label: section.segment ? section.pageName : "All projects",
			meta: orgName,
			icon: section.icon,
			href: orgHref(org, section.segment),
			keywords: [section.label],
			shortcut: project ? undefined : ["g", section.go]
		});
	goTo.push({ id: "go-account", label: "Account", icon: "user", href: "/account", keywords: ["profile"] });
	groups.push({ heading: "Go to", entries: goTo });

	groups.push({
		heading: "Projects",
		entries: projects.map(entry => ({
			id: `project-${entry.slug}`,
			label: entry.name,
			meta: stateOf("project", entry.state).label,
			icon: "folder",
			href: projectHref(org, entry.slug),
			keywords: [entry.code]
		}))
	});

	if (OBSERVATION_QUERY.test(query)) {
		const digits = query.replace(/\D/g, "");
		const zoneName = (slug: string) => ZONES.find(zone => zone.slug === slug)?.name ?? slug;
		groups.push({
			heading: "Observations",
			entries: OBSERVATIONS.filter(
				obs => obs.projectSlug === searchProject && obs.id.replace(/\D/g, "").includes(digits)
			).map(obs => ({
				id: `obs-${obs.id}`,
				label: obs.id,
				labelMono: true,
				meta: `${zoneName(obs.zoneSlug)} · Round ${obs.round}`,
				icon: "map-pin",
				href: projectHref(org, searchProject, `data/${obs.id}`),
				keywords: [obs.id.replace("-", ""), obs.id.replace("-", " ")]
			}))
		});
	}

	const sites = sitesIn(searchProject);
	groups.push({
		heading: "Sites",
		entries: sites.map(site => ({
			id: `site-${site.slug}`,
			label: site.name,
			meta: `Site · ${searchName}`,
			icon: "map",
			href: projectHref(org, searchProject, `sites/${site.slug}`)
		}))
	});
	groups.push({
		heading: "Zones",
		entries: ZONES.filter(zone => sites.some(site => site.slug === zone.siteSlug)).map(zone => ({
			id: `zone-${zone.siteSlug}-${zone.slug}`,
			label: zone.name,
			meta: `Zone ${zone.code} · ${sites.find(site => site.slug === zone.siteSlug)?.name ?? zone.siteSlug}`,
			icon: "map-pinned",
			href: projectHref(org, searchProject, `sites/${zone.siteSlug}/zones/${zone.slug}`)
		}))
	});

	const forms = PROJECT_FORMS.filter(form => form.projectSlug === searchProject);
	groups.push({
		heading: "Forms",
		entries: FORM_VERSIONS.filter(version => forms.some(form => form.slug === version.formSlug)).map(version => ({
			id: `form-${version.id}`,
			label: version.id,
			labelMono: true,
			meta: `${stateOf("form", version.state).label} · ${forms.find(form => form.slug === version.formSlug)?.title ?? ""}`,
			icon: "file-text",
			href: projectHref(org, searchProject, `forms/versions/${version.id}`)
		}))
	});

	const peopleHref = can("viewTeam") ? projectHref(org, searchProject, "team") : orgHref(org, "members");
	groups.push({
		heading: "People",
		entries: Object.values(PEOPLE).map(person => {
			const projectRole = PROJECT_MEMBERSHIPS.find(
				entry => entry.personId === person.id && entry.projectSlug === searchProject
			)?.role;
			const orgRole = ORG_MEMBERSHIPS.find(entry => entry.personId === person.id && entry.orgSlug === org)?.role;
			const role = projectRole ?? orgRole;
			return {
				id: `person-${person.id}`,
				label: person.name,
				meta: role ? `${person.initials} · ${stateOf("role", role).label}` : person.initials,
				icon: "user" as const,
				href: peopleHref,
				keywords: [person.initials, person.email]
			};
		})
	});

	return groups.filter(group => group.entries.length > 0);
}
