/**
 * The six things a manager comes here to do. The order is the order the work happens in: you read
 * what came back from the field before you change what goes out to it.
 */
export interface Section {
	readonly href: string;
	readonly label: string;
	readonly blurb: string;
}

export const SECTIONS: readonly Section[] = [
	{ href: "/", label: "Overview", blurb: "What the field returned, and what is blocking it" },
	{ href: "/observations", label: "Observations", blurb: "Every record, on the map and in the table" },
	{ href: "/places", label: "Places", blurb: "Sites, zones and rounds" },
	{ href: "/instrument", label: "Instrument", blurb: "Variables, display logic and versions" },
	{ href: "/basemaps", label: "Base maps", blurb: "Turning a QGIS project into an offline package" },
	{ href: "/qgis", label: "QGIS", blurb: "The connection that reads the same database" }
];
