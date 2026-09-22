import { ZONES } from "@/data/site-geometry";
import type { Organization, Project, QgisLayer, Site } from "@/types/domain";

/**
 * The workspace this application opens on. These are fixtures held in the browser: the API has
 * three routes today (`/health`, project list, observation read and write) and this application
 * calls none of them. Every screen says so where it matters rather than implying a live console.
 *
 * Names come from the product's own record — the operator in `src/app/(legal)/policy.ts` and the
 * site the collector already carries — so nothing here is a placeholder company.
 */

export const ORGANIZATION: Organization = {
	id: "org-deca-lab",
	name: "DECA Lab, Cornell University"
};

export const PROJECT: Project = {
	id: "prj-riverside-play-study",
	organizationId: ORGANIZATION.id,
	name: "Riverside Play Study",
	lead: "Janet Loebach",
	leadRole: "Principal investigator",
	summary:
		"Behaviour mapping of children’s play across three zones of the Riverside site, over three rounds a day, by two trained observers."
};

/** The time zone the site keeps. Times render in it on the server and in the browser alike. */
export const SITE_TIME_ZONE = "America/New_York";

export const SITES: readonly Site[] = [
	{
		id: "site-north-playground",
		projectId: PROJECT.id,
		code: "NORTH",
		name: "North Playground",
		state: "collecting",
		detail: "Zones A, B and C · 3 rounds a day · 2 observers assigned",
		rounds: [1, 2, 3],
		observers: ["AK", "BR"],
		zones: ZONES
	},
	{
		id: "site-meadow",
		projectId: PROJECT.id,
		code: "MEADOW",
		name: "Meadow",
		state: "configured",
		detail: "Zones A and B drawn · rounds not scheduled · no observer assigned",
		rounds: [],
		observers: [],
		zones: ZONES.slice(0, 2)
	},
	{
		id: "site-courtyard",
		projectId: PROJECT.id,
		code: "COURT",
		name: "Courtyard",
		state: "blocked",
		detail: "1 zone · base map failed validation · no published instrument",
		rounds: [],
		observers: [],
		zones: ZONES.slice(2)
	}
];

export const ACTIVE_SITE = SITES[0]!;

/** The people who can open this project, and what each of them may do. */
export const PEOPLE: readonly { readonly initials: string; readonly name: string; readonly role: string }[] = [
	{ initials: "JL", name: "Janet Loebach", role: "Principal investigator" },
	{ initials: "AK", name: "Observer AK", role: "Observer · collects on this site" },
	{ initials: "BR", name: "Observer BR", role: "Observer · collects on this site" }
];

export const VIEWER = PEOPLE[0]!;

/**
 * QGIS reads the same database the collector uploads into. There is no export step between them
 * and no “send to QGIS” button — adding the connection once is the whole integration.
 */
export const QGIS_CONNECTION = {
	host: "db.fieldmaps.example.ac.uk",
	port: 5432,
	database: "fieldmaps",
	schema: "gis",
	user: "fieldmaps_qgis_reader",
	sslMode: "require"
} as const;

export const QGIS_LAYERS: readonly QgisLayer[] = [
	{ name: "gis.observations", mode: "read-only", detail: "One point per play event, in EPSG:4326" },
	{
		name: "gis.observation_answers",
		mode: "view",
		detail: "One row per answered variable, joined by observation id"
	},
	{ name: "gis.sites", mode: "read-only", detail: "Site outlines and their codes" },
	{ name: "gis.zones", mode: "read-only", detail: "Zone polygons, the unit an observation records" }
];
