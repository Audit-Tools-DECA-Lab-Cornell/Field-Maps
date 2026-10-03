import {
  type AccessibilityActionEvent,
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

type NumberStepperProps = {
  value: number;
  onChange: (value: number) => void;
  /** What the number is, for screen readers: "Round number". */
  accessibilityLabel: string;
  min?: number | undefined;
  max?: number | undefined;
  step?: number | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

/**
 * "− 1 +" in one joined control, 54 tall, matching the text fields beside it. A screen reader meets
 * one adjustable element and swipes up or down; a finger meets two 54 px buttons.
 */
export function NumberStepper({
  value,
  onChange,
  accessibilityLabel,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  style,
}: NumberStepperProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const canDecrease = value - step >= min;
  const canIncrease = value + step <= max;
  const decrease = () => {
    if (canDecrease) onChange(value - step);
  };
  const increase = () => {
    if (canIncrease) onChange(value + step);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        now: value,
        ...(Number.isFinite(min) ? { min } : {}),
        ...(Number.isFinite(max) ? { max } : {}),
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={(event: AccessibilityActionEvent) => {
        if (event.nativeEvent.actionName === "increment") increase();
        if (event.nativeEvent.actionName === "decrement") decrease();
      }}
      style={[styles.frame, style]}
    >
      <Pressable
        onPress={decrease}
        disabled={!canDecrease}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${accessibilityLabel}`}
        accessibilityState={{ disabled: !canDecrease }}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
      >
        <Icon name="minus" size={theme.space.s6} color={canDecrease ? theme.c.ink : theme.c.edge} />
      </Pressable>
      <View style={[styles.value, styles.ruled]}>
        <Text variant="island" align="center" style={styles.number}>
          {value}
        </Text>
      </View>
      <Pressable
        onPress={increase}
        disabled={!canIncrease}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${accessibilityLabel}`}
        accessibilityState={{ disabled: !canIncrease }}
        style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
      >
        <Icon name="plus" size={theme.space.s6} color={canIncrease ? theme.c.ink : theme.c.edge} />
      </Pressable>
    </View>
  );
}

function makeStyles(t: Theme) {
  const inner = t.size.input - t.size.tileBorder * 2;
  return StyleSheet.create({
    frame: {
      flexDirection: "row",
      alignItems: "stretch",
      minHeight: t.size.input,
      borderWidth: t.size.tileBorder,
      borderColor: t.c.ink,
      borderRadius: t.radius.input,
      backgroundColor: t.c.island,
      overflow: "hidden",
    },
    button: {
      width: inner,
      minHeight: inner,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { backgroundColor: t.c.well },
    value: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: t.space.s2,
    },
    // The island size in the mono face: a count someone may read aloud.
    number: { fontFamily: t.type.monoCode.fontFamily },
    ruled: {
      borderLeftWidth: t.size.border,
      borderRightWidth: t.size.border,
      borderColor: t.c.line,
    },
  });
}
