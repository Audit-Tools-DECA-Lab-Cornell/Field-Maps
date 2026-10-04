import fallCreek from "../../../contracts/fixtures/sites/fall-creek.json";
import practiceGarden from "../../../contracts/fixtures/sites/practice-garden.json";
import riverside from "../../../contracts/fixtures/sites/riverside.json";
import { parseSite, type ProjectedSite, projectSite, type SiteCollection } from "./plan";

/**
 * The fixture sites in `contracts/fixtures/sites`, read and projected once. Kept apart from `plan.ts` so the
 * geometry helpers a client component needs do not carry every fixture into its bundle: pages load a site
 * here, on the server, and hand the projected plan to the map as a prop.
 */

export type SiteName = "riverside" | "fall-creek" | "practice-garden";

export const SITE_NAMES: readonly SiteName[] = ["riverside", "fall-creek", "practice-garden"];

const SOURCES: Record<SiteName, unknown> = {
	riverside,
	"fall-creek": fallCreek,
	"practice-garden": practiceGarden
};

const collections = new Map<SiteName, SiteCollection>();
const projections = new Map<SiteName, ProjectedSite>();

/** A fixture site as GeoJSON, checked against the site schema. */
export function loadSite(name: SiteName): SiteCollection {
	let collection = collections.get(name);
	if (!collection) {
		collection = parseSite(SOURCES[name]);
		collections.set(name, collection);
	}
	return collection;
}

/** A fixture site projected onto its plan, ready for `SitePlan` and `MapFrame`. */
export function loadProjectedSite(name: SiteName): ProjectedSite {
	let projected = projections.get(name);
	if (!projected) {
		projected = projectSite(loadSite(name));
		projections.set(name, projected);
	}
	return projected;
}
