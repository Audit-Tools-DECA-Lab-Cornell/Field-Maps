import type { Site } from "@/lib/api/types";
import { formatBytes, plural } from "@/lib/labels";
import type { ObservationLike } from "@/lib/observations/summary";
import { byZone } from "@/lib/observations/summary";
import type { Clock } from "@/lib/time";

/**
 * What the Sites screens show about a site, worked out once on the server and passed to the screens as
 * plain values. A site's current package is the newest one whose checks passed (the API's `package`).
 */

export type SitePackageView = {
	packageId: string;
	version: number;
	/** "Oct 07, 2026 · 14:05" in the project's timezone. */
	prepared: string;
	/** "Oct 07, 2026". */
	preparedDay: string;
	bytes: number;
	sizeLabel: string;
	formVersion: string | null;
};

export type SiteView = {
	code: string;
	name: string;
	description: string | null;
	/** The zones of the current package, in its order. */
	zones: { id: string; label: string }[];
	zonesLabel: string;
	observationCount: number;
	observationsLabel: string;
	package: SitePackageView | null;
};

export function siteView(site: Site, clock: Clock): SiteView {
	const zones = (site.zones ?? []).map(zone => ({ id: zone.id, label: zone.label }));
	const current = site.package;
	return {
		code: site.code,
		name: site.name,
		description: site.description?.trim() ? site.description.trim() : null,
		zones,
		zonesLabel: current ? plural(zones.length, "zone") : "No zones yet",
		observationCount: site.observation_count,
		observationsLabel: plural(site.observation_count, "observation"),
		package: current
			? {
					packageId: current.package_id,
					version: current.version,
					prepared: clock.dayTime(current.prepared_at),
					preparedDay: clock.day(current.prepared_at),
					bytes: current.archive_bytes,
					sizeLabel: formatBytes(current.archive_bytes),
					formVersion: current.form_version
				}
			: null
	};
}

/** Sites by name, so the list reads the same on every visit. */
export function sortSites<T extends { name: string; code: string }>(sites: readonly T[]): T[] {
	return [...sites].sort((a, b) => a.name.localeCompare(b.name, "en") || a.code.localeCompare(b.code, "en"));
}

/** The first `limit` sites with a map package, whose plans the list draws as thumbnails. */
export function thumbnailSites<T extends { package: unknown }>(sites: readonly T[], limit = 6): T[] {
	return sites.filter(site => site.package !== null).slice(0, limit);
}

export type ZoneRow = {
	/** The zone's id, or null for observations recorded with no zone. */
	id: string | null;
	label: string;
	/** Observations in this zone, or null when they could not be counted. */
	count: number | null;
	countLabel: string | null;
};

/**
 * The site's zones with how many of the listed observations each holds. Zones of older packages that
 * observations still name are kept under their id, and observations with no zone under "No zone".
 * Without the observations (`null`) the zones are listed without counts.
 */
export function zoneRows(
	zones: readonly { id: string; label: string }[],
	observations: readonly ObservationLike[] | null
): ZoneRow[] {
	if (observations === null)
		return zones.map(zone => ({ id: zone.id, label: zone.label, count: null, countLabel: null }));
	return byZone(observations, zones).map(entry => ({
		id: entry.key,
		label: entry.label,
		count: entry.count,
		countLabel: plural(entry.count, "observation")
	}));
}
