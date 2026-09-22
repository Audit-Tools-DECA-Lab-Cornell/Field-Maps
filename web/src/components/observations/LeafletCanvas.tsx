"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { GeoJSON, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";

import { GROUND, PATHS, PLAN_PAINT, TREES, ZONE_EXTENT, ZONES } from "@/data/site-geometry";
import { boxToLatLngs } from "@/lib/geometry";
import type { Observation } from "@/types/domain";

import { MARKER_SIZE, markerHtml } from "./markers";

/**
 * The map, drawn on the collector's own plan base.
 *
 * The plan base is the bundled geometry from `data/site-geometry.ts` — the same polygons the
 * observer sees, in the same paint, fetched from nowhere. Street tiles are the alternative, and
 * they are the only thing on this screen that needs a network.
 */

export type BaseName = "plan" | "streets";

const STREETS = {
	url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
	subdomains: "abcd",
	attribution:
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
};

/**
 * Leaflet measures its pane once, on mount, and this one is laid out by flexbox after that. Fit
 * the site when the pane settles and again whenever it changes size, or the map opens showing a
 * postage stamp of the site in the middle of an empty ground.
 */
function FitSite() {
	const map = useMap();
	useEffect(() => {
		map.attributionControl?.setPrefix(false);
		const fit = () => {
			map.invalidateSize({ animate: false });
			map.fitBounds(ZONE_EXTENT as unknown as L.LatLngBoundsExpression, { padding: [24, 24], animate: false });
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(map.getContainer());
		return () => observer.disconnect();
	}, [map]);
	return null;
}

/** Keeps the view on the selected record without fighting a reader who has panned away. */
function Recentre({ selected }: { readonly selected: Observation | undefined }) {
	const map = useMap();
	useEffect(() => {
		if (selected === undefined) return;
		const point = L.latLng(selected.latitude, selected.longitude);
		if (!map.getBounds().contains(point)) map.panTo(point, { animate: false });
	}, [map, selected]);
	return null;
}

export default function LeafletCanvas({
	records,
	selectedId,
	onSelect,
	base
}: {
	readonly records: readonly Observation[];
	readonly selectedId: string | null;
	readonly onSelect: (id: string) => void;
	readonly base: BaseName;
}) {
	const selected = records.find(record => record.id === selectedId);

	return (
		<MapContainer
			bounds={ZONE_EXTENT as unknown as L.LatLngBoundsExpression}
			scrollWheelZoom
			zoomControl
			maxZoom={22}
			zoomSnap={0}
			zoomDelta={0.5}
			className="size-full"
			style={{ background: "var(--color-map)" }}>
			{base === "streets" ? (
				<TileLayer
					url={STREETS.url}
					subdomains={STREETS.subdomains}
					attribution={STREETS.attribution}
					maxZoom={20}
				/>
			) : (
				<>
					<GeoJSON
						key="ground"
						data={GROUND as never}
						attribution="Bundled training geometry · nothing fetched"
						style={feature => ({
							stroke: true,
							weight: 1,
							color:
								feature?.properties?.kind === "site" ? PLAN_PAINT.siteEdge : PLAN_PAINT.structureEdge,
							fillColor: feature?.properties?.kind === "site" ? PLAN_PAINT.site : PLAN_PAINT.structure,
							fillOpacity: 1
						})}
					/>
					<GeoJSON
						key="paths"
						data={PATHS as never}
						style={{ color: PLAN_PAINT.path, weight: 7, opacity: 1, lineCap: "round" }}
					/>
					{TREES.map(([longitude, latitude]) => (
						<Marker
							key={`${longitude},${latitude}`}
							position={[latitude, longitude]}
							interactive={false}
							keyboard={false}
							icon={L.divIcon({
								className: "",
								iconSize: [12, 12],
								iconAnchor: [6, 6],
								html: `<span style="display:block;width:12px;height:12px;border-radius:50%;background:${PLAN_PAINT.tree}"></span>`
							})}
						/>
					))}
				</>
			)}

			{ZONES.map(zone => (
				<Polygon
					key={zone.id}
					positions={boxToLatLngs(zone)}
					interactive={false}
					pathOptions={{
						color: PLAN_PAINT.zoneEdge,
						weight: 1,
						dashArray: "4 4",
						fillColor: PLAN_PAINT.zone,
						fillOpacity: PLAN_PAINT.zoneFillOpacity
					}}>
					<Tooltip direction="center" permanent className="zone-label">
						{zone.id}
					</Tooltip>
				</Polygon>
			))}

			{records.map(record => (
				<Marker
					key={record.id}
					position={[record.latitude, record.longitude]}
					alt={`${record.id}, ${record.playType}, zone ${record.zoneId}, round ${record.round}`}
					riseOnHover
					eventHandlers={{ click: () => onSelect(record.id) }}
					icon={L.divIcon({
						className: "",
						iconSize: [MARKER_SIZE, MARKER_SIZE],
						iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
						html: markerHtml(record.playType, record.state, record.id === selectedId)
					})}
				/>
			))}

			<FitSite />
			<Recentre selected={selected} />
		</MapContainer>
	);
}
