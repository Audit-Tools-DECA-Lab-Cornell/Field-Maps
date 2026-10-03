import { useEffect, useRef } from "react";
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

type SwitchProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** What the setting does, in ink2 under the label. */
  description?: string | undefined;
  disabled?: boolean | undefined;
  /**
   * The row brings island padding so a stack of switches can sit in an unpadded Island with rules
   * between them (Preferences). Override here when it stands elsewhere.
   */
  style?: StyleProp<ViewStyle> | undefined;
};

/** Track and knob, drawn to the design: wide enough to read at arm's length, never a hairline. */
const TRACK_WIDTH = 56;
const TRACK_HEIGHT = 30;
const KNOB = 20;

/**
 * A setting that is on or off. The label and description sit on the left; on the right, the word
 * "On" or "Off" beside the track, so the state never rests on colour or knob position alone.
 */
export function Switch({ label, value, onValueChange, description, disabled, style }: SwitchProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const reduceMotion = useReducedMotion();
  const border = theme.size.tileBorder;
  const inset = (TRACK_HEIGHT - border * 2 - KNOB) / 2;
  const travel = TRACK_WIDTH - border * 2 - inset * 2 - KNOB;

  const offset = useSharedValue(value ? travel : 0);
  const mounted = useRef(false);
  useEffect(() => {
    const target = value ? travel : 0;
    if (!mounted.current || reduceMotion) {
      mounted.current = true;
      offset.set(target);
      return;
    }
    offset.set(
      withTiming(target, {
        duration: theme.motion.duration.base,
        easing: theme.motion.easing.standard,
      }),
    );
  }, [value, travel, reduceMotion, offset, theme.motion]);
  const knobMotion = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled: disabled === true }}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, style]}
    >
      <View style={styles.text}>
        <Text variant="island" tone={disabled ? "ink2" : "ink"}>
          {label}
        </Text>
        {description ? (
          <Text variant="body" tone="ink2">
            {description}
          </Text>
        ) : null}
      </View>
      <View style={styles.control}>
        <Text variant="bodyStrong" tone={disabled ? "ink2" : "ink"}>
          {value ? "On" : "Off"}
        </Text>
        <View
          style={[
            styles.track,
            value ? styles.trackOn : null,
            disabled ? styles.trackDisabled : null,
          ]}
        >
          <Animated.View
            style={[
              styles.knob,
              { margin: inset },
              value ? styles.knobOn : null,
              disabled ? styles.knobDisabled : null,
              knobMotion,
            ]}
          />
        </View>
      </View>
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.s4,
      minHeight: t.size.touch,
      paddingVertical: t.space.s4,
      paddingHorizontal: t.layout.islandPadding,
    },
    pressed: { opacity: 0.88 },
    text: { flex: 1, gap: t.space.s1 },
    control: { flexDirection: "row", alignItems: "center", gap: t.space.s3 },
    track: {
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      borderRadius: t.radius.pill,
      borderWidth: t.size.tileBorder,
      borderColor: t.c.ink,
      backgroundColor: t.c.island,
      justifyContent: "center",
    },
    trackOn: { backgroundColor: t.c.ink },
    trackDisabled: { borderColor: t.c.edge, backgroundColor: t.c.well },
    knob: {
      width: KNOB,
      height: KNOB,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.ink,
    },
    knobOn: { backgroundColor: t.c.onInk },
    knobDisabled: { backgroundColor: t.c.edge },
  });
}
