"use client";

import L from "leaflet";
import { Marker, Polygon } from "react-leaflet";

import { edgeMidpointsLatLng, lngLatToLatLng, openRing, outerRing } from "@/lib/geometry";
import { ACCENT_HEX } from "@/lib/themes";
import { useOperationsStore } from "@/state/useOperationsStore";

const vertexIcon = (selected: boolean) =>
	L.divIcon({
		className: "",
		html: `<div class="fo-vertex ${selected ? "is-selected" : ""}" style="width:15px;height:15px"></div>`,
		iconSize: [15, 15],
		iconAnchor: [7.5, 7.5]
	});

const midIcon = L.divIcon({
	className: "",
	html: `<div class="fo-midpoint" style="width:11px;height:11px"></div>`,
	iconSize: [11, 11],
	iconAnchor: [5.5, 5.5]
});

export function GeometryEditLayer() {
	const mapMode = useOperationsStore(s => s.selection.mapMode);
	const draft = useOperationsStore(s => s.geometryEdit.draftCoordinates);
	const selectedVertex = useOperationsStore(s => s.geometryEdit.selectedVertexIndex);
	const moveDraftVertex = useOperationsStore(s => s.moveDraftVertex);
	const addDraftMidpoint = useOperationsStore(s => s.addDraftMidpoint);
	const selectVertex = useOperationsStore(s => s.selectVertex);
	const theme = useOperationsStore(s => s.theme);
	const accent = ACCENT_HEX[theme];

	if (mapMode !== "edit_geometry" || !draft) return null;

	const open = openRing(outerRing(draft)); // [lng, lat][]
	const verts = open.map(lngLatToLatLng); // [lat, lng][]
	const mids = edgeMidpointsLatLng(open); // [lat, lng][]

	return (
		<>
			<Polygon
				positions={verts}
				interactive={false}
				pathOptions={{
					color: accent,
					fillColor: accent,
					weight: 2.5,
					fillOpacity: 0.12,
					dashArray: "5 5"
				}}
			/>
			{mids.map((m, i) => (
				<Marker
					key={`mid-${i}`}
					position={m}
					icon={midIcon}
					bubblingMouseEvents={false}
					eventHandlers={{ click: () => addDraftMidpoint(i) }}
				/>
			))}
			{verts.map((v, i) => (
				<Marker
					key={`vtx-${i}`}
					position={v}
					icon={vertexIcon(i === selectedVertex)}
					draggable
					bubblingMouseEvents={false}
					eventHandlers={{
						dragstart: () => selectVertex(i),
						drag: e => {
							const ll = (e.target as L.Marker).getLatLng();
							moveDraftVertex(i, [ll.lng, ll.lat]);
						},
						click: () => selectVertex(i)
					}}
				/>
			))}
		</>
	);
}
