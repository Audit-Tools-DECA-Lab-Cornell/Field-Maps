import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { type Theme, useStyles } from "./theme";

export type StepBarsProps = {
  /** How many steps there are. */
  count: number;
  /** The step on screen, counted from 1 as the words say: "STEP 1 OF 2". */
  current: number;
  /** End (the default) sits in the header's right corner, as in onboarding. */
  align?: "start" | "end" | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  testID?: string | undefined;
};

/** Each bar, drawn to the design. */
const BAR_WIDTH = 64;
const BAR_HEIGHT = 6;

/** Onboarding progress: "STEP 1 OF 2" over one short bar per step; bars up to this step are ink. */
export function StepBars({ count, current, align = "end", style, testID }: StepBarsProps) {
  const styles = useStyles(makeStyles);
  const total = Math.max(1, Math.floor(count));
  const step = Math.min(Math.max(1, Math.floor(current)), total);
  const steps = Array.from({ length: total }, (_, index) => index + 1);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
      testID={testID}
      style={[styles.wrap, align === "start" ? styles.start : styles.end, style]}
    >
      <Text variant="monoLabel" tone="ink2">
        {`Step ${step} of ${total}`}
      </Text>
      <View style={styles.bars}>
        {steps.map((bar) => (
          <View key={bar} style={[styles.bar, bar <= step ? styles.barDone : null]} />
        ))}
      </View>
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    wrap: { gap: t.space.s2 },
    start: { alignItems: "flex-start" },
    end: { alignItems: "flex-end" },
    bars: { flexDirection: "row", gap: t.space.s2 },
    bar: {
      width: BAR_WIDTH,
      height: BAR_HEIGHT,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.line,
    },
    barDone: { backgroundColor: t.c.ink },
  });
}
