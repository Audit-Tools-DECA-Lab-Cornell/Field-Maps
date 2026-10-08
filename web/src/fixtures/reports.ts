import type { PrintableReport, RoundPlan, SavedView } from "./types";

/** Printable summaries and saved views: proposal U7. */
export const REPORTS: PrintableReport[] = [
	{
		id: "RIV-01",
		slug: "riverside-site-summary",
		title: "Riverside · site summary",
		scope: "All zones · rounds 1–3",
		siteSlug: "riverside",
		rounds: [1, 2, 3]
	},
	{
		id: "NM-01",
		slug: "north-meadow-round-summary",
		title: "North meadow · round summary",
		scope: "Zone A · round 1",
		siteSlug: "riverside",
		zoneSlug: "north-meadow",
		rounds: [1]
	}
];

export const SAVED_VIEWS: SavedView[] = [
	{
		id: "north-meadow-round-1",
		name: "North meadow · Round 1",
		zone: "north-meadow",
		round: 1,
		playType: null,
		query: "",
		savedBy: "PS",
		savedLabel: "Oct 01"
	},
	{
		id: "woodland-edge-physical",
		name: "Woodland edge · Physical play",
		zone: "woodland-edge",
		round: null,
		playType: "physical",
		query: "",
		savedBy: "JL",
		savedLabel: "Sep 30"
	}
];

/** Proposal U6: a schedule preview that is not stored anywhere. */
export const ROUND_PLAN: RoundPlan[] = [
	{ round: 1, window: "Morning", zones: "All zones", observers: "Unassigned" },
	{ round: 2, window: "Midday", zones: "All zones", observers: "Unassigned" },
	{ round: 3, window: "Afternoon", zones: "All zones", observers: "Unassigned" }
];
