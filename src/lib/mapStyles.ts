import type { AssetStatus, AssetType, ParcelStatus, RiskLevel, SyncStatus } from "@/types/domain";

export interface PolygonStyle {
	color: string; // stroke
	fillColor: string;
}

// Operational status drives parcel polygon color.
export const parcelStatusStyle: Record<ParcelStatus, PolygonStyle> = {
	healthy: { color: "#15803d", fillColor: "#22c55e" },
	inspection_due: { color: "#b45309", fillColor: "#f59e0b" },
	maintenance_required: { color: "#c2410c", fillColor: "#f97316" },
	blocked: { color: "#b91c1c", fillColor: "#ef4444" },
	inactive: { color: "#64748b", fillColor: "#94a3b8" }
};

export const parcelStatusSwatch: Record<ParcelStatus, string> = {
	healthy: "#22c55e",
	inspection_due: "#f59e0b",
	maintenance_required: "#f97316",
	blocked: "#ef4444",
	inactive: "#94a3b8"
};

export interface MarkerStyle {
	color: string;
	glyph: string;
}

export const assetMarkerStyle: Record<AssetType, MarkerStyle> = {
	pump_station: { color: "#2563eb", glyph: "P" },
	irrigation_valve: { color: "#0891b2", glyph: "V" },
	soil_sensor: { color: "#7c3aed", glyph: "S" },
	access_gate: { color: "#475569", glyph: "G" },
	maintenance_flag: { color: "#ea580c", glyph: "!" }
};

export const syncStatusColor: Record<SyncStatus, string> = {
	synced: "#16a34a",
	pending: "#d97706",
	syncing: "#2563eb",
	failed: "#dc2626",
	local_draft: "#7c3aed"
};

export const riskColor: Record<RiskLevel, string> = {
	low: "#16a34a",
	medium: "#d97706",
	high: "#ea580c",
	critical: "#dc2626"
};

export const assetStatusColor: Record<AssetStatus, string> = {
	operational: "#16a34a",
	needs_attention: "#d97706",
	offline: "#64748b",
	blocked: "#dc2626",
	resolved: "#2563eb"
};

// Base / selected / hidden polygon rendering options for Leaflet paths.
export const POLYGON_BASE = { weight: 1.5, fillOpacity: 0.35, opacity: 0.9 };
export const POLYGON_SELECTED = { weight: 3.5, fillOpacity: 0.5, opacity: 1 };
export const POLYGON_DIMMED = { weight: 1, fillOpacity: 0.12, opacity: 0.4 };
