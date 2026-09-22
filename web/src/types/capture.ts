export type ObservationKind = "tree" | "irrigation" | "play_area" | "access" | "other";

export type ObservationCondition = "good" | "monitor" | "needs_action" | "not_present";

export type ObservationSyncStatus = "queued" | "synced";

export type LongitudeLatitude = [longitude: number, latitude: number];

export interface ObservationPoint {
	id: string;
	type: "Feature";
	geometry: {
		type: "Point";
		coordinates: LongitudeLatitude;
	};
	properties: {
		observerInitials: string;
		observedAt: string;
		kind: ObservationKind;
		condition: ObservationCondition;
		ageOrSize: string;
		notes: string;
		followUpRequired: boolean;
		captureMethod: "map_tap" | "sample";
		syncStatus: ObservationSyncStatus;
	};
}

export interface ObservationDraft {
	observerInitials: string;
	observedAt: string;
	kind: ObservationKind;
	condition: ObservationCondition;
	ageOrSize: string;
	notes: string;
	followUpRequired: boolean;
	captureMethod: "map_tap" | "sample";
}
