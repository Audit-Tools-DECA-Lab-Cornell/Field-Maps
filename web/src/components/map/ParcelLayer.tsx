"use client";

import { CircleMarker, Polygon, Tooltip } from "react-leaflet";

import { formatDate } from "@/lib/dateFormat";
import { visibleParcels } from "@/lib/filters";
import { lngLatToLatLng, openRing, outerRing, polygonCenterLatLng } from "@/lib/geometry";
import { cropLabel, parcelStatusLabel } from "@/lib/labels";
import { parcelStatusStyle, POLYGON_BASE, POLYGON_SELECTED, riskColor } from "@/lib/mapStyles";
import { useOperationsStore } from "@/state/useOperationsStore";

export function ParcelLayer() {
	const parcels = useOperationsStore(s => s.parcels);
	const filters = useOperationsStore(s => s.filters);
	const search = useOperationsStore(s => s.search);
	const selectedParcelId = useOperationsStore(s => s.selection.selectedParcelId);
	const mapMode = useOperationsStore(s => s.selection.mapMode);
	const editingId = useOperationsStore(s => s.geometryEdit.parcelId);
	const selectParcel = useOperationsStore(s => s.selectParcel);

	if (!filters.visibleLayers.parcels) return null;
	const list = visibleParcels(parcels, filters, search);
	const heat = filters.visibleLayers.inspectionHeatOverlay;

	return (
		<>
			{list.map(p => {
				// The parcel currently being geometry-edited is drawn by GeometryEditLayer.
				if (mapMode === "edit_geometry" && p.id === editingId) return null;
				const ring = openRing(outerRing(p.geometry.coordinates)).map(lngLatToLatLng);
				const isSel = p.id === selectedParcelId;
				const style = parcelStatusStyle[p.properties.status];
				return (
					<Polygon
						key={p.id}
						positions={ring}
						bubblingMouseEvents={false}
						pathOptions={{
							color: style.color,
							fillColor: style.fillColor,
							...(isSel ? POLYGON_SELECTED : POLYGON_BASE)
						}}
						eventHandlers={{ click: () => selectParcel(p.id) }}>
						<Tooltip sticky className="fo-map-tooltip">
							<b>
								{p.properties.parcelId} · {p.properties.name}
							</b>
							<br />
							{parcelStatusLabel[p.properties.status]} · {cropLabel[p.properties.cropType]}
							<br />
							Last inspection {formatDate(p.properties.lastInspectionDate)}
						</Tooltip>
					</Polygon>
				);
			})}

			{heat &&
				list.map(p => {
					const c = polygonCenterLatLng(p.geometry.coordinates);
					return (
						<CircleMarker
							key={`heat-${p.id}`}
							center={c}
							radius={8 + (p.properties.riskScore / 100) * 26}
							interactive={false}
							pathOptions={{
								color: riskColor[p.properties.riskLevel],
								fillColor: riskColor[p.properties.riskLevel],
								fillOpacity: 0.22,
								weight: 0
							}}
						/>
					);
				})}
		</>
	);
}
