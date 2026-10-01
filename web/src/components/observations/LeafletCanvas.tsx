"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import type { CSSProperties } from "react";
import { useEffect } from "react";
import { GeoJSON, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";

import { PaletteGround } from "@/components/maps/PaletteGround";
import { GROUND, PATHS, TREES, ZONE_EXTENT, ZONES } from "@/data/site-geometry";
import { boxToLatLngs } from "@/lib/geometry";
import { MAP_PALETTES, MAP_TILES, useMapPalette } from "@/lib/map-palette";
import type { Observation } from "@/types/domain";

import { MARKER, markerHtml } from "./markers";

/**
 * The map, drawn on the collector's own plan base.
 *
 * The plan base is the bundled geometry from `data/site-geometry.ts` — the same polygons the
 * observer sees, in the same layout, fetched from nowhere. Street tiles are the alternative, and
 * they are the only thing on this screen that needs a network. Either base takes its colour from
 * the active map palette (`@/lib/map-palette`), not from the Nocturne chrome around it — a research
 * PI reading this against daylight needs a different canvas than the observer reads in the field,
 * and `MapPaletteSwitch` is how they choose it.
 */

export type BaseName = "plan" | "streets";

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
	const [paletteName] = useMapPalette();
	const palette = MAP_PALETTES[paletteName];
	const tiles = MAP_TILES[palette.tiles];

	return (
		<MapContainer
			bounds={ZONE_EXTENT as unknown as L.LatLngBoundsExpression}
			scrollWheelZoom
			zoomControl
			maxZoom={22}
			zoomSnap={0}
			zoomDelta={0.5}
			className="size-full"
			style={
				{
					background: palette.background,
					"--zone-label-color": palette.zone.label
				} as CSSProperties
			}>
			{base === "streets" ? (
				<TileLayer
					key={palette.tiles}
					url={tiles.url}
					subdomains={tiles.subdomains}
					attribution={tiles.attribution}
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
							color: feature?.properties?.kind === "site" ? palette.site.edge : palette.structure.edge,
							fillColor:
								feature?.properties?.kind === "site" ? palette.site.fill : palette.structure.fill,
							fillOpacity: 1
						})}
					/>
					<GeoJSON
						key="paths"
						data={PATHS as never}
						style={{ color: palette.path.line, weight: 7, opacity: 1, lineCap: "round" }}
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
								html: `<span style="display:block;width:12px;height:12px;border-radius:50%;background:${palette.tree.fill};opacity:${palette.tree.opacity};border:1px solid ${palette.tree.edge}"></span>`
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
						color: palette.zone.edge,
						weight: 1,
						dashArray: "4 4",
						fillColor: palette.zone.fill,
						fillOpacity: palette.zone.fillOpacity
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
						iconSize: [MARKER.box, MARKER.box],
						iconAnchor: [MARKER.box / 2, MARKER.box / 2],
						html: markerHtml(record.playType, record.state, record.id === selectedId, palette.observation)
					})}
				/>
			))}

			<FitSite />
			<Recentre selected={selected} />
			<PaletteGround colour={palette.background} />
		</MapContainer>
	);
}
