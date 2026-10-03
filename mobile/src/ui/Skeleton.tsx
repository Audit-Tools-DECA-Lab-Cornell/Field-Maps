import { type ReactNode, useEffect, useState } from "react";
import {
  type DimensionValue,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

export type SkeletonProps = {
  /** Placeholder rows, each a title bar over a shorter detail bar. */
  rows?: number | undefined;
  /** Said under the placeholders, plainly: "Reading records from this device…". */
  caption?: string | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  testID?: string | undefined;
};

/** Bar heights and widths, drawn to the design: a title line over a detail line. */
const TITLE_BAR = 14;
const DETAIL_BAR = 10;
const TITLE_WIDTHS: readonly DimensionValue[] = ["42%", "50%", "38%", "46%"];
const DETAIL_WIDTHS: readonly DimensionValue[] = ["64%", "52%", "58%", "48%"];

/**
 * Still placeholders while a list loads from the device. Nothing shows for the first 400 ms — most
 * reads finish sooner and a flash of grey is worse than a pause — then the bars fade in. They never
 * shimmer.
 */
export function Skeleton({ rows = 4, caption, style, testID }: SkeletonProps) {
  const styles = useStyles(makeStyles);
  const lines = Array.from({ length: Math.max(1, Math.floor(rows)) }, (_, index) => index);
  return (
    <DelayedReveal
      accessibilityLabel={caption ?? "Loading"}
      testID={testID}
      style={[styles.wrap, style]}
    >
      <View style={styles.island}>
        {lines.map((line) => (
          <View key={line} style={[styles.row, line > 0 ? styles.ruled : null]}>
            <SkeletonBar
              width={TITLE_WIDTHS[line % TITLE_WIDTHS.length] ?? "40%"}
              height={TITLE_BAR}
            />
            <SkeletonBar
              width={DETAIL_WIDTHS[line % DETAIL_WIDTHS.length] ?? "60%"}
              height={DETAIL_BAR}
            />
          </View>
        ))}
      </View>
      {caption ? (
        <Text variant="small" tone="ink2" style={styles.caption}>
          {caption}
        </Text>
      ) : null}
    </DelayedReveal>
  );
}

export type SkeletonBarProps = { width: DimensionValue; height?: number | undefined };

/** One still, well-coloured bar, for placeholders shaped like a particular screen. */
export function SkeletonBar({ width, height = TITLE_BAR }: SkeletonBarProps) {
  const styles = useStyles(makeStyles);
  return <View style={[styles.bar, { width, height }]} />;
}

type DelayedRevealProps = {
  children: ReactNode;
  accessibilityLabel: string;
  testID?: string | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

/** Holds its children back for the skeleton delay, then fades them in (100 ms with reduced motion). */
function DelayedReveal({ children, accessibilityLabel, testID, style }: DelayedRevealProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [shown, setShown] = useState(false);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), theme.motion.duration.skeletonDelay);
    return () => clearTimeout(timer);
  }, [theme.motion.duration.skeletonDelay]);
  useEffect(() => {
    if (!shown) return;
    opacity.set(
      withTiming(1, {
        duration: reduceMotion ? theme.motion.reducedFade : theme.motion.duration.reveal,
        easing: theme.motion.easing.reveal,
      }),
    );
  }, [shown, reduceMotion, opacity, theme.motion]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      accessible={shown}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      testID={testID}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? "yes" : "no-hide-descendants"}
      style={[style, fade]}
    >
      {children}
    </Animated.View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { gap: t.space.s3 },
    island: {
      borderRadius: t.radius.island,
      borderWidth: t.size.border,
      borderColor: t.c.line,
      backgroundColor: t.c.island,
      overflow: "hidden",
    },
    row: {
      gap: t.space.s2,
      paddingHorizontal: t.layout.islandPadding,
      paddingVertical: t.space.s4,
    },
    ruled: { borderTopWidth: t.size.border, borderTopColor: t.c.rule },
    bar: { borderRadius: t.radius.pill, backgroundColor: t.c.well },
    caption: { paddingHorizontal: t.space.s1 },
  });
}
