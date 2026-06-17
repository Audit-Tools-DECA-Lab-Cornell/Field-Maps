"use client";

import { MapContainer, TileLayer } from "react-leaflet";

import { REGION_CENTER, REGION_ZOOM } from "@/data/parcels";
import { BASEMAPS } from "@/lib/themes";
import { useOperationsStore } from "@/state/useOperationsStore";

import { AssetMarkerLayer } from "./AssetMarkerLayer";
import { GeometryEditLayer } from "./GeometryEditLayer";
import { MapController } from "./MapController";
import { ParcelLayer } from "./ParcelLayer";

export default function LeafletMap() {
	const theme = useOperationsStore(s => s.theme);
	const basemap = BASEMAPS[theme];

	return (
		<MapContainer
			center={REGION_CENTER}
			zoom={REGION_ZOOM}
			scrollWheelZoom
			zoomControl
			style={{ height: "100%", width: "100%" }}>
			{/* keyed by theme so the basemap swaps cleanly when the theme changes */}
			<TileLayer
				key={theme}
				attribution={basemap.attribution}
				url={basemap.url}
				subdomains={basemap.subdomains}
				maxZoom={19}
			/>
			<ParcelLayer />
			<AssetMarkerLayer />
			<GeometryEditLayer />
			<MapController />
		</MapContainer>
	);
}
