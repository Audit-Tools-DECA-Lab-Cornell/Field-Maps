"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect, useMemo } from "react";
import { GeoJSON, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap } from "react-leaflet";

import { analyzeLayer, type BBox, unionBbox, zoneLabel } from "@/lib/packages";
import type { FeatureCollection } from "@/types/geojson";

/**
 * The instant preview a manager sees as soon as their dropped layers parse — before anything is
 * sent anywhere. It draws exactly what `packages.ts` read from the files, over the same dark
 * street tiles `LeafletCanvas` draws when it isn't on the collector's bundled plan base — there is
 * no bundled plan for a package that hasn't been prepared yet, so the tile config below is copied
 * from `LeafletCanvas.tsx` rather than inventing a second basemap.
 *
 * Paint below is literal hex for the reason `data/site-geometry.ts` already states: Leaflet hands
 * path options to canvas/SVG attributes in JavaScript, which cannot read a CSS custom property.
 * Each value names the Nocturne token it stands in for.
 */

const STREETS = {
	url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
	subdomains: "abcd",
	attribution:
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
};

const PAINT = {
	/** --color-neutral-500 */
	ground: "#9397ab",
	/** --color-neutral-500 */
	path: "#9397ab",
	/** --color-accent */
	zoneFill: "#9184d9",
	/** --color-accent-400 */
	zoneEdge: "#b5abfc",
	zoneFillOpacity: 0.16,
	/** --color-accent-400 */
	tree: "#b5abfc",
	/** --color-bg, a ring so a tree reads over either the tiles or a zone fill */
	treeRing: "#161826"
} as const;

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
			style={{ background: "var(--color-map)" }}>
			<TileLayer
				url={STREETS.url}
				subdomains={STREETS.subdomains}
				attribution={STREETS.attribution}
				maxZoom={20}
			/>

			{ground !== undefined && (
				<GeoJSON
					key={`ground-${ground.features.length}`}
					data={ground as never}
					style={{ stroke: true, weight: 2, color: PAINT.ground, fill: false }}
				/>
			)}

			{paths !== undefined && (
				<GeoJSON
					key={`paths-${paths.features.length}`}
					data={paths as never}
					style={{ color: PAINT.path, weight: 3, opacity: 1, lineCap: "round" }}
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
								color: PAINT.zoneEdge,
								weight: 1.5,
								fillColor: PAINT.zoneFill,
								fillOpacity: PAINT.zoneFillOpacity
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
								html: `<span style="display:block;width:10px;height:10px;border-radius:50%;background:${PAINT.tree};border:1.5px solid ${PAINT.treeRing}"></span>`
							})}
						/>
					);
				})}

			<FitLayers bbox={bbox} />
		</MapContainer>
	);
}
