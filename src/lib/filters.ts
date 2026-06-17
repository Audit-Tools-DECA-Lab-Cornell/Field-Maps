import type { AssetType, FieldMarkerAsset, ParcelAsset, SyncEvent } from "@/types/domain";
import type { ActiveFilters, LayerVisibility } from "@/types/ui";

import { cropLabel } from "./labels";

export const assetLayerKey: Record<AssetType, keyof LayerVisibility> = {
	pump_station: "irrigationAssets",
	irrigation_valve: "irrigationAssets",
	soil_sensor: "soilSensors",
	access_gate: "accessGates",
	maintenance_flag: "maintenanceFlags"
};

function parcelMatchesSearch(parcel: ParcelAsset, q: string): boolean {
	if (!q) return true;
	const p = parcel.properties;
	return [
		p.parcelId,
		p.name,
		p.cropType,
		cropLabel[p.cropType],
		p.assignedTechnician,
		p.ownerOperator,
		p.irrigationZone
	]
		.join(" ")
		.toLowerCase()
		.includes(q);
}

function assetMatchesSearch(asset: FieldMarkerAsset, q: string): boolean {
	if (!q) return true;
	const a = asset.properties;
	return [a.assetId, a.name, a.assetType, a.assignedTechnician, a.linkedParcelId].join(" ").toLowerCase().includes(q);
}

/** Attribute filters (status / crop / technician / sync) — empty list = no filter. */
export function parcelPassesFilters(parcel: ParcelAsset, filters: ActiveFilters): boolean {
	const p = parcel.properties;
	if (filters.statuses.length && !filters.statuses.includes(p.status)) return false;
	if (filters.cropTypes.length && !filters.cropTypes.includes(p.cropType)) return false;
	if (filters.technicians.length && !filters.technicians.includes(p.assignedTechnician)) return false;
	if (filters.syncStatuses.length && !filters.syncStatuses.includes(p.syncStatus)) return false;
	return true;
}

export function visibleParcels(parcels: ParcelAsset[], filters: ActiveFilters, search: string): ParcelAsset[] {
	const q = search.trim().toLowerCase();
	return parcels.filter(p => parcelPassesFilters(p, filters) && parcelMatchesSearch(p, q));
}

export function assetPassesFilters(
	asset: FieldMarkerAsset,
	filters: ActiveFilters,
	visibleParcelIds: Set<string>
): boolean {
	const a = asset.properties;
	if (!filters.visibleLayers[assetLayerKey[a.assetType]]) return false;
	if (filters.technicians.length && !filters.technicians.includes(a.assignedTechnician)) return false;
	if (filters.syncStatuses.length && !filters.syncStatuses.includes(a.syncStatus)) return false;
	// Hide markers whose linked parcel is filtered out by status/crop.
	if ((filters.statuses.length || filters.cropTypes.length) && !visibleParcelIds.has(a.linkedParcelId)) return false;
	return true;
}

export function visibleAssets(
	assets: FieldMarkerAsset[],
	filters: ActiveFilters,
	search: string,
	visibleParcelIds: Set<string>
): FieldMarkerAsset[] {
	const q = search.trim().toLowerCase();
	return assets.filter(a => assetPassesFilters(a, filters, visibleParcelIds) && assetMatchesSearch(a, q));
}

export interface OperationalSummary {
	total: number;
	needsInspection: number;
	maintenance: number;
	critical: number;
	unsynced: number;
}

export function operationalSummary(parcels: ParcelAsset[], syncEvents: SyncEvent[]): OperationalSummary {
	return {
		total: parcels.length,
		needsInspection: parcels.filter(p => p.properties.status === "inspection_due").length,
		maintenance: parcels.filter(p => p.properties.status === "maintenance_required").length,
		critical: parcels.filter(p => p.properties.status === "blocked").length,
		unsynced: syncEvents.filter(e => e.status !== "synced").length
	};
}

export const pendingSyncCount = (syncEvents: SyncEvent[]): number =>
	syncEvents.filter(e => e.status === "pending" || e.status === "local_draft" || e.status === "failed").length;

/** Quick-filter presets used by the top bar chips. */
export type QuickFilter = "due_today" | "maintenance" | "unsynced" | "critical";
