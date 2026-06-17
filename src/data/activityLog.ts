import type { ActivityLogItem } from "@/types/domain";

// 18 initial activity log items, oldest first. The UI sorts newest-first.
// Together they tell the recent operational story of the demo region.

export const activityLog: ActivityLogItem[] = [
	{
		id: "ACT-001",
		timestamp: "2026-04-10T13:52:00",
		actor: "Luis Ortega",
		entityType: "inspection",
		entityId: "INS-015",
		action: "synced",
		message: "Closed out North Alfalfa Reserve for the season.",
		severity: "success"
	},
	{
		id: "ACT-002",
		timestamp: "2026-05-20T12:40:00",
		actor: "Priya Shah",
		entityType: "inspection",
		entityId: "INS-012",
		action: "created",
		message: "Inspection blocked at Old Vineyard Edge — access denied, irrigation offline.",
		severity: "warning"
	},
	{
		id: "ACT-003",
		timestamp: "2026-05-28T11:56:00",
		actor: "Priya Shah",
		entityType: "inspection",
		entityId: "INS-005",
		action: "created",
		message: "Logged follow-up inspection for Canal Grapes West.",
		severity: "info"
	},
	{
		id: "ACT-004",
		timestamp: "2026-05-30T10:01:00",
		actor: "Maya Chen",
		entityType: "inspection",
		entityId: "INS-014",
		action: "synced",
		message: "Trial Tomato Plot inspection synced to operations system.",
		severity: "success"
	},
	{
		id: "ACT-005",
		timestamp: "2026-06-01T14:33:00",
		actor: "Luis Ortega",
		entityType: "inspection",
		entityId: "INS-009",
		action: "created",
		message: "Leak detected at Pump House Almonds — follow-up required.",
		severity: "warning"
	},
	{
		id: "ACT-006",
		timestamp: "2026-06-02T15:18:00",
		actor: "Maya Chen",
		entityType: "inspection",
		entityId: "INS-001",
		action: "created",
		message: "Maya Chen completed inspection for North Almond Block.",
		severity: "success"
	},
	{
		id: "ACT-007",
		timestamp: "2026-06-05T11:05:00",
		actor: "Maya Chen",
		entityType: "inspection",
		entityId: "INS-008",
		action: "created",
		message: "South Alfalfa Strip passed inspection ahead of third cutting.",
		severity: "success"
	},
	{
		id: "ACT-008",
		timestamp: "2026-06-09T09:35:00",
		actor: "Priya Shah",
		entityType: "asset",
		entityId: "A-009",
		action: "updated",
		message: "Access Gate Canal reported blocked by storm debris.",
		severity: "warning"
	},
	{
		id: "ACT-009",
		timestamp: "2026-06-10T08:30:00",
		actor: "Maya Chen",
		entityType: "asset",
		entityId: "A-001",
		action: "validated",
		message: "Pump Station 1 routine check — pressure nominal.",
		severity: "info"
	},
	{
		id: "ACT-010",
		timestamp: "2026-06-12T18:05:00",
		actor: "System",
		entityType: "asset",
		entityId: "A-007",
		action: "updated",
		message: "Soil Sensor V-2 went offline after irrigation shutdown.",
		severity: "warning"
	},
	{
		id: "ACT-011",
		timestamp: "2026-06-13T08:15:00",
		actor: "Priya Shah",
		entityType: "parcel",
		entityId: "P-106",
		action: "edited_geometry",
		message: "Boundary redraw drafted for Old Vineyard Edge (disputed edge).",
		severity: "info"
	},
	{
		id: "ACT-012",
		timestamp: "2026-06-13T08:20:00",
		actor: "Priya Shah",
		entityType: "asset",
		entityId: "A-011",
		action: "created",
		message: "Maintenance flag created for downed fence at Old Vineyard Edge.",
		severity: "warning"
	},
	{
		id: "ACT-013",
		timestamp: "2026-06-14T16:42:00",
		actor: "Priya Shah",
		entityType: "parcel",
		entityId: "P-103",
		action: "updated",
		message: "Canal Grapes West set to maintenance required.",
		severity: "info"
	},
	{
		id: "ACT-014",
		timestamp: "2026-06-15T13:26:00",
		actor: "Luis Ortega",
		entityType: "asset",
		entityId: "A-010",
		action: "created",
		message: "Maintenance task opened for Pump Station 2 leak.",
		severity: "warning"
	},
	{
		id: "ACT-015",
		timestamp: "2026-06-15T13:40:00",
		actor: "System",
		entityType: "asset",
		entityId: "A-010",
		action: "sync_failed",
		message: "Sync failed for P-105 maintenance task: missing required category.",
		severity: "error"
	},
	{
		id: "ACT-016",
		timestamp: "2026-06-15T11:21:00",
		actor: "Luis Ortega",
		entityType: "asset",
		entityId: "A-006",
		action: "updated",
		message: "Soil Sensor E-9 status change queued for sync.",
		severity: "info"
	},
	{
		id: "ACT-017",
		timestamp: "2026-06-15T09:05:00",
		actor: "Luis Ortega",
		entityType: "parcel",
		entityId: "P-102",
		action: "updated",
		message: "East Tomato Row attribute update queued for sync.",
		severity: "info"
	},
	{
		id: "ACT-018",
		timestamp: "2026-06-16T07:30:00",
		actor: "Ops Coordinator",
		entityType: "parcel",
		entityId: "P-101",
		action: "viewed",
		message: "Opened Central Valley demo region workspace.",
		severity: "info"
	}
];
