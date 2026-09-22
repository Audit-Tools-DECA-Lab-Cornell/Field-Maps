import type { BasemapPackage } from "@/types/domain";

/**
 * Base map preparation. A `.qgz` alone is not a package: it references its sources, so the
 * preparation step resolves them, checks the CRS, renders the imagery it is permitted to render,
 * and only then produces something an observer can carry offline.
 *
 * Package delivery does not exist yet in either application — the collector's two packages are
 * bundled with the app. These rows describe the steps a real preparation has to pass, not a
 * pipeline that runs today.
 */
export const BASEMAP_PACKAGES: readonly BasemapPackage[] = [
	{
		id: "pkg-north-v4",
		siteId: "site-north-playground",
		source: "riverside_north.qgz",
		detail: "7 layers · EPSG:26910 · 18.4 MB prepared",
		state: "done",
		steps: [
			{ name: "Source project read", detail: "riverside_north.qgz · 7 layers · EPSG:26910", state: "done" },
			{ name: "Layer sources resolved", detail: "7 of 7 resolved", state: "done" },
			{
				name: "CRS check and reprojection",
				detail: "Reprojected to EPSG:4326 for the observation layer",
				state: "done"
			},
			{ name: "Imagery licence check", detail: "Vector only; no raster imagery referenced", state: "done" },
			{
				name: "Tile render and package",
				detail: "Packaged as v4 · this is the package on both devices",
				state: "done"
			}
		]
	},
	{
		id: "pkg-meadow-v1",
		siteId: "site-meadow",
		source: "riverside_meadow.qgz",
		detail: "5 layers · one source missing",
		state: "warning",
		steps: [
			{ name: "Source project read", detail: "riverside_meadow.qgz · 5 layers · EPSG:26910", state: "done" },
			{
				name: "Layer sources resolved",
				detail: "4 of 5 resolved · one references a GeoPackage that is not on the server",
				state: "warning"
			},
			{ name: "CRS check and reprojection", detail: "Waiting on the missing source", state: "waiting" },
			{ name: "Imagery licence check", detail: "Not started", state: "waiting" },
			{ name: "Tile render and package", detail: "Not started", state: "waiting" }
		]
	},
	{
		id: "pkg-courtyard-v1",
		siteId: "site-courtyard",
		source: "riverside_courtyard.qgz",
		detail: "Blocked on the imagery licence",
		state: "blocked",
		steps: [
			{ name: "Source project read", detail: "riverside_courtyard.qgz · 4 layers · EPSG:26910", state: "done" },
			{ name: "Layer sources resolved", detail: "4 of 4 resolved", state: "done" },
			{ name: "CRS check and reprojection", detail: "Reprojected to EPSG:4326", state: "done" },
			{
				name: "Imagery licence check",
				detail: "The referenced basemap is a Google tile source, which cannot be repackaged for offline use",
				state: "blocked"
			},
			{
				name: "Tile render and package",
				detail: "Blocked — waiting on a basemap the licence permits",
				state: "waiting"
			}
		]
	}
];
