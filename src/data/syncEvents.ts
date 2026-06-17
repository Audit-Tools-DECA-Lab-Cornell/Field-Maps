import type { SyncEvent } from "@/types/domain";

// 6 initial sync queue entries covering every sync status.

export const syncEvents: SyncEvent[] = [
	{
		id: "SYNC-001",
		entityType: "parcel",
		entityId: "P-102",
		entityLabel: "P-102 — East Tomato Row",
		changeType: "attribute_update",
		status: "pending",
		createdAt: "2026-06-15T09:05:00",
		summary: "Irrigation condition → low pressure; status → inspection due",
		payloadPreview: {
			parcelId: "P-102",
			status: "inspection_due",
			irrigationCondition: "low_pressure"
		},
		retryCount: 0
	},
	{
		id: "SYNC-002",
		entityType: "inspection",
		entityId: "INS-005",
		entityLabel: "P-103 — Canal Grapes West",
		changeType: "inspection_create",
		status: "pending",
		createdAt: "2026-05-28T11:56:00",
		summary: "Follow-up inspection: mildew pressure, Valve B-07 service",
		payloadPreview: {
			parcelId: "P-103",
			result: "follow_up_required",
			inspector: "Priya Shah"
		},
		retryCount: 0
	},
	{
		id: "SYNC-003",
		entityType: "asset",
		entityId: "A-010",
		entityLabel: "P-105 — Maintenance Flag Leak",
		changeType: "maintenance_task_create",
		status: "failed",
		createdAt: "2026-06-15T13:26:00",
		lastAttemptAt: "2026-06-15T13:40:00",
		summary: "Open leak task for Pump Station 2 manifold",
		payloadPreview: {
			parcelId: "P-105",
			issueType: "leak",
			priority: "critical"
		},
		errorMessage: "Assigned asset is missing required maintenance category.",
		retryCount: 2
	},
	{
		id: "SYNC-004",
		entityType: "parcel",
		entityId: "P-106",
		entityLabel: "P-106 — Old Vineyard Edge",
		changeType: "geometry_update",
		status: "local_draft",
		createdAt: "2026-06-13T08:16:00",
		summary: "Boundary redraw along disputed east edge (draft)",
		payloadPreview: {
			parcelId: "P-106",
			vertices: 5,
			areaDeltaAcres: -0.7,
			review: "supervisor_required"
		},
		retryCount: 0
	},
	{
		id: "SYNC-005",
		entityType: "asset",
		entityId: "A-006",
		entityLabel: "P-102 — Soil Sensor E-9",
		changeType: "status_change",
		status: "pending",
		createdAt: "2026-06-15T11:21:00",
		summary: "Sensor status → offline (no telemetry 18h)",
		payloadPreview: {
			assetId: "A-006",
			status: "offline"
		},
		retryCount: 0
	},
	{
		id: "SYNC-006",
		entityType: "inspection",
		entityId: "INS-014",
		entityLabel: "P-107 — Trial Tomato Plot",
		changeType: "inspection_create",
		status: "synced",
		createdAt: "2026-05-30T09:59:00",
		lastAttemptAt: "2026-05-30T10:01:00",
		completedAt: "2026-05-30T10:01:30",
		summary: "Routine monitor inspection synced to operations system",
		payloadPreview: {
			parcelId: "P-107",
			result: "monitor",
			inspector: "Maya Chen"
		},
		retryCount: 0
	}
];
