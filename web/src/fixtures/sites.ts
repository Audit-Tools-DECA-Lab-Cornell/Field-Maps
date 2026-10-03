import type { DeviceReport, MapPackage, Site, Zone } from "./types";

export const SITES: Site[] = [
	{
		slug: "riverside",
		projectSlug: "play-study",
		name: "Riverside",
		summary: "3 zones · North meadow, Woodland edge, Sand area",
		geometry: "riverside",
		zoneSlugs: ["north-meadow", "woodland-edge", "sand-area"],
		training: false
	},
	{
		slug: "fall-creek",
		projectSlug: "play-study",
		name: "Fall Creek",
		summary: "Whole playground · 1 zone",
		geometry: "fall-creek",
		zoneSlugs: ["whole-playground"],
		training: false,
		coverageNote: "no device has downloaded it"
	},
	{
		slug: "practice-garden",
		projectSlug: "play-study",
		name: "Practice garden",
		summary: "Training geometry · excluded from analysis",
		geometry: "practice-garden",
		zoneSlugs: [],
		training: true,
		coverageNote: "never counted toward coverage"
	}
];

export const ZONES: Zone[] = [
	{
		id: "zone-a",
		slug: "north-meadow",
		code: "A",
		name: "North meadow",
		siteSlug: "riverside",
		description: "Open meadow used for exploratory and physical play."
	},
	{
		id: "zone-b",
		slug: "woodland-edge",
		code: "B",
		name: "Woodland edge",
		siteSlug: "riverside",
		description: "Log lines and mulch under the tree edge, used for balancing and hiding games."
	},
	{
		id: "zone-c",
		slug: "sand-area",
		code: "C",
		name: "Sand area",
		siteSlug: "riverside",
		description: "Sand pit around the play structure, used for digging and building."
	},
	{
		id: "zone-a",
		slug: "whole-playground",
		code: "A",
		name: "Whole playground",
		siteSlug: "fall-creek",
		description: "The whole Fall Creek playground, one zone for the first visit."
	}
];

const RIVERSIDE_V4_CHECKS: MapPackage["checks"] = [
	{ label: "Map geometry", detail: "Valid, no self-intersections", state: "passes" },
	{ label: "Zone boundaries", detail: "3 zones · North meadow changed since v3", state: "passes" },
	{ label: "Form compatibility", detail: "demo-v1 can run on this map", state: "passes" },
	{ label: "Offline assets", detail: "Everything a device needs is inside the package", state: "passes" }
];

export const MAP_PACKAGES: MapPackage[] = [
	{
		siteSlug: "riverside",
		version: "v4",
		sizeMb: 86,
		uploadedLabel: "Today 11:02",
		uploadedBy: "PS",
		state: "inspecting",
		onDevices: "Not offered yet",
		file: "riverside-v4.zip",
		coordinateSystem: "EPSG:4326",
		layers: "Site boundary, zones, equipment, ground",
		extent: "Matches the site",
		checks: RIVERSIDE_V4_CHECKS
	},
	{
		siteSlug: "riverside",
		version: "v3",
		sizeMb: 84,
		uploadedLabel: "Yesterday",
		uploadedBy: "JL",
		state: "active",
		onDevices: "2 of 3 observers report it",
		formAssignment: "demo-v1",
		importedFrom: "QGIS project export"
	},
	{
		siteSlug: "riverside",
		version: "v2",
		sizeMb: 82,
		uploadedLabel: "Sep 24",
		uploadedBy: "JL",
		state: "archived",
		onDevices: "Kept for old records"
	},
	{
		siteSlug: "riverside",
		version: "v1",
		sizeMb: 64,
		uploadedLabel: "Sep 12",
		uploadedBy: "JL",
		state: "archived",
		onDevices: "Kept for old records"
	},
	{
		siteSlug: "fall-creek",
		version: "v1",
		sizeMb: 126,
		uploadedLabel: "Sep 28",
		uploadedBy: "PS",
		state: "active",
		onDevices: "None yet",
		formAssignment: "demo-v1",
		importedFrom: "QGIS project export"
	},
	{
		siteSlug: "practice-garden",
		version: "bundled",
		sizeMb: null,
		uploadedLabel: "Ships with the app",
		uploadedBy: null,
		state: "bundled",
		onDevices: "Ships with the app"
	}
];

/** What each observer's device last reported. An offline device cannot report its current state. */
export const DEVICE_REPORTS: DeviceReport[] = [
	{
		personId: "pratyush",
		siteSlug: "riverside",
		mapPackage: { state: "downloaded", label: "v3 downloaded" },
		form: { state: "formAvailable", label: "Form available" },
		lastChecked: "Today 11:25 · cached report"
	},
	{
		personId: "alex",
		siteSlug: "riverside",
		mapPackage: { state: "unknown", label: "Unknown" },
		form: { state: "unknown", label: "Unknown" },
		lastChecked: "Yesterday · may be stale"
	},
	{
		personId: "janet",
		siteSlug: "riverside",
		mapPackage: { state: "downloaded", label: "v3 downloaded" },
		form: { state: "formAvailable", label: "Form available" },
		lastChecked: "Today 10:40 · cached report"
	}
];

export function activePackage(siteSlug: string): MapPackage | undefined {
	return MAP_PACKAGES.find(pkg => pkg.siteSlug === siteSlug && (pkg.state === "active" || pkg.state === "bundled"));
}

export function packagesFor(siteSlug: string): MapPackage[] {
	return MAP_PACKAGES.filter(pkg => pkg.siteSlug === siteSlug);
}

export function zonesFor(siteSlug: string): Zone[] {
	return ZONES.filter(zone => zone.siteSlug === siteSlug);
}
