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
import { PRESSED_OPACITY } from "./Button";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

export type SegmentedOption<T extends string> = { value: T; label: string };

export type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  /** Names the group for screen readers, as on the web: "Preferred hand". Not drawn. */
  label: string;
  style?: StyleProp<ViewStyle> | undefined;
  testID?: string | undefined;
};

/**
 * Two or three exclusive options in one pill. The ink pill slides behind the chosen option and the
 * chosen label carries a check, so the choice reads without colour.
 */
export function Segmented<T extends string>({
  options,
  value,
  onValueChange,
  label,
  style,
  testID,
}: SegmentedProps<T>) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const count = Math.max(options.length, 1);
  const inset = theme.space.s1;
  // Absolute children are placed inside the border, so the border comes off the measured width.
  const inner = width - theme.size.border * 2 - inset * 2;
  const segment = inner > 0 ? inner / count : 0;
  // Each option reaches the track's outer edge, so the touch target is the full 54.
  const reach = inset + theme.size.border;
  const hitSlop = { top: reach, bottom: reach };
  // A value that matches no option leaves every option unlit.
  const index = options.findIndex((option) => option.value === value);

  const x = useSharedValue(0);
  const placedSegment = useRef(0);
  useEffect(() => {
    const target = Math.max(index, 0) * segment;
    // The first placement, and any change of width (rotation), snaps; a new choice slides.
    if (placedSegment.current !== segment || reduceMotion) {
      placedSegment.current = segment;
      x.set(target);
      return;
    }
    x.set(
      withTiming(target, {
        duration: theme.motion.duration.base,
        easing: theme.motion.easing.standard,
      }),
    );
  }, [index, segment, reduceMotion, x, theme.motion]);
  const pillMotion = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.track, style]}
    >
      {segment > 0 && index >= 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.pill, { width: segment, left: inset }, pillMotion]}
        />
      ) : null}
      {options.map((option) => {
        const chosen = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!chosen) onValueChange(option.value);
            }}
            hitSlop={hitSlop}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: chosen }}
            style={({ pressed }) => [
              styles.option,
              // Until the track is measured, the chosen option paints its own pill.
              chosen && segment === 0 ? styles.optionChosen : null,
              pressed ? styles.pressed : null,
            ]}
          >
            {chosen ? <Icon name="check" color={theme.c.onInk} /> : null}
            <Text variant="bodyStrong" tone={chosen ? "onInk" : "ink"} align="center">
              {option.label}
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
      minHeight: t.size.input,
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
    option: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.space.s2,
      minHeight: t.size.input - t.space.s1 * 2 - t.size.border * 2,
      paddingHorizontal: t.space.s3,
      paddingVertical: t.space.s2,
      borderRadius: t.radius.pill,
    },
    optionChosen: { backgroundColor: t.c.ink },
    pressed: { opacity: PRESSED_OPACITY },
  });
}
