import { useEffect, useRef } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

/** Named as on the web: `value` of `max`, a `label` that names the bar, a mono `detail` under it. */
export type ProgressBarProps = {
  /** Done so far, in the same unit as max. */
  value: number;
  /** The whole amount. 1 by default, so a fraction can be passed as the value. */
  max?: number | undefined;
  /** What the bar measures, for screen readers: "Map package v3 download". Not drawn. */
  label: string;
  /** The amount in words, under the bar on the left, in mono: "60 of 126 MB". */
  detail?: string | undefined;
  /** The whole percentage on the right ("48%"). On by default. */
  showPercent?: boolean | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  testID?: string | undefined;
};

/** Height of the bar, drawn to the design. */
const BAR_HEIGHT = 10;

/**
 * A determinate transfer: the uploaded-coloured fill on a well track, the amount under it on the
 * left and the percentage on the right. The fill moves linearly between reported values; nothing
 * pulses or shimmers while it waits.
 */
export function ProgressBar({
  value,
  max = 1,
  label,
  detail,
  showPercent = true,
  style,
  testID,
}: ProgressBarProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const ratio = max > 0 ? value / max : 0;
  const fraction = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0;
  // Rounded as people read it (60 of 126 MB is 48%), but 100% only once it is all there.
  const percent = fraction >= 1 ? 100 : Math.min(99, Math.round(fraction * 100));

  const fill = useSharedValue(fraction);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current || reduceMotion) {
      mounted.current = true;
      fill.set(fraction);
      return;
    }
    fill.set(
      withTiming(fraction, {
        duration: theme.motion.duration.base,
        easing: theme.motion.easing.linear,
      }),
    );
  }, [fraction, reduceMotion, fill, theme.motion]);
  const fillMotion = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` as const }));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: percent,
        ...(detail ? { text: `${detail}, ${percent}%` } : {}),
      }}
      testID={testID}
      style={[styles.wrap, style]}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillMotion]} />
      </View>
      {detail || showPercent ? (
        <View style={styles.legend}>
          <Text variant="monoData" tone="ink2" style={styles.detail}>
            {detail ?? ""}
          </Text>
          {showPercent ? (
            <Text variant="monoData" tone="ink2">
              {`${percent}%`}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { gap: t.space.s2 },
    track: {
      height: BAR_HEIGHT,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.well,
      overflow: "hidden",
    },
    fill: { height: "100%", borderRadius: t.radius.pill, backgroundColor: t.c.uploaded },
    legend: { flexDirection: "row", justifyContent: "space-between", gap: t.space.s3 },
    detail: { flexShrink: 1 },
  });
}
