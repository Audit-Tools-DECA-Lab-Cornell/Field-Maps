import { cx } from "@/lib/cx";
import { MAP_PALETTES } from "@/lib/map-palette";

/*
 * The home page's plan: the DECA Mark opened out into a site map. The zones, the path and the point
 * keep the app icon's geometry (`mobile/src/ui/brand-artwork.ts`, in its 1024-unit space) and the plan is
 * drawn the way `components/map/SitePlan` draws a real site: Day palette, dashed zone edges, a path with
 * an outline, one selected observation. It names no site, zone or record, so nothing on it reads as
 * someone's data.
 */

const ZONES = [
	{ x: 268, y: 330, width: 224, height: 420 },
	{ x: 548, y: 274, width: 208, height: 236 },
	{ x: 548, y: 566, width: 172, height: 150 }
] as const;

const ZONE_CORNER = 52;
const PATH = "M250 700 C 380 690, 430 560, 520 538 S 700 420, 790 300";
const PATH_WIDTH = 26;
/** The point sits on the path inside the tall zone. */
const POINT = { x: 470, y: 562 } as const;

const TREES = [
	{ x: 236, y: 286, r: 26 },
	{ x: 812, y: 470, r: 30 },
	{ x: 786, y: 742, r: 24 },
	{ x: 520, y: 760, r: 20 }
] as const;

export type FieldPlanProps = { className?: string };

export function FieldPlan({ className }: FieldPlanProps) {
	const palette = MAP_PALETTES.day;
	return (
		<svg
			viewBox="180 220 680 580"
			role="img"
			aria-label="A site plan with three zones and one placed observation"
			className={cx("block h-auto w-full", className)}>
			<rect x="180" y="220" width="680" height="580" fill={palette.background} />
			<rect
				x="204"
				y="244"
				width="632"
				height="532"
				rx="20"
				fill={palette.site.fill}
				stroke={palette.site.edge}
				strokeWidth={1.5}
				vectorEffect="non-scaling-stroke"
			/>
			<rect
				x="220"
				y="260"
				width="300"
				height="500"
				rx="14"
				fill={palette.surfaces.grass.fill}
				stroke={palette.surfaces.grass.edge}
				strokeWidth={1}
				vectorEffect="non-scaling-stroke"
			/>
			<rect
				x="536"
				y="554"
				width="196"
				height="174"
				rx="14"
				fill={palette.surfaces.mulch.fill}
				stroke={palette.surfaces.mulch.edge}
				strokeWidth={1}
				vectorEffect="non-scaling-stroke"
			/>
			<rect
				x="604"
				y="336"
				width="96"
				height="64"
				rx="6"
				fill={palette.equipment.fill}
				stroke={palette.equipment.edge}
				strokeWidth={1.25}
				vectorEffect="non-scaling-stroke"
			/>

			{/* The path's outline, then its surface, as on a real plan. */}
			<path d={PATH} fill="none" stroke={palette.path.line} strokeWidth={PATH_WIDTH + 4} strokeLinecap="round" />
			<path
				d={PATH}
				fill="none"
				stroke={palette.surfaces.path.fill}
				strokeWidth={PATH_WIDTH}
				strokeLinecap="round"
			/>

			{TREES.map(tree => (
				<circle
					key={`${tree.x}-${tree.y}`}
					cx={tree.x}
					cy={tree.y}
					r={tree.r}
					fill={palette.tree.fill}
					fillOpacity={palette.tree.opacity}
					stroke={palette.tree.edge}
					strokeWidth={1}
					vectorEffect="non-scaling-stroke"
				/>
			))}

			{ZONES.map(zone => (
				<rect
					key={`${zone.x}-${zone.y}`}
					{...zone}
					rx={ZONE_CORNER}
					fill={palette.zone.fill}
					fillOpacity={palette.zone.fillOpacity}
					stroke={palette.zone.edge}
					strokeWidth={2}
					strokeDasharray="8 5"
					vectorEffect="non-scaling-stroke"
				/>
			))}

			{/* A selected observation, sized as SitePlan's selected marker at about 1.6 times plan scale. */}
			<g transform={`translate(${POINT.x} ${POINT.y})`}>
				<circle r={34} fill="none" stroke={palette.observation.selected} strokeWidth={3.8} />
				<circle r={20} fill={palette.observation.fill} stroke={palette.observation.ring} strokeWidth={5.6} />
				<circle r={6.7} fill={palette.observation.ring} />
			</g>
		</svg>
	);
}
