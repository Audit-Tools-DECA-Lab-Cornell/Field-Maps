import type { ObservationPoint } from "@/types/capture";

export const seedObservations: ObservationPoint[] = [
	{
		id: "OBS-1001",
		type: "Feature",
		geometry: { type: "Point", coordinates: [-119.77335, 36.73582] },
		properties: {
			observerInitials: "MC",
			observedAt: "2026-09-01T09:14",
			kind: "tree",
			condition: "monitor",
			ageOrSize: "Mature / 18–24 ft",
			notes: "Canopy thinning on west side; photograph during follow-up.",
			followUpRequired: true,
			captureMethod: "map_tap",
			syncStatus: "queued"
		}
	},
	{
		id: "OBS-1002",
		type: "Feature",
		geometry: { type: "Point", coordinates: [-119.76784, 36.73294] },
		properties: {
			observerInitials: "LO",
			observedAt: "2026-09-01T09:28",
			kind: "irrigation",
			condition: "needs_action",
			ageOrSize: "Valve B-07",
			notes: "Slow leak visible at coupling.",
			followUpRequired: true,
			captureMethod: "map_tap",
			syncStatus: "queued"
		}
	}
];
