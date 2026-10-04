import {
	coverageSummary,
	observationsFor,
	type Project,
	PROJECT_MEMBERSHIPS,
	projectsIn,
	sitesIn,
	VIEWER_ID
} from "@/fixtures";
import { stateOf } from "@/lib/contour";

/**
 * Site counts for projects whose sites the fixtures do not draw yet (org-01: Schoolyard pilot has one site,
 * Training its practice geometry). Kept here rather than in src/fixtures, which this phase only reads.
 */
const UNDRAWN_SITES: Record<string, number> = { "schoolyard-pilot": 1, training: 1 };

export type ProjectRow = {
	project: Project;
	sites: number;
	/** null: the project is not counted in research datasets (Training). */
	observations: number | null;
	role: string;
	coverage: { kind: "dots"; dots: boolean[]; met: number; total: number } | { kind: "text"; text: string };
};

/** One row per project on the organization's home (org-01), every number derived from the fixtures. */
export function projectRows(org: string): ProjectRow[] {
	return projectsIn(org).map(project => {
		const drawn = sitesIn(project.slug).length;
		const sites = drawn || UNDRAWN_SITES[project.slug] || 0;
		const records = observationsFor(project.slug);
		const membership = PROJECT_MEMBERSHIPS.find(
			entry => entry.personId === VIEWER_ID && entry.projectSlug === project.slug
		);
		// Training is the practice project every account joins (D4, D13).
		const role = membership ? stateOf("role", membership.role).label : "Everyone";

		let coverage: ProjectRow["coverage"];
		if (!project.counted) coverage = { kind: "text", text: "Not counted" };
		else {
			const site = sitesIn(project.slug).find(entry => !entry.training);
			const summary = site ? coverageSummary(project.slug, site.slug) : null;
			coverage =
				summary && records.length > 0
					? { kind: "dots", dots: summary.dots, met: summary.met, total: summary.total }
					: { kind: "text", text: "Not started" };
		}

		return {
			project,
			sites,
			observations: project.counted ? records.length : null,
			role,
			coverage
		};
	});
}
