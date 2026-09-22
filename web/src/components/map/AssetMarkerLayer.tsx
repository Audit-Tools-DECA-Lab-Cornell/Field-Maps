"use client";

import L from "leaflet";
import { useMemo } from "react";
import { Marker, Tooltip } from "react-leaflet";

import { visibleAssets, visibleParcels } from "@/lib/filters";
import { assetStatusLabel, assetTypeLabel } from "@/lib/labels";
import { assetMarkerStyle } from "@/lib/mapStyles";
import { useOperationsStore } from "@/state/useOperationsStore";
import type { AssetStatus, AssetType } from "@/types/domain";

function makeIcon(type: AssetType, selected: boolean): L.DivIcon {
	const { color, glyph } = assetMarkerStyle[type];
	const flag = type === "maintenance_flag";
	const ring = selected ? "box-shadow:0 0 0 3px color-mix(in srgb, var(--accent) 60%, transparent);" : "";
	return L.divIcon({
		className: "",
		html: `<div class="fo-marker ${flag ? "fo-marker--flag" : ""}" style="width:22px;height:22px;background:${color};${ring}">${glyph}</div>`,
		iconSize: [22, 22],
		iconAnchor: [11, 11]
	});
}

export function AssetMarkerLayer() {
	const assets = useOperationsStore(s => s.assets);
	const parcels = useOperationsStore(s => s.parcels);
	const filters = useOperationsStore(s => s.filters);
	const search = useOperationsStore(s => s.search);
	const selectedId = useOperationsStore(s => s.selection.selectedEntityId);
	const selectedType = useOperationsStore(s => s.selection.selectedEntityType);
	const selectAsset = useOperationsStore(s => s.selectAsset);

	const list = useMemo(() => {
		const visParcelIds = new Set(visibleParcels(parcels, filters, search).map(p => p.id));
		return visibleAssets(assets, filters, search, visParcelIds);
	}, [assets, parcels, filters, search]);

	return (
		<>
			{list.map(a => {
				const [lng, lat] = a.geometry.coordinates;
				const isSel = selectedType === "asset" && a.id === selectedId;
				return (
					<Marker
						key={a.id}
						position={[lat, lng]}
						icon={makeIcon(a.properties.assetType, isSel)}
						bubblingMouseEvents={false}
						eventHandlers={{ click: () => selectAsset(a.id) }}>
						<Tooltip direction="top" offset={[0, -12]} className="fo-map-tooltip">
							<b>{a.properties.name}</b>
							<br />
							{assetTypeLabel[a.properties.assetType]} ·{" "}
							{assetStatusLabel[a.properties.status as AssetStatus]}
						</Tooltip>
					</Marker>
				);
			})}
		</>
	);
}
