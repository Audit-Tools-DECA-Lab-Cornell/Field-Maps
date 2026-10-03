import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { type Theme, useStyles } from "./theme";

export type RadioOption<T extends string> = {
  value: T;
  label: string;
  /** A second line in ink2. */
  description?: string | undefined;
  disabled?: boolean | undefined;
};

type RadioRowsProps<T extends string> = {
  options: readonly RadioOption<T>[];
  /** Nothing chosen yet when null or undefined. */
  value: T | null | undefined;
  onChange: (value: T) => void;
  /** What the choice is about, for screen readers: "Zone". */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle> | undefined;
};

/** The radio dot, drawn to the design. */
const DOT = 22;
const DOT_FILL = 10;

/**
 * A short list of exclusive choices as full-width rows (the zone in the session brief). A chosen
 * row takes the soft accent fill, an accent border and a filled dot.
 */
export function RadioRows<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: RadioRowsProps<T>) {
  const styles = useStyles(makeStyles);
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.list, style]}
    >
      {options.map((option) => {
        const chosen = option.value === value;
        const disabled = option.disabled === true;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
            accessibilityState={{ checked: chosen, disabled }}
            style={({ pressed }) => [
              styles.row,
              chosen ? styles.rowChosen : null,
              disabled ? styles.rowDisabled : null,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={[styles.dot, chosen ? styles.dotChosen : null]}>
              {chosen ? <View style={styles.dotFill} /> : null}
            </View>
            <View style={styles.text}>
              <Text variant="answer" tone={disabled ? "ink2" : "ink"}>
                {option.label}
              </Text>
              {option.description ? (
                <Text variant="small" tone="ink2">
                  {option.description}
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    list: { gap: t.space.s2 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.s3,
      minHeight: t.size.touch,
      paddingHorizontal: t.space.s4,
      paddingVertical: t.space.s3,
      borderRadius: t.radius.tile,
      borderWidth: t.size.tileBorder,
      borderColor: t.c.ink,
      backgroundColor: t.c.island,
    },
    rowChosen: { borderColor: t.c.accent, backgroundColor: t.c.accentSoft },
    rowDisabled: { borderColor: t.c.edge },
    pressed: { opacity: 0.88 },
    dot: {
      width: DOT,
      height: DOT,
      borderRadius: t.radius.pill,
      borderWidth: t.size.tileBorder,
      borderColor: t.c.ink,
      alignItems: "center",
      justifyContent: "center",
    },
    dotChosen: { borderColor: t.c.accent },
    dotFill: {
      width: DOT_FILL,
      height: DOT_FILL,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.accent,
    },
    text: { flex: 1, gap: t.space.s1 },
  });
}
