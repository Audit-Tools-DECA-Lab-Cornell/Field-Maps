import type { Project } from "@/lib/api/types";
import { plural } from "@/lib/labels";

/** Sites are read for this many projects at once; the rest are listed without counts. */
export const SITE_READ_LIMIT = 12;

/** What a row can say about a project's size. A failed or skipped read is never shown as zero. */
export type ProjectCounts =
	| { state: "counted"; sites: number; observations: number }
	| { state: "failed" }
	| { state: "skipped" };

/** One project on the organization's page: plain values the server hands to the page. */
export type ProjectRow = {
	id: string;
	code: string;
	name: string;
	description: string | null;
	role: Project["role"];
	status: Project["status"];
	counts: ProjectCounts;
};

type ProjectLike = Pick<Project, "project_id" | "code" | "name" | "description" | "role" | "status" | "is_training">;

/**
 * The projects to list: practice projects are left out (every account has one, and it is not part of a
 * study), active ones come before archived ones, and each group reads in name order.
 */
export function listedProjects<T extends ProjectLike>(projects: readonly T[]): T[] {
	return projects
		.filter(project => !project.is_training)
		.sort((a, b) => {
			if (a.status !== b.status) return a.status === "active" ? -1 : 1;
			return a.name.localeCompare(b.name, "en") || a.code.localeCompare(b.code, "en");
		});
}

/** A project's size from its sites: how many, and the sum of their exact observation counts. */
export function countsFromSites(sites: readonly { observation_count: number }[]): ProjectCounts {
	return {
		state: "counted",
		sites: sites.length,
		observations: sites.reduce((total, site) => total + site.observation_count, 0)
	};
}

/** "1 site · 26 observations". A project whose sites could not be read says so rather than showing zero. */
export function countsLine(counts: ProjectCounts): string {
	switch (counts.state) {
		case "counted":
			return `${plural(counts.sites, "site")} · ${plural(counts.observations, "observation")}`;
		case "failed":
			return "Sites and observations could not be counted.";
		case "skipped":
			return "Open the project to see its sites and observations.";
	}
}

/** Where a project's row leads: observers collect in the app, so the web sends them to the collect page. */
export function projectLink(orgSlug: string, row: Pick<ProjectRow, "code" | "role">): string {
	return row.role === "observer" ? `/o/${orgSlug}/collect` : `/o/${orgSlug}/p/${row.code}`;
}
