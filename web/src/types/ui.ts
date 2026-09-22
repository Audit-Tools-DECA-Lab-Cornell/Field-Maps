import type { CropType, EntityType, GeometryEditState, ParcelStatus, PolygonCoordinates, SyncStatus } from "./domain";

export type InspectorMode =
	| "empty"
	| "parcel_view"
	| "asset_view"
	| "parcel_edit"
	| "inspection_create"
	| "geometry_edit"
	| "maintenance_create"
	| "sync_review";

export type MapMode = "review" | "select" | "edit_geometry";

export type AppMode = "review" | "attribute_edit" | "boundary_edit" | "sync_review";

export type BottomPanelTab = "activity" | "sync_queue" | "analytics";

export interface LayerVisibility {
	parcels: boolean;
	irrigationAssets: boolean;
	soilSensors: boolean;
	accessGates: boolean;
	maintenanceFlags: boolean;
	inspectionHeatOverlay: boolean;
}

export interface ActiveFilters {
	statuses: ParcelStatus[];
	cropTypes: CropType[];
	technicians: string[];
	syncStatuses: SyncStatus[];
	visibleLayers: LayerVisibility;
}

export interface GeometryEditSession {
	parcelId: string | null;
	state: GeometryEditState;
	originalCoordinates?: PolygonCoordinates;
	draftCoordinates?: PolygonCoordinates;
	selectedVertexIndex: number | null;
	areaDeltaAcres: number;
	validationMessages: string[];
}

export interface UISelectionState {
	selectedEntityType: EntityType | null;
	selectedEntityId: string | null;
	selectedParcelId: string | null;
	inspectorMode: InspectorMode;
	mapMode: MapMode;
}

/** Imperative request the map should honor once (then clear). */
export type MapCommand =
	| { kind: "fit_region"; token: number }
	| { kind: "fit_selected"; token: number; parcelId: string }
	| null;

export interface Toast {
	id: string;
	message: string;
	tone: "info" | "success" | "warning" | "error";
}
