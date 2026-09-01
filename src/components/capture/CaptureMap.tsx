"use client";

import L, { type LeafletMouseEvent } from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

import { parcels, REGION_CENTER, REGION_ZOOM } from "@/data/parcels";
import { openRing, outerRing } from "@/lib/geometry";
import { parcelStatusStyle } from "@/lib/mapStyles";
import type { ObservationPoint } from "@/types/capture";

function MapResizer({ active }: { active: boolean }) {
	const map = useMap();
	useEffect(() => {
		if (!active) return;
		const first = window.setTimeout(() => map.invalidateSize(), 80);
		const settled = window.setTimeout(() => map.invalidateSize(), 320);
		return () => {
			window.clearTimeout(first);
			window.clearTimeout(settled);
		};
	}, [active, map]);
	return null;
}

function CaptureEvents({ enabled, onPoint }: { enabled: boolean; onPoint: (coordinates: [number, number]) => void }) {
	useMapEvents({
		click: event => {
			if (enabled) onPoint([event.latlng.lng, event.latlng.lat]);
		}
	});
	return null;
}

function pointIcon(kind: ObservationPoint["properties"]["kind"], queued: boolean) {
	const glyph = kind === "tree" ? "T" : kind === "irrigation" ? "I" : kind === "play_area" ? "P" : "•";
	return L.divIcon({
		className: "",
		html: `<div class="capture-point ${queued ? "is-queued" : "is-synced"}">${glyph}</div>`,
		iconSize: [28, 28],
		iconAnchor: [14, 14]
	});
}

const draftIcon = L.divIcon({
	className: "",
	html: '<div class="capture-draft-point"><span></span></div>',
	iconSize: [56, 56],
	iconAnchor: [28, 28]
});

export default function CaptureMap({
	online,
	active,
	isPlacing,
	draftCoordinates,
	observations,
	onPoint
}: {
	online: boolean;
	active: boolean;
	isPlacing: boolean;
	draftCoordinates: [number, number] | null;
	observations: ObservationPoint[];
	onPoint: (coordinates: [number, number]) => void;
}) {
	const observationIcons = useMemo(
		() =>
			new Map(
				observations.map(item => [
					item.id,
					pointIcon(item.properties.kind, item.properties.syncStatus === "queued")
				])
			),
		[observations]
	);

	const placeFromShape = (event: LeafletMouseEvent) => {
		if (isPlacing) onPoint([event.latlng.lng, event.latlng.lat]);
	};

	return (
		<MapContainer
			center={REGION_CENTER}
			zoom={REGION_ZOOM}
			zoomControl
			scrollWheelZoom
			attributionControl={online}
			className={`field-capture-map ${online ? "" : "is-offline"} ${isPlacing ? "is-placing" : ""}`}>
			{online && (
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					maxZoom={19}
				/>
			)}

			{parcels.map(parcel => {
				const positions = openRing(outerRing(parcel.geometry.coordinates)).map(
					([longitude, latitude]) => [latitude, longitude] as [number, number]
				);
				const style = parcelStatusStyle[parcel.properties.status];
				return (
					<Polygon
						key={parcel.id}
						positions={positions}
						pathOptions={{
							color: online ? style.color : "#72b4a6",
							fillColor: online ? style.fillColor : "#2a5b52",
							fillOpacity: online ? 0.36 : 0.42,
							weight: 2
						}}
						eventHandlers={{ click: placeFromShape }}>
						<Tooltip sticky className="fo-map-tooltip">
							<b>{parcel.properties.name}</b>
							<br />
							{parcel.properties.parcelId} · tap to place while collecting
						</Tooltip>
					</Polygon>
				);
			})}

			{observations.map(observation => {
				const [longitude, latitude] = observation.geometry.coordinates;
				return (
					<Marker
						key={observation.id}
						position={[latitude, longitude]}
						icon={observationIcons.get(observation.id)!}>
						<Tooltip direction="top" offset={[0, -15]} className="fo-map-tooltip">
							<b>{observation.id}</b>
							<br />
							{observation.properties.kind.replaceAll("_", " ")} ·{" "}
							{observation.properties.condition.replaceAll("_", " ")}
						</Tooltip>
					</Marker>
				);
			})}

			{draftCoordinates && (
				<Marker position={[draftCoordinates[1], draftCoordinates[0]]} icon={draftIcon} interactive={false} />
			)}

			<CaptureEvents enabled={isPlacing} onPoint={onPoint} />
			<MapResizer active={active} />
		</MapContainer>
	);
}
