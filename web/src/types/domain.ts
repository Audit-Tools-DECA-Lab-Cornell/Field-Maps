// Core domain model for FieldMaps Parcel Editor.
// All types are local — there is no backend. See PROTOTYPE.plan.md.

export type EntityType = "parcel" | "asset" | "inspection";

export type ParcelStatus = "healthy" | "inspection_due" | "maintenance_required" | "blocked" | "inactive";

export type SyncStatus = "synced" | "pending" | "syncing" | "failed" | "local_draft";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type CropType = "almonds" | "tomatoes" | "grapes" | "alfalfa";

export type IrrigationCondition = "normal" | "low_pressure" | "leak_detected" | "offline" | "not_applicable";

export type AssetType = "pump_station" | "irrigation_valve" | "soil_sensor" | "access_gate" | "maintenance_flag";

export type AssetStatus = "operational" | "needs_attention" | "offline" | "blocked" | "resolved";

export type Priority = "low" | "medium" | "high" | "critical";

export type GeometryEditState =
	| "none"
	| "editing"
	| "dirty"
	| "validating"
	| "ready_to_save"
	| "saved_local"
	| "invalid";

export type InspectionResult = "passed" | "monitor" | "follow_up_required" | "blocked";

export type SoilMoisture = "low" | "normal" | "high" | "unknown";

export type PestPressure = "none" | "low" | "medium" | "high";

export type AccessCondition = "clear" | "limited" | "blocked";

export type ChangeType =
	| "attribute_update"
	| "geometry_update"
	| "inspection_create"
	| "maintenance_task_create"
	| "status_change";

/** GeoJSON Polygon: array of linear rings, each ring an array of [lng, lat]. */
export type PolygonCoordinates = number[][][];

export interface ParcelAsset {
	id: string;
	type: "Feature";
	entityType: "parcel";
	properties: {
		parcelId: string;
		name: string;
		cropType: CropType;
		acreage: number;
		ownerOperator: string;
		assignedTechnician: string;
		irrigationZone: string;
		status: ParcelStatus;
		riskLevel: RiskLevel;
		riskScore: number;
		irrigationCondition: IrrigationCondition;
		priority: Priority;
		lastInspectionDate: string;
		nextInspectionDue: string;
		openMaintenanceCount: number;
		notes: string;
		syncStatus: SyncStatus;
		updatedAt: string;
	};
	geometry: {
		type: "Polygon";
		coordinates: PolygonCoordinates;
	};
}

export interface FieldMarkerAsset {
	id: string;
	type: "Feature";
	entityType: "asset";
	properties: {
		assetId: string;
		name: string;
		assetType: AssetType;
		linkedParcelId: string;
		status: AssetStatus;
		priority: Priority;
		lastCheckedAt: string;
		assignedTechnician: string;
		notes: string;
		syncStatus: SyncStatus;
	};
	geometry: {
		type: "Point";
		coordinates: [number, number];
	};
}

export interface InspectionRecord {
	id: string;
	parcelId: string;
	inspectorName: string;
	inspectionDate: string;
	result: InspectionResult;
	soilMoisture: SoilMoisture;
	irrigationCondition: IrrigationCondition;
	pestPressure: PestPressure;
	accessCondition: AccessCondition;
	followUpRequired: boolean;
	notes: string;
	createdAt: string;
	syncStatus: SyncStatus;
}

export interface SyncEvent {
	id: string;
	entityType: EntityType;
	entityId: string;
	/** Human-readable entity label, e.g. "P-102 — East Tomato Row". */
	entityLabel: string;
	changeType: ChangeType;
	status: SyncStatus;
	createdAt: string;
	lastAttemptAt?: string;
	completedAt?: string;
	summary: string;
	payloadPreview: Record<string, unknown>;
	errorMessage?: string;
	retryCount: number;
}

export type ActivitySeverity = "info" | "success" | "warning" | "error";

export type ActivityAction =
	| "selected"
	| "viewed"
	| "created"
	| "updated"
	| "edited_geometry"
	| "validated"
	| "synced"
	| "sync_failed"
	| "resolved"
	| "discarded";

export interface ActivityLogItem {
	id: string;
	timestamp: string;
	actor: string;
	entityType: EntityType;
	entityId: string;
	action: ActivityAction;
	message: string;
	severity: ActivitySeverity;
}
