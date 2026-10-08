import type { IconName } from "@/components/contour/Icon";
import { DEFAULT_ORG, getOrg, getProject, ORG_MEMBERSHIPS, VIEWER_ID } from "@/fixtures";
import type { PreviewAction, PreviewRole } from "@/lib/preview";

/**
 * Where the workspace's pages are (D21) and what the shell calls them. Plain data, readable from server
 * and client components alike.
 */

export type Section = {
	/** The URL segment under the project or organization; "" is the root page. */
	segment: string;
	/** The tab label. */
	label: string;
	/** The page's name in words, for the error page's "Page" fact and the palette. */
	pageName: string;
	icon: IconName;
	/** The `g` chord's second key. */
	go: string;
	/** Hidden from roles that cannot do this (a Viewer has no Team or Settings tab). */
	requires?: PreviewAction;
};

export const PROJECT_SECTIONS: Section[] = [
	{ segment: "", label: "Overview", pageName: "Overview", icon: "layout-grid", go: "o" },
	{ segment: "data", label: "Data", pageName: "Observation data", icon: "table", go: "d" },
	{ segment: "sites", label: "Sites", pageName: "Sites", icon: "map", go: "s" },
	{ segment: "forms", label: "Forms", pageName: "Forms", icon: "file-text", go: "f" },
	{ segment: "team", label: "Team", pageName: "Project team", icon: "users", go: "t", requires: "viewTeam" },
	{ segment: "qgis", label: "QGIS", pageName: "QGIS", icon: "layers", go: "q" },
	{ segment: "reports", label: "Reports", pageName: "Reports", icon: "printer", go: "r" },
	{
		segment: "settings",
		label: "Settings",
		pageName: "Project settings",
		icon: "settings",
		go: ",",
		requires: "viewProjectSettings"
	}
];

export const ORG_SECTIONS: Section[] = [
	{ segment: "", label: "Projects", pageName: "Your projects", icon: "folder", go: "p" },
	{ segment: "members", label: "Members", pageName: "Organization members", icon: "users", go: "m" },
	{ segment: "library", label: "Form library", pageName: "Form library", icon: "book-open", go: "l" },
	{
		segment: "settings",
		label: "Settings",
		pageName: "Organization settings",
		icon: "settings",
		go: ",",
		requires: "viewOrgSettings"
	}
];

export function orgHref(org: string, segment = ""): string {
	return segment ? `/o/${org}/${segment}` : `/o/${org}`;
}

export function projectHref(org: string, project: string, segment = ""): string {
	return segment ? `/o/${org}/p/${project}/${segment}` : `/o/${org}/p/${project}`;
}

export type ScopeKind = "project" | "org" | "collect" | "account" | "other";

export type Scope = {
	kind: ScopeKind;
	/** The organization on screen, or the default one outside /o (the account page). */
	org: string;
	/** The project on screen, when it exists in the fixtures. */
	project?: string;
	/** The first URL segment under the project or organization: "data", "members", "" for the root. */
	section: string;
};

/** Reads the page's place in the workspace from its path. */
export function scopeOf(pathname: string): Scope {
	const parts = pathname.split("/").filter(Boolean);
	if (parts[0] === "account") return { kind: "account", org: DEFAULT_ORG, section: "" };
	if (parts[0] !== "o" || !parts[1]) return { kind: "other", org: DEFAULT_ORG, section: "" };
	const org = getOrg(parts[1]) ? parts[1] : DEFAULT_ORG;
	if (parts[2] === "p" && parts[3]) {
		const project = getProject(org, parts[3]) ? parts[3] : undefined;
		return { kind: "project", org, project, section: parts[4] ?? "" };
	}
	if (parts[2] === "collect") return { kind: "collect", org, section: "collect" };
	return { kind: "org", org, section: parts[2] ?? "" };
}

/**
 * Whether the page reads sample data, and so carries the Preview data marker and footer line (D20). The
 * account page shows the reader's real profile and memberships from the API, so it carries neither (D24).
 */
export function showsSampleData(scope: Scope): boolean {
	return scope.kind !== "account";
}

/** The reader's own role on the page, before any "View as" preview: the fixture viewer's role. */
export function defaultRoleFor(scope: Scope): PreviewRole {
	if (scope.kind === "collect") return "observer";
	// An admin acts as a manager on every project in the organization (PRODUCT.md § Roles).
	if (scope.kind === "project") return "manager";
	const membership = ORG_MEMBERSHIPS.find(entry => entry.personId === VIEWER_ID && entry.orgSlug === scope.org);
	return membership?.role === "owner" ? "owner" : "admin";
}

/** The page's name in words, from its path: "Observation data", "Organization members". */
export function pageNameOf(pathname: string): string {
	const scope = scopeOf(pathname);
	if (scope.kind === "account") return "Account";
	if (scope.kind === "collect") return "Collect on your phone";
	if (scope.kind === "project") {
		return PROJECT_SECTIONS.find(section => section.segment === scope.section)?.pageName ?? "Project page";
	}
	if (scope.kind === "org") {
		return ORG_SECTIONS.find(section => section.segment === scope.section)?.pageName ?? "Organization page";
	}
	return "Workspace page";
}
