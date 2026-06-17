import type { FieldMarkerAsset } from "@/types/domain";

// 12 hard-coded field markers. Coordinates are GeoJSON order [lng, lat] and sit
// inside (or on the edge of) the linked parcel.

export const assets: FieldMarkerAsset[] = [
	{
		id: "A-001",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-001",
			name: "Pump Station 1",
			assetType: "pump_station",
			linkedParcelId: "P-101",
			status: "operational",
			priority: "low",
			lastCheckedAt: "2026-06-10T08:30:00",
			assignedTechnician: "Maya Chen",
			notes: "Main lift pump for Zone A North. Pressure nominal.",
			syncStatus: "synced"
		},
		geometry: { type: "Point", coordinates: [-119.784, 36.745] }
	},
	{
		id: "A-002",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-002",
			name: "Pump Station 2",
			assetType: "pump_station",
			linkedParcelId: "P-105",
			status: "needs_attention",
			priority: "high",
			lastCheckedAt: "2026-06-14T07:50:00",
			assignedTechnician: "Luis Ortega",
			notes: "Manifold seepage observed. Linked to open leak maintenance flag.",
			syncStatus: "failed"
		},
		geometry: { type: "Point", coordinates: [-119.762, 36.734] }
	},
	{
		id: "A-003",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-003",
			name: "Valve A-12",
			assetType: "irrigation_valve",
			linkedParcelId: "P-102",
			status: "operational",
			priority: "low",
			lastCheckedAt: "2026-06-11T12:15:00",
			assignedTechnician: "Luis Ortega",
			notes: "East header isolation valve.",
			syncStatus: "synced"
		},
		geometry: { type: "Point", coordinates: [-119.771, 36.7455] }
	},
	{
		id: "A-004",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-004",
			name: "Valve B-07",
			assetType: "irrigation_valve",
			linkedParcelId: "P-103",
			status: "needs_attention",
			priority: "high",
			lastCheckedAt: "2026-06-09T09:40:00",
			assignedTechnician: "Priya Shah",
			notes: "Slow to seat; suspected debris. Service scheduled.",
			syncStatus: "pending"
		},
		geometry: { type: "Point", coordinates: [-119.759, 36.744] }
	},
	{
		id: "A-005",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-005",
			name: "Soil Sensor N-4",
			assetType: "soil_sensor",
			linkedParcelId: "P-101",
			status: "operational",
			priority: "low",
			lastCheckedAt: "2026-06-16T05:00:00",
			assignedTechnician: "Maya Chen",
			notes: "Capacitance probe at 18in depth. Reporting normally.",
			syncStatus: "synced"
		},
		geometry: { type: "Point", coordinates: [-119.7855, 36.7465] }
	},
	{
		id: "A-006",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-006",
			name: "Soil Sensor E-9",
			assetType: "soil_sensor",
			linkedParcelId: "P-102",
			status: "offline",
			priority: "medium",
			lastCheckedAt: "2026-06-15T11:20:00",
			assignedTechnician: "Luis Ortega",
			notes: "No telemetry for 18 hours. Battery or radio suspected.",
			syncStatus: "pending"
		},
		geometry: { type: "Point", coordinates: [-119.7725, 36.747] }
	},
	{
		id: "A-007",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-007",
			name: "Soil Sensor V-2",
			assetType: "soil_sensor",
			linkedParcelId: "P-106",
			status: "offline",
			priority: "high",
			lastCheckedAt: "2026-06-12T18:05:00",
			assignedTechnician: "Priya Shah",
			notes: "Offline since irrigation shutdown on blocked parcel.",
			syncStatus: "local_draft"
		},
		geometry: { type: "Point", coordinates: [-119.774, 36.733] }
	},
	{
		id: "A-008",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-008",
			name: "Access Gate North",
			assetType: "access_gate",
			linkedParcelId: "P-101",
			status: "operational",
			priority: "low",
			lastCheckedAt: "2026-06-10T08:25:00",
			assignedTechnician: "Maya Chen",
			notes: "North service entrance. Lock code current.",
			syncStatus: "synced"
		},
		geometry: { type: "Point", coordinates: [-119.7872, 36.745] }
	},
	{
		id: "A-009",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-009",
			name: "Access Gate Canal",
			assetType: "access_gate",
			linkedParcelId: "P-103",
			status: "blocked",
			priority: "high",
			lastCheckedAt: "2026-06-09T09:35:00",
			assignedTechnician: "Priya Shah",
			notes: "Blocked by storm debris. Crew cannot reach canal valves.",
			syncStatus: "pending"
		},
		geometry: { type: "Point", coordinates: [-119.7628, 36.744] }
	},
	{
		id: "A-010",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-010",
			name: "Maintenance Flag Leak",
			assetType: "maintenance_flag",
			linkedParcelId: "P-105",
			status: "needs_attention",
			priority: "critical",
			lastCheckedAt: "2026-06-15T13:25:00",
			assignedTechnician: "Luis Ortega",
			notes: "Active leak at Pump Station 2. Awaiting parts.",
			syncStatus: "failed"
		},
		geometry: { type: "Point", coordinates: [-119.7635, 36.735] }
	},
	{
		id: "A-011",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-011",
			name: "Maintenance Flag Fence",
			assetType: "maintenance_flag",
			linkedParcelId: "P-106",
			status: "needs_attention",
			priority: "high",
			lastCheckedAt: "2026-06-13T08:10:00",
			assignedTechnician: "Priya Shah",
			notes: "Perimeter fence down along disputed boundary.",
			syncStatus: "local_draft"
		},
		geometry: { type: "Point", coordinates: [-119.7755, 36.734] }
	},
	{
		id: "A-012",
		type: "Feature",
		entityType: "asset",
		properties: {
			assetId: "A-012",
			name: "Irrigation Valve Reserve",
			assetType: "irrigation_valve",
			linkedParcelId: "P-108",
			status: "operational",
			priority: "low",
			lastCheckedAt: "2026-04-10T14:05:00",
			assignedTechnician: "Luis Ortega",
			notes: "Isolation valve for fallow reserve. Closed for season.",
			syncStatus: "synced"
		},
		geometry: { type: "Point", coordinates: [-119.765, 36.724] }
	}
];
