import { useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { mapPalettes } from "../../maps/palette";
import { type Theme, useStyles } from "../../ui";
import { type PlanPoint, RIVERSIDE_PLAN, WELCOME_MARKERS, WELCOME_VIEW } from "./plan";

/** Hairlines, zone dashes and markers, in points on screen: they keep their size whatever the width. */
const STROKE = { site: 1.25, surface: 0.75, built: 1, tree: 0.75, pathEdge: 1.5 } as const;
const ZONE = { width: 1.5, dash: [5, 3.5] } as const;
/** An observation marker: a violet dot in a white ring, with a dark core (the web's plain marker). */
const MARKER = { radius: 5, ring: 1.6, core: 1.7 } as const;

/** The plan's width before the first layout, close to a phone's: only the first frame uses it. */
const ASSUMED_WIDTH = 350;

const ASPECT = WELCOME_VIEW.width / WELCOME_VIEW.height;

function ringPath(points: readonly PlanPoint[]): string {
  return `${linePath(points)} Z`;
}

function linePath(points: readonly PlanPoint[]): string {
  return points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
}

function planStyles(t: Theme) {
  return StyleSheet.create({
    frame: {
      aspectRatio: ASPECT,
      borderRadius: t.radius.thumb,
      borderWidth: t.size.border,
      borderColor: t.c.line,
      overflow: "hidden",
    },
  });
}

/**
 * Riverside as the welcome screen draws it (Mobile 23): the Day plan with its three zones dashed and
 * fourteen observation markers, and no controls. The plan keeps the Day map palette in Dusk too: the
 * screen theme never recolours a map (rule 03), and only its frame follows the theme.
 */
export function AuthPlan() {
  const s = useStyles(planStyles);
  const palette = mapPalettes.day;
  const plan = RIVERSIDE_PLAN;
  const [width, setWidth] = useState(ASSUMED_WIDTH);
  // Plan units per point on screen, so strokes, dashes and markers can be set in points.
  const unit = WELCOME_VIEW.width / Math.max(width, 1);
  const px = (points: number) => points * unit;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0 && next !== width) setWidth(next);
  };

  return (
    <View
      style={s.frame}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Riverside · Day plan, a sample site with three zones and 14 observations."
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={`${WELCOME_VIEW.x} ${WELCOME_VIEW.y} ${WELCOME_VIEW.width} ${WELCOME_VIEW.height}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <Rect x={0} y={0} width={plan.width} height={plan.height} fill={palette.background} />
        {plan.site.map((shape) => (
          <Path
            key={shape.id}
            d={ringPath(shape.points)}
            fill={palette.site.fill}
            stroke={palette.site.edge}
            strokeWidth={px(STROKE.site)}
            strokeLinejoin="round"
          />
        ))}
        {plan.surfaces.map((shape) => {
          const swatch =
            palette.surfaces[shape.kind as keyof typeof palette.surfaces] ?? palette.surfaces.grass;
          return (
            <Path
              key={shape.id}
              d={ringPath(shape.points)}
              fill={swatch.fill}
              stroke={swatch.edge}
              strokeWidth={px(STROKE.surface)}
              strokeLinejoin="round"
            />
          );
        })}
        {/* Every path's edge first, then every fill, so the junctions merge. */}
        {plan.paths.map((shape) => (
          <Path
            key={`${shape.id}-edge`}
            d={linePath(shape.points)}
            fill="none"
            stroke={palette.path.line}
            strokeWidth={(shape.width ?? 0) + px(STROKE.pathEdge) * 2}
            strokeLinejoin="miter"
          />
        ))}
        {plan.paths.map((shape) => (
          <Path
            key={shape.id}
            d={linePath(shape.points)}
            fill="none"
            stroke={palette.surfaces.path.fill}
            strokeWidth={shape.width ?? 0}
            strokeLinejoin="miter"
          />
        ))}
        {plan.structures.map((shape) => (
          <Path
            key={shape.id}
            d={ringPath(shape.points)}
            fill={palette.structure.fill}
            stroke={palette.structure.edge}
            strokeWidth={px(STROKE.built)}
          />
        ))}
        {plan.equipment.map((shape) => (
          <Path
            key={shape.id}
            d={ringPath(shape.points)}
            fill={palette.equipment.fill}
            stroke={palette.equipment.edge}
            strokeWidth={px(STROKE.built)}
          />
        ))}
        <G opacity={palette.tree.opacity}>
          {plan.trees.map((tree) => (
            <Circle
              key={tree.id}
              cx={tree.center[0]}
              cy={tree.center[1]}
              r={tree.radius}
              fill={palette.tree.fill}
              stroke={palette.tree.edge}
              strokeWidth={px(STROKE.tree)}
            />
          ))}
        </G>
        {plan.zones.map((zone) => (
          <Path
            key={zone.id}
            d={ringPath(zone.points)}
            fill={palette.zone.fill}
            fillOpacity={palette.zone.fillOpacity}
            stroke={palette.zone.edge}
            strokeWidth={px(ZONE.width)}
            strokeDasharray={ZONE.dash.map(px)}
            strokeLinejoin="round"
          />
        ))}
        {WELCOME_MARKERS.map(([x, y]) => (
          <G key={`${x}-${y}`}>
            <Circle
              cx={x}
              cy={y}
              r={px(MARKER.radius)}
              fill={palette.observation.fill}
              stroke={palette.observation.ring}
              strokeWidth={px(MARKER.ring)}
            />
            <Circle cx={x} cy={y} r={px(MARKER.core)} fill={palette.observation.selected} />
          </G>
        ))}
      </Svg>
    </View>
  );
}
