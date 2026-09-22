import type { ParcelAsset } from "@/types/domain";

// 8 hard-coded parcel polygons for the Central Valley demo region.
// Coordinates are GeoJSON order [lng, lat]; each ring is closed (first === last).
// Geographic accuracy is not the point — these tile a believable operating region
// around center [36.735, -119.77]. P-104 and P-106 are neighbors so the simulated
// "overlap with P-104" boundary warning for P-106 reads naturally.

export const REGION_CENTER: [number, number] = [36.735, -119.77];
export const REGION_ZOOM = 13;

// Loose bounding box used by geometry validation ("boundary must stay in region").
export const REGION_BOUNDS = {
	minLat: 36.715,
	maxLat: 36.752,
	minLng: -119.795,
	maxLng: -119.748
};

export const parcels: ParcelAsset[] = [
	{
		id: "P-101",
		type: "Feature",
		entityType: "parcel",
		properties: {
			parcelId: "P-101",
			name: "North Almond Block",
			cropType: "almonds",
			acreage: 42.6,
			ownerOperator: "Northstar Ag Operations",
			assignedTechnician: "Maya Chen",
			irrigationZone: "Zone A — North",
			status: "healthy",
			riskLevel: "low",
			riskScore: 28,
			irrigationCondition: "normal",
			priority: "low",
			lastInspectionDate: "2026-06-02",
			nextInspectionDue: "2026-07-02",
			openMaintenanceCount: 0,
			notes: "Mature almond block. Drip lines flushed in spring. No outstanding issues.",
			syncStatus: "synced",
			updatedAt: "2026-06-02T15:20:00"
		},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[-119.7872, 36.742],
					[-119.7788, 36.742],
					[-119.7784, 36.7482],
					[-119.7874, 36.7479],
					[-119.7872, 36.742]
				]
			]
		}
	},
	{
		id: "P-102",
		type: "Feature",
		entityType: "parcel",
		properties: {
			parcelId: "P-102",
			name: "East Tomato Row",
			cropType: "tomatoes",
			acreage: 28.4,
			ownerOperator: "Vargas Family Trust",
			assignedTechnician: "Luis Ortega",
			irrigationZone: "Zone B — East",
			status: "inspection_due",
			riskLevel: "medium",
			riskScore: 58,
			irrigationCondition: "low_pressure",
			priority: "medium",
			lastInspectionDate: "2026-05-14",
			nextInspectionDue: "2026-06-12",
			openMaintenanceCount: 0,
			notes: "Processing tomatoes. Reported soft pressure on east header last visit.",
			syncStatus: "pending",
			updatedAt: "2026-06-15T09:05:00"
		},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[-119.7744, 36.7434],
					[-119.7676, 36.7434],
					[-119.7676, 36.7486],
					[-119.7744, 36.7486],
					[-119.7744, 36.7434]
				]
			]
		}
	},
	{
		id: "P-103",
		type: "Feature",
		entityType: "parcel",
		properties: {
			parcelId: "P-103",
			name: "Canal Grapes West",
			cropType: "grapes",
			acreage: 35.2,
			ownerOperator: "Cordova Vineyards",
			assignedTechnician: "Priya Shah",
			irrigationZone: "Zone C — Canal",
			status: "maintenance_required",
			riskLevel: "high",
			riskScore: 76,
			irrigationCondition: "low_pressure",
			priority: "high",
			lastInspectionDate: "2026-05-28",
			nextInspectionDue: "2026-06-25",
			openMaintenanceCount: 2,
			notes: "Canal-side wine grapes. Valve B-07 needs service; access gate blocked by debris.",
			syncStatus: "pending",
			updatedAt: "2026-06-14T16:42:00"
		},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[-119.7628, 36.7412],
					[-119.7552, 36.7412],
					[-119.7552, 36.7468],
					[-119.759, 36.7472],
					[-119.7628, 36.746],
					[-119.7628, 36.7412]
				]
			]
		}
	},
	{
		id: "P-104",
		type: "Feature",
		entityType: "parcel",
		properties: {
			parcelId: "P-104",
			name: "South Alfalfa Strip",
			cropType: "alfalfa",
			acreage: 51.8,
			ownerOperator: "Northstar Ag Operations",
			assignedTechnician: "Maya Chen",
			irrigationZone: "Zone A — South",
			status: "healthy",
			riskLevel: "medium",
			riskScore: 47,
			irrigationCondition: "normal",
			priority: "low",
			lastInspectionDate: "2026-06-05",
			nextInspectionDue: "2026-07-05",
			openMaintenanceCount: 0,
			notes: "Flood-irrigated alfalfa. Third cutting scheduled late June.",
			syncStatus: "synced",
			updatedAt: "2026-06-05T11:10:00"
		},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[-119.7896, 36.7306],
					[-119.7804, 36.7306],
					[-119.7804, 36.7374],
					[-119.7896, 36.7374],
					[-119.7896, 36.7306]
				]
			]
		}
	},
	{
		id: "P-105",
		type: "Feature",
		entityType: "parcel",
		properties: {
			parcelId: "P-105",
			name: "Pump House Almonds",
			cropType: "almonds",
			acreage: 19.7,
			ownerOperator: "Northstar Ag Operations",
			assignedTechnician: "Luis Ortega",
			irrigationZone: "Zone C — Central",
			status: "maintenance_required",
			riskLevel: "high",
			riskScore: 82,
			irrigationCondition: "leak_detected",
			priority: "high",
			lastInspectionDate: "2026-06-01",
			nextInspectionDue: "2026-06-18",
			openMaintenanceCount: 2,
			notes: "Leak detected near Pump Station 2 manifold. Maintenance task open and unsynced.",
			syncStatus: "failed",
			updatedAt: "2026-06-15T13:30:00"
		},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[-119.7648, 36.7318],
					[-119.7592, 36.7318],
					[-119.7592, 36.7362],
					[-119.7648, 36.7362],
					[-119.7648, 36.7318]
				]
			]
		}
	},
	{
		id: "P-106",
		type: "Feature",
		entityType: "parcel",
		properties: {
			parcelId: "P-106",
			name: "Old Vineyard Edge",
			cropType: "grapes",
			acreage: 24.1,
			ownerOperator: "Heritage Land Co.",
			assignedTechnician: "Priya Shah",
			irrigationZone: "Zone D — Vineyard",
			status: "blocked",
			riskLevel: "critical",
			riskScore: 94,
			irrigationCondition: "offline",
			priority: "critical",
			lastInspectionDate: "2026-05-20",
			nextInspectionDue: "2026-06-10",
			openMaintenanceCount: 2,
			notes: "Boundary disputed with neighbor; irrigation offline. Draft boundary edit not yet synced.",
			syncStatus: "local_draft",
			updatedAt: "2026-06-13T08:15:00"
		},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[-119.777, 36.7306],
					[-119.771, 36.7306],
					[-119.771, 36.7354],
					[-119.774, 36.7358],
					[-119.777, 36.735],
					[-119.777, 36.7306]
				]
			]
		}
	},
	{
		id: "P-107",
		type: "Feature",
		entityType: "parcel",
		properties: {
			parcelId: "P-107",
			name: "Trial Tomato Plot",
			cropType: "tomatoes",
			acreage: 12.5,
			ownerOperator: "Northstar Research Farm",
			assignedTechnician: "Maya Chen",
			irrigationZone: "Zone B — Trial",
			status: "inspection_due",
			riskLevel: "medium",
			riskScore: 54,
			irrigationCondition: "normal",
			priority: "medium",
			lastInspectionDate: "2026-05-30",
			nextInspectionDue: "2026-06-15",
			openMaintenanceCount: 0,
			notes: "Variety trial plot. Subsurface drip. Inspection synced last cycle.",
			syncStatus: "synced",
			updatedAt: "2026-05-30T10:00:00"
		},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[-119.7804, 36.723],
					[-119.7756, 36.723],
					[-119.7756, 36.727],
					[-119.7804, 36.727],
					[-119.7804, 36.723]
				]
			]
		}
	},
	{
		id: "P-108",
		type: "Feature",
		entityType: "parcel",
		properties: {
			parcelId: "P-108",
			name: "North Alfalfa Reserve",
			cropType: "alfalfa",
			acreage: 47.3,
			ownerOperator: "Northstar Ag Operations",
			assignedTechnician: "Luis Ortega",
			irrigationZone: "Zone A — Reserve",
			status: "inactive",
			riskLevel: "low",
			riskScore: 22,
			irrigationCondition: "not_applicable",
			priority: "low",
			lastInspectionDate: "2026-04-10",
			nextInspectionDue: "2026-09-10",
			openMaintenanceCount: 0,
			notes: "Fallow reserve parcel this season. Not under active irrigation.",
			syncStatus: "synced",
			updatedAt: "2026-04-10T14:00:00"
		},
		geometry: {
			type: "Polygon",
			coordinates: [
				[
					[-119.7694, 36.7208],
					[-119.7606, 36.7208],
					[-119.7606, 36.7272],
					[-119.7694, 36.7272],
					[-119.7694, 36.7208]
				]
			]
		}
	}
];
