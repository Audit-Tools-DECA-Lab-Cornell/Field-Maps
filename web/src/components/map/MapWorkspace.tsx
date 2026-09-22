"use client";

import dynamic from "next/dynamic";

import { Icon } from "@/components/shared/Icon";
import { useOperationsStore } from "@/state/useOperationsStore";

import { MapControls } from "./MapControls";
import { MapLegend } from "./MapLegend";

// Leaflet touches window/document, so the map must be client-only.
const LeafletMap = dynamic(() => import("./LeafletMap"), {
	ssr: false,
	loading: () => (
		<div
			style={{
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				color: "var(--text-3)",
				background: "var(--map-bg)",
				fontSize: 13
			}}>
			Loading map…
		</div>
	)
});

export function MapWorkspace() {
	const mapMode = useOperationsStore(s => s.selection.mapMode);
	const editing = mapMode === "edit_geometry";

	return (
		<div style={{ position: "relative", width: "100%", height: "100%" }}>
			<LeafletMap />
			<MapControls />
			<MapLegend />

			{/* basemap label */}
			<div
				style={{
					position: "absolute",
					bottom: 14,
					right: 12,
					zIndex: 1000,
					padding: "3px 8px",
					background: "color-mix(in srgb, var(--surface) 85%, transparent)",
					border: "1px solid var(--border)",
					borderRadius: "var(--r-sm)",
					fontSize: 10.5,
					fontWeight: 600,
					color: "var(--text-2)"
				}}>
				Basemap · OpenStreetMap
			</div>

			{editing && (
				<div
					style={{
						position: "absolute",
						top: 12,
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 1000,
						display: "flex",
						alignItems: "center",
						gap: 8,
						padding: "7px 14px",
						background: "var(--accent)",
						color: "var(--accent-contrast)",
						borderRadius: 99,
						fontSize: 12,
						fontWeight: 650,
						boxShadow: "var(--shadow-md)"
					}}>
					<Icon name="boundary" size={14} />
					Boundary Edit Mode — drag handles, then Save or Cancel in the inspector
				</div>
			)}
		</div>
	);
}
