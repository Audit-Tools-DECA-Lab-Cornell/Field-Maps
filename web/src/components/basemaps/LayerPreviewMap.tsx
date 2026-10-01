"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import type { CSSProperties } from "react";
import { useEffect, useMemo } from "react";
import { GeoJSON, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";

import { PaletteGround } from "@/components/maps/PaletteGround";
import { MAP_PALETTES, MAP_TILES, useMapPalette } from "@/lib/map-palette";
import { analyzeLayer, type BBox, unionBbox, zoneLabel } from "@/lib/packages";
import type { FeatureCollection } from "@/types/geojson";

/**
 * The instant preview a manager sees as soon as their dropped layers parse — before anything is
 * sent anywhere. It draws exactly what `packages.ts` read from the files, over the CARTO tiles the
 * active map palette names — the same palette `LeafletCanvas` draws with, so the QGIS source reads
 * in the same two lights a manager already has a switch for.
 *
 * Paint below is literal hex for the reason `@/lib/map-palette` already states: Leaflet hands path
 * options to canvas/SVG attributes in JavaScript, which cannot read a CSS custom property. Every
 * value here is read from the palette rather than written down a second time.
 */

function bboxToBounds(bbox: BBox): L.LatLngBoundsExpression {
	const [west, south, east, north] = bbox;
	return [
		[south, west],
		[north, east]
	];
}

/** Fits the view to whatever has parsed so far, and again whenever more of it arrives. */
function FitLayers({ bbox }: { readonly bbox: BBox | null }) {
	const map = useMap();
	useEffect(() => {
		map.attributionControl?.setPrefix(false);
		if (bbox === null) return;
		map.invalidateSize({ animate: false });
		map.fitBounds(bboxToBounds(bbox), { padding: [24, 24], animate: false });
	}, [map, bbox]);
	return null;
}

export default function LayerPreviewMap({
	ground,
	zones,
	paths,
	trees
}: {
	readonly ground?: FeatureCollection;
	readonly zones?: FeatureCollection;
	readonly paths?: FeatureCollection;
	readonly trees?: FeatureCollection;
}) {
	const [paletteName] = useMapPalette();
	const palette = MAP_PALETTES[paletteName];
	const tiles = MAP_TILES[palette.tiles];

	const bbox = useMemo(() => {
		const boxes = [ground, zones, paths, trees]
			.filter((layer): layer is FeatureCollection => layer !== undefined)
			.map(layer => analyzeLayer(layer).bbox)
			.filter((box): box is BBox => box !== null);
		return boxes.length === 0 ? null : boxes.reduce((a, b) => unionBbox(a, b));
	}, [ground, zones, paths, trees]);

	return (
		<MapContainer
			center={[0, 0]}
			zoom={2}
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
			<TileLayer
				key={palette.tiles}
				url={tiles.url}
				subdomains={tiles.subdomains}
				attribution={tiles.attribution}
				maxZoom={20}
			/>

			{ground !== undefined && (
				<GeoJSON
					key={`ground-${ground.features.length}`}
					data={ground as never}
					style={{ stroke: true, weight: 2, color: palette.site.edge, fill: false }}
				/>
			)}

			{paths !== undefined && (
				<GeoJSON
					key={`paths-${paths.features.length}`}
					data={paths as never}
					style={{ color: palette.path.line, weight: 3, opacity: 1, lineCap: "round" }}
				/>
			)}

			{zones !== undefined &&
				zones.features.map((feature, index) => {
					if (feature.geometry.type !== "Polygon") return null;
					const ring = feature.geometry.coordinates[0] ?? [];
					const positions: L.LatLngExpression[] = ring.map(position => [position[1] ?? 0, position[0] ?? 0]);
					return (
						<Polygon
							key={`zone-${index}`}
							positions={positions}
							interactive={false}
							pathOptions={{
								color: palette.zone.edge,
								weight: 1.5,
								fillColor: palette.zone.fill,
								fillOpacity: palette.zone.fillOpacity
							}}>
							<Tooltip direction="center" permanent className="zone-label">
								{zoneLabel(feature.properties, index)}
							</Tooltip>
						</Polygon>
					);
				})}

			{trees !== undefined &&
				trees.features.map((feature, index) => {
					if (feature.geometry.type !== "Point") return null;
					const [lng, lat] = feature.geometry.coordinates;
					if (lng === undefined || lat === undefined) return null;
					return (
						<Marker
							key={`tree-${index}`}
							position={[lat, lng]}
							interactive={false}
							keyboard={false}
							icon={L.divIcon({
								className: "",
								iconSize: [10, 10],
								iconAnchor: [5, 5],
								html: `<span style="display:block;width:10px;height:10px;border-radius:50%;background:${palette.observation.fill};border:1.5px solid ${palette.observation.ring}"></span>`
							})}
						/>
					);
				})}

			<FitLayers bbox={bbox} />
			<PaletteGround colour={palette.background} />
		</MapContainer>
	);
}
