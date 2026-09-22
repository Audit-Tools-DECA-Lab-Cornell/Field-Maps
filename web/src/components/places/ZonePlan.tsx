import { GROUND, PATHS } from "@/data/site-geometry";
import type { Zone } from "@/types/domain";

/**
 * A plan of a site's zones, drawn from the same geometry the collector carries. It is a diagram,
 * not a map: nothing is fetched, and the only projection is an equirectangular fit to the site's
 * own extent, with longitude scaled by cos(latitude) so a square zone stays square. Every site
 * draws the same ground at the same scale, so two plans side by side can be compared.
 */

const site = GROUND.features.find(feature => feature.properties.kind === "site");
const structures = GROUND.features.filter(feature => feature.properties.kind === "structure");

function bbox(): { west: number; east: number; south: number; north: number } {
	const ring = site?.geometry.type === "Polygon" ? site.geometry.coordinates[0]! : [];
	const longitudes = ring.map(position => position[0]!);
	const latitudes = ring.map(position => position[1]!);
	return {
		west: Math.min(...longitudes),
		east: Math.max(...longitudes),
		south: Math.min(...latitudes),
		north: Math.max(...latitudes)
	};
}

const EXTENT = bbox();
const PAD = (EXTENT.east - EXTENT.west) * 0.04;
const COS_LAT = Math.cos(((EXTENT.north + EXTENT.south) / 2) * (Math.PI / 180));

// Metres, near enough, so the viewBox carries the site's real proportions.
const WIDTH = (EXTENT.east - EXTENT.west + PAD * 2) * COS_LAT * 111_320;
const HEIGHT = (EXTENT.north - EXTENT.south + PAD * 2) * 111_320;

const x = (longitude: number) => (longitude - EXTENT.west + PAD) * COS_LAT * 111_320;
// SVG y grows downward; north is up.
const y = (latitude: number) => (EXTENT.north + PAD - latitude) * 111_320;

const points = (ring: readonly number[][]) => ring.map(position => `${x(position[0]!)},${y(position[1]!)}`).join(" ");

export function ZonePlan({ zones }: { readonly zones: readonly Zone[] }) {
	return (
		<svg
			viewBox={`0 0 ${WIDTH.toFixed(1)} ${HEIGHT.toFixed(1)}`}
			preserveAspectRatio="xMidYMid meet"
			role="img"
			aria-label={`Plan of ${zones.length === 1 ? "one zone" : `${zones.length} zones`}: ${zones.map(zone => zone.label).join(", ")}`}
			className="h-40 w-full rounded-md bg-map">
			{site?.geometry.type === "Polygon" && (
				<polygon
					points={points(site.geometry.coordinates[0]!)}
					fill="#20233a"
					stroke="#2f3350"
					strokeWidth="1"
					vectorEffect="non-scaling-stroke"
				/>
			)}
			{structures.map((structure, index) =>
				structure.geometry.type === "Polygon" ? (
					<polygon
						key={index}
						points={points(structure.geometry.coordinates[0]!)}
						fill="#24273a"
						stroke="#4a4e5e"
						strokeWidth="1"
						vectorEffect="non-scaling-stroke"
					/>
				) : null
			)}
			{PATHS.features.map((path, index) =>
				path.geometry.type === "LineString" ? (
					<polyline
						key={index}
						points={points(path.geometry.coordinates)}
						fill="none"
						stroke="#2f3243"
						strokeWidth="5"
						strokeLinecap="round"
						vectorEffect="non-scaling-stroke"
					/>
				) : null
			)}
			{zones.map(zone => (
				<g key={zone.id}>
					<rect
						x={x(zone.west)}
						y={y(zone.north)}
						width={x(zone.east) - x(zone.west)}
						height={y(zone.south) - y(zone.north)}
						fill="#9184d9"
						fillOpacity={0.12}
						stroke="#b5abfc"
						strokeWidth="1"
						strokeDasharray="4 4"
						vectorEffect="non-scaling-stroke"
					/>
					<text
						x={(x(zone.west) + x(zone.east)) / 2}
						y={(y(zone.north) + y(zone.south)) / 2}
						textAnchor="middle"
						dominantBaseline="central"
						fill="#9397ab"
						fontSize="14"
						fontWeight="500">
						{zone.id}
					</text>
				</g>
			))}
		</svg>
	);
}
