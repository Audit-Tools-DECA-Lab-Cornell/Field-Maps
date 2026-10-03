import { useEffect, useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  Pressable,
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

export type ModeStep = 0 | 1 | 2;

type ModeStripProps = {
  /** The three acts of collecting, in order: ["Place", "Answer", "Review"]. */
  steps: readonly [string, string, string];
  current: ModeStep;
  /** Called for a finished step. Steps not reached yet cannot be chosen. */
  onSelect?: ((step: ModeStep) => void) | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

const STEPS: readonly ModeStep[] = [0, 1, 2];

/**
 * "1 · Place  2 · Answer  3 · Review": where the observer is in a record. The current step is an ink
 * pill that slides as they move on; a finished step can be tapped to go back to it.
 */
export function ModeStrip({ steps, current, onSelect, style }: ModeStripProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const inset = theme.space.s1;
  const inner = width - theme.size.border * 2 - inset * 2;
  const segment = inner > 0 ? inner / STEPS.length : 0;
  // Each step reaches the strip's outer edge, so the touch target is the full 48.
  const reach = inset + theme.size.border;
  const hitSlop = { top: reach, bottom: reach };

  const x = useSharedValue(0);
  const placedSegment = useRef(0);
  useEffect(() => {
    const target = current * segment;
    if (placedSegment.current !== segment || reduceMotion) {
      placedSegment.current = segment;
      x.set(target);
      return;
    }
    x.set(
      withTiming(target, {
        duration: theme.motion.duration.slide,
        easing: theme.motion.easing.standard,
      }),
    );
  }, [current, segment, reduceMotion, x, theme.motion]);
  const pillMotion = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, style]}
    >
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { width: segment, left: inset }, pillMotion]}
        />
      ) : null}
      {STEPS.map((step) => {
        const isCurrent = step === current;
        const finished = step < current;
        const selectable = finished && onSelect !== undefined;
        const label = `${step + 1} · ${steps[step]}`;
        return (
          <Pressable
            key={step}
            onPress={() => {
              if (selectable) onSelect(step);
            }}
            disabled={!selectable}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel={`${steps[step]}, step ${step + 1} of ${STEPS.length}${
              isCurrent ? ", current" : finished ? ", done" : ""
            }`}
            accessibilityState={{ selected: isCurrent, disabled: !selectable }}
            style={({ pressed }) => [
              styles.step,
              isCurrent && segment === 0 ? styles.stepCurrent : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text
              variant="answer"
              tone={isCurrent ? "onInk" : "ink2"}
              align="center"
              style={styles.label}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    track: {
      flexDirection: "row",
      minHeight: t.size.touch,
      padding: t.space.s1,
      borderRadius: t.radius.pill,
      borderWidth: t.size.border,
      borderColor: t.c.line,
      backgroundColor: t.c.island,
    },
    pill: {
      position: "absolute",
      top: t.space.s1,
      bottom: t.space.s1,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.ink,
    },
    step: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: t.size.touch - t.space.s1 * 2 - t.size.border * 2,
      paddingHorizontal: t.space.s2,
      paddingVertical: t.space.s1,
      borderRadius: t.radius.pill,
    },
    stepCurrent: { backgroundColor: t.c.ink },
    // Every step is set in the semibold face of the answer role, as drawn.
    label: { fontFamily: t.type.bodyStrong.fontFamily },
    pressed: { opacity: 0.88 },
  });
}
