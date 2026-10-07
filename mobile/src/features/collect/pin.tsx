import { StyleSheet, View } from "react-native";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
} from "react-native-reanimated";
import Svg, { Ellipse, Line, Path } from "react-native-svg";
import type { MapBase } from "../../maps/palette";
import { mapPalettes } from "../../maps/palette";

/**
 * The placement marks, after the iPhone Maps "choose a point" pattern Janet asked for: an × sits
 * exactly on the coordinate, and the pin floats above it with a clear gap, so nothing covers the
 * spot being chosen. The pin's head is an open ring, so the plan shows through it as well.
 *
 * Colours come from the map palette (DESIGN rule 03: map colours stay on the map). The cross takes
 * the palette's strongest observation colour over a halo in the opposite tone, so it reads on the
 * Day plan, the Night plan and the aerial photo alike.
 */

export const PIN_WIDTH = 34;
export const PIN_HEIGHT = 46;
/** The clear space between the pin's tip and the centre of the cross. */
export const PIN_GAP = 9;
export const CROSS_SIZE = 20;
/** How far the pin rises while the map is moving under it. */
export const PIN_LIFT = 12;

export type MarkColours = {
  readonly pin: string;
  readonly ring: string;
  readonly cross: string;
  readonly halo: string;
};

/** The placement colours for a base. Aerial imagery takes the Day marks: dark cross, white halo. */
export function markColours(base: MapBase): MarkColours {
  const palette = mapPalettes[base === "night" ? "night" : "day"];
  return {
    pin: palette.observation.fill,
    ring: palette.observation.ring,
    cross: palette.observation.selected,
    halo: base === "night" ? palette.background : palette.observation.ring,
  };
}

/** A teardrop pin whose tip is the bottom-centre of its box. The head is an open ring. */
export function PinGlyph({ colours }: { readonly colours: MarkColours }) {
  const cx = PIN_WIDTH / 2;
  const head = 14;
  const cy = head + 2;
  // Two tangents from the head down to the tip, closed by the head's lower arc.
  const hole = 6.5;
  // The outline, then the head's centre as a second ring: with the even-odd rule the centre is a
  // real hole, and the plan under the head shows through it.
  const body = `M ${cx} ${PIN_HEIGHT - 1}
    C ${cx - 4} ${PIN_HEIGHT - 12} ${cx - head} ${cy + 10} ${cx - head} ${cy}
    A ${head} ${head} 0 1 1 ${cx + head} ${cy}
    C ${cx + head} ${cy + 10} ${cx + 4} ${PIN_HEIGHT - 12} ${cx} ${PIN_HEIGHT - 1} Z
    M ${cx + hole} ${cy}
    A ${hole} ${hole} 0 1 0 ${cx - hole} ${cy}
    A ${hole} ${hole} 0 1 0 ${cx + hole} ${cy} Z`;
  return (
    <Svg width={PIN_WIDTH} height={PIN_HEIGHT} viewBox={`0 0 ${PIN_WIDTH} ${PIN_HEIGHT}`}>
      <Path
        d={body}
        fill={colours.pin}
        fillRule="evenodd"
        fillOpacity={0.88}
        stroke={colours.ring}
        strokeWidth={2.5}
      />
    </Svg>
  );
}

/** The × on the exact coordinate: a halo stroke under a dark stroke, centred in its box. */
export function CrossGlyph({ colours }: { readonly colours: MarkColours }) {
  const a = 5;
  const b = CROSS_SIZE - 5;
  return (
    <Svg width={CROSS_SIZE} height={CROSS_SIZE} viewBox={`0 0 ${CROSS_SIZE} ${CROSS_SIZE}`}>
      <Line
        x1={a}
        y1={a}
        x2={b}
        y2={b}
        stroke={colours.halo}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Line
        x1={b}
        y1={a}
        x2={a}
        y2={b}
        stroke={colours.halo}
        strokeWidth={6}
        strokeLinecap="round"
      />
      <Line
        x1={a}
        y1={a}
        x2={b}
        y2={b}
        stroke={colours.cross}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
      <Line
        x1={b}
        y1={a}
        x2={a}
        y2={b}
        stroke={colours.cross}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * A placed point on the map: the cross is the box's exact centre, so a MapLibre marker anchored at
 * its centre puts the cross on the coordinate. The space below mirrors the pin above.
 */
export const PLACED_BOX = {
  width: PIN_WIDTH,
  height: (PIN_HEIGHT + PIN_GAP) * 2,
};

export function PlacedMark({ colours }: { readonly colours: MarkColours }) {
  return (
    <View pointerEvents="none" style={[styles.placedBox, PLACED_BOX]}>
      <View style={styles.pinSlot}>
        <PinGlyph colours={colours} />
      </View>
      <View style={styles.crossSlot}>
        <CrossGlyph colours={colours} />
      </View>
    </View>
  );
}

/**
 * The aiming reticle, fixed at the centre of the map view: the map moves under it. While the map
 * moves (`lifted` → 1) the pin rises and its shadow shows on the cross; when the map settles it
 * drops back. With reduced motion nothing moves; the shadow alone says the pin is lifted.
 */
export function AimReticle({
  colours,
  lifted,
}: {
  readonly colours: MarkColours;
  readonly lifted: SharedValue<number>;
}) {
  const reduceMotion = useReducedMotion();
  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : -PIN_LIFT * lifted.value }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * lifted.value,
    transform: [{ scale: 0.6 + 0.4 * lifted.value }],
  }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centre]}>
      <View style={[styles.placedBox, PLACED_BOX]}>
        <Animated.View style={[styles.pinSlot, pinStyle]}>
          <PinGlyph colours={colours} />
        </Animated.View>
        <Animated.View style={[styles.shadowSlot, shadowStyle]}>
          <Svg width={18} height={8} viewBox="0 0 18 8">
            <Ellipse cx={9} cy={4} rx={9} ry={4} fill={colours.cross} />
          </Svg>
        </Animated.View>
        <View style={styles.crossSlot}>
          <CrossGlyph colours={colours} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: "center", justifyContent: "center" },
  placedBox: { alignItems: "center" },
  pinSlot: { position: "absolute", top: 0 },
  crossSlot: {
    position: "absolute",
    top: PIN_HEIGHT + PIN_GAP - CROSS_SIZE / 2,
    left: (PIN_WIDTH - CROSS_SIZE) / 2,
  },
  shadowSlot: {
    position: "absolute",
    top: PIN_HEIGHT + PIN_GAP - 4,
    left: (PIN_WIDTH - 18) / 2,
  },
});
