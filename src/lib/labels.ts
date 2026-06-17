import type {
	AccessCondition,
	AssetStatus,
	AssetType,
	ChangeType,
	CropType,
	InspectionResult,
	IrrigationCondition,
	ParcelStatus,
	PestPressure,
	Priority,
	RiskLevel,
	SoilMoisture,
	SyncStatus
} from "@/types/domain";

export const parcelStatusLabel: Record<ParcelStatus, string> = {
	healthy: "Healthy",
	inspection_due: "Inspection due",
	maintenance_required: "Maintenance required",
	blocked: "Blocked",
	inactive: "Inactive"
};

export const syncStatusLabel: Record<SyncStatus, string> = {
	synced: "Synced",
	pending: "Pending",
	syncing: "Syncing",
	failed: "Failed",
	local_draft: "Local draft"
};

export const riskLabel: Record<RiskLevel, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	critical: "Critical"
};

export const cropLabel: Record<CropType, string> = {
	almonds: "Almonds",
	tomatoes: "Tomatoes",
	grapes: "Grapes",
	alfalfa: "Alfalfa"
};

export const irrigationLabel: Record<IrrigationCondition, string> = {
	normal: "Normal",
	low_pressure: "Low pressure",
	leak_detected: "Leak detected",
	offline: "Offline",
	not_applicable: "Not applicable"
};

export const assetTypeLabel: Record<AssetType, string> = {
	pump_station: "Pump station",
	irrigation_valve: "Irrigation valve",
	soil_sensor: "Soil sensor",
	access_gate: "Access gate",
	maintenance_flag: "Maintenance flag"
};

export const assetStatusLabel: Record<AssetStatus, string> = {
	operational: "Operational",
	needs_attention: "Needs attention",
	offline: "Offline",
	blocked: "Blocked",
	resolved: "Resolved"
};

export const priorityLabel: Record<Priority, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
	critical: "Critical"
};

export const inspectionResultLabel: Record<InspectionResult, string> = {
	passed: "Passed",
	monitor: "Monitor",
	follow_up_required: "Follow-up required",
	blocked: "Blocked"
};

export const soilMoistureLabel: Record<SoilMoisture, string> = {
	low: "Low",
	normal: "Normal",
	high: "High",
	unknown: "Unknown"
};

export const pestPressureLabel: Record<PestPressure, string> = {
	none: "None",
	low: "Low",
	medium: "Medium",
	high: "High"
};

export const accessConditionLabel: Record<AccessCondition, string> = {
	clear: "Clear",
	limited: "Limited",
	blocked: "Blocked"
};

export const changeTypeLabel: Record<ChangeType, string> = {
	attribute_update: "Attribute update",
	geometry_update: "Geometry update",
	inspection_create: "Inspection record",
	maintenance_task_create: "Maintenance task",
	status_change: "Status change"
};

export const TECHNICIANS = ["Maya Chen", "Luis Ortega", "Priya Shah"] as const;
