import type { IconName } from "@/components/contour/Icon";
import { stateOf } from "@/lib/contour";
import { projectPath } from "@/lib/workspace/home";
import type { OrgRef, ProjectRef, WorkspaceIndex } from "@/lib/workspace/types";

import { ORG_SECTIONS, orgHref, PROJECT_SECTIONS, projectHref, visibleSections } from "./navigation";

/** One row in the ⌘K palette: a place to go, or an action. */
export type PaletteEntry = {
	id: string;
	label: string;
	/** Set the label in mono: a code such as play-study. */
	labelMono?: boolean;
	/** Secondary words after the label: "DECA Lab · Manager". */
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

export type PaletteContext = {
	index: WorkspaceIndex;
	/** The organization on screen, when the person belongs to it. */
	org: OrgRef | null;
	/** The project on screen, when the person belongs to it. */
	project: ProjectRef | null;
	/** Whether the person manages the organization on screen (owner or admin). */
	managesOrg: boolean;
	/** Whether the person manages the project on screen (manager). */
	managesProject: boolean;
};

/**
 * The places the palette jumps to (DESIGN §8): the tabs of the project and organization on screen, every
 * project and organization the person belongs to, and their account. Only places they can open are listed.
 */
export function placeGroups(context: PaletteContext): PaletteGroup[] {
	const { index, org, project, managesOrg, managesProject } = context;
	const groups: PaletteGroup[] = [];

	const goTo: PaletteEntry[] = [];
	if (org && project && project.role !== "observer") {
		for (const section of visibleSections(PROJECT_SECTIONS, managesProject))
			goTo.push({
				id: `go-project-${section.segment || "overview"}`,
				label: section.label,
				meta: project.name,
				icon: section.icon,
				href: projectHref(org.slug, project.code, section.segment),
				keywords: [section.pageName],
				shortcut: ["g", section.go]
			});
	}
	if (org) {
		for (const section of visibleSections(ORG_SECTIONS, managesOrg))
			goTo.push({
				id: `go-org-${section.segment || "projects"}`,
				label: section.segment ? section.pageName : "All projects",
				meta: org.name,
				icon: section.icon,
				href: orgHref(org.slug, section.segment),
				keywords: [section.label],
				shortcut: project ? undefined : ["g", section.go]
			});
	}
	goTo.push({ id: "go-account", label: "Account", icon: "user", href: "/account", keywords: ["profile", "name"] });
	groups.push({ heading: "Go to", entries: goTo });

	const orgName = new Map(index.orgs.map(entry => [entry.id, entry.name]));
	groups.push({
		heading: "Projects",
		entries: index.projects.map(entry => ({
			id: `project-${entry.id}`,
			label: entry.name,
			meta: [orgName.get(entry.orgId), stateOf("role", entry.role).label].filter(Boolean).join(" · "),
			icon: "folder",
			href: projectPath(entry),
			keywords: [entry.code]
		}))
	});

	groups.push({
		heading: "Organizations",
		entries: index.orgs.map(entry => ({
			id: `org-${entry.id}`,
			label: entry.name,
			meta: stateOf("role", entry.role).label,
			icon: "building-2",
			href: orgHref(entry.slug),
			keywords: [entry.slug]
		}))
	});

	return groups.filter(group => group.entries.length > 0);
}
