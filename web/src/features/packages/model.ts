import {
	formatTime,
	type MapPackage,
	type PackageCheck,
	packagesFor,
	PREVIEW_NOW,
	VIEWER,
	type Zone,
	zonesFor
} from "@/fixtures";

import type { PackageDraft, SitePackagePreview, ZoneRing } from "./store";

/**
 * A site's map packages as this preview shows them: the fixture history, with a draft saved from the zone
 * editor and an activation made on the Inspect step laid over it. Pure, so the site page, the package
 * history and the editor read one answer.
 */

/**
 * Zones whose boundary a fixture package changed since the version before it, by zone id. The fixture
 * carries this only as words ("North meadow changed since v3"); the preview map needs to know which zone
 * to hatch, so it is kept here beside the fixtures rather than in them.
 */
const FIXTURE_CHANGES: Record<string, Record<string, string[]>> = {
	riverside: { v4: ["zone-a"] }
};

export type PackageRow = MapPackage & {
	/** Zone ids whose boundary changed against the version before. */
	changedZones: string[];
	/** The version this one was drawn from, for a draft or an inspected upload. */
	base?: string;
	/** Edited rings from the zone editor, by zone id. */
	draftZones?: Record<string, ZoneRing>;
	/** The preview, not the fixture, made this row what it shows. */
	fromPreview?: boolean;
};

export function versionNumber(version: string): number {
	const match = /^v(\d+)$/.exec(version);
	return match ? Number(match[1]) : 0;
}

function changedFixtureZones(siteSlug: string, version: string): string[] {
	return FIXTURE_CHANGES[siteSlug]?.[version] ?? [];
}

/** Every package of a site, newest first, with this preview's changes applied. */
export function packageRows(siteSlug: string, preview: SitePackagePreview): PackageRow[] {
	const fixture = packagesFor(siteSlug);
	const active = fixture.find(pkg => pkg.state === "active");
	let rows: PackageRow[] = fixture.map(pkg => ({
		...pkg,
		changedZones: changedFixtureZones(siteSlug, pkg.version),
		...(pkg.state === "inspecting" && active ? { base: active.version } : {})
	}));

	const { draft, activated } = preview;
	if (draft) rows = withDraft(rows, siteSlug, draft);

	if (activated) {
		const target = rows.find(row => row.version === activated);
		const carried = preview.activatedZones;
		if (target && target.state !== "active") {
			rows = rows.map(row => {
				if (row.version === activated)
					return {
						...row,
						state: "active",
						onDevices: "Waiting for devices",
						fromPreview: true,
						...(carried
							? {
									draftZones: carried,
									changedZones: [...new Set([...row.changedZones, ...Object.keys(carried)])]
								}
							: {})
					};
				// The version it replaces, and an older upload still waiting, are kept for old records.
				if (
					row.state === "active" ||
					(row.state === "inspecting" && versionNumber(row.version) < versionNumber(activated))
				)
					return { ...row, state: "archived", fromPreview: true };
				return row;
			});
		}
	}

	return rows.sort((a, b) => versionNumber(b.version) - versionNumber(a.version));
}

/** The zone editor's draft: it replaces the boundaries of the inspecting version, or becomes a new one. */
function withDraft(rows: PackageRow[], siteSlug: string, draft: PackageDraft): PackageRow[] {
	const changed = Object.keys(draft.zones);
	const existing = rows.find(row => row.version === draft.version);
	if (existing) {
		return rows.map(row =>
			row.version === draft.version
				? {
						...row,
						base: draft.base,
						changedZones: [...new Set([...changedFixtureZones(siteSlug, row.version), ...changed])],
						draftZones: draft.zones,
						checks:
							row.checks && boundaryChecks(row.checks, siteSlug, draft.base, row.changedZones, changed),
						fromPreview: true
					}
				: row
		);
	}
	const base = rows.find(row => row.version === draft.base);
	return [
		{
			siteSlug,
			version: draft.version,
			sizeMb: base?.sizeMb ?? null,
			uploadedLabel: `Today ${formatTime(PREVIEW_NOW)}`,
			uploadedBy: VIEWER.initials,
			state: "inspecting",
			onDevices: "Not offered yet",
			file: `Zone editor draft from ${draft.base}`,
			...(base?.coordinateSystem ? { coordinateSystem: base.coordinateSystem } : {}),
			layers: base?.layers ?? "Site boundary, zones, equipment, ground",
			extent: "Matches the site",
			checks: boundaryChecks(DRAFT_CHECKS, siteSlug, draft.base, [], changed),
			...(base?.formAssignment ? { formAssignment: base.formAssignment } : {}),
			importedFrom: `Zone editor draft from ${draft.base}`,
			changedZones: changed,
			base: draft.base,
			draftZones: draft.zones,
			fromPreview: true
		},
		...rows
	];
}

const DRAFT_CHECKS: PackageCheck[] = [
	{ label: "Map geometry", detail: "Valid, no self-intersections", state: "passes" },
	{ label: "Zone boundaries", detail: "", state: "passes" },
	{ label: "Form compatibility", detail: "demo-v1 can run on this map", state: "passes" },
	{ label: "Offline assets", detail: "Everything a device needs is inside the package", state: "passes" }
];

/** Rewrites the Zone boundaries check so it names the zones that actually changed. */
function boundaryChecks(
	checks: PackageCheck[],
	siteSlug: string,
	base: string,
	fixtureChanged: string[],
	draftChanged: string[]
): PackageCheck[] {
	const changed = [...new Set([...fixtureChanged, ...draftChanged])];
	return checks.map(check =>
		check.label === "Zone boundaries"
			? { ...check, detail: boundaryDetail(zonesFor(siteSlug), changed, base) }
			: check
	);
}

/** "3 zones · North meadow changed since v3" */
export function boundaryDetail(zones: Zone[], changedIds: string[], base: string): string {
	const names = zones.filter(zone => changedIds.includes(zone.id)).map(zone => zone.name);
	const count = zones.length === 1 ? "1 zone" : `${zones.length} zones`;
	if (names.length === 0) return `${count} · no boundary changed since ${base}`;
	return `${count} · ${names.join(", ")} changed since ${base}`;
}

/** The active package (or the one bundled with the app), as the preview shows it. */
export function activeRow(rows: PackageRow[]): PackageRow | undefined {
	return rows.find(row => row.state === "active" || row.state === "bundled");
}

/** The version waiting to be inspected and activated, if any. */
export function inspectingRow(rows: PackageRow[]): PackageRow | undefined {
	return rows.find(row => row.state === "inspecting");
}

/** The version a new draft takes: the one being inspected (which it replaces), or the next number. */
export function nextDraftVersion(rows: PackageRow[]): string {
	const inspecting = inspectingRow(rows);
	if (inspecting) return inspecting.version;
	const highest = rows.reduce((max, row) => Math.max(max, versionNumber(row.version)), 0);
	return `v${highest + 1}`;
}

/** "84 MB", or null when the package has no size of its own (bundled with the app). */
export function sizeLabel(row: Pick<MapPackage, "sizeMb">): string | null {
	return row.sizeMb === null ? null : `${row.sizeMb} MB`;
}

/** "Today 11:02 · PS" */
export function uploadedLabel(row: Pick<MapPackage, "uploadedLabel" | "uploadedBy">): string {
	return row.uploadedBy ? `${row.uploadedLabel} · ${row.uploadedBy}` : row.uploadedLabel;
}

export const PACKAGE_STEPS = ["upload", "inspect", "activate", "download"] as const;
export type PackageStep = (typeof PACKAGE_STEPS)[number];

export function isPackageStep(value: unknown): value is PackageStep {
	return PACKAGE_STEPS.includes(value as PackageStep);
}

/**
 * How far the site's newest package has come: Inspect while a version waits, Download once the newest
 * version is active.
 */
export function progressStep(rows: PackageRow[]): PackageStep {
	return inspectingRow(rows) ? "inspect" : "download";
}
