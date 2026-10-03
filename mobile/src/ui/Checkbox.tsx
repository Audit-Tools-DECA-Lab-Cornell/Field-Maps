import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { PRESSED_OPACITY } from "./Button";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

export type CheckboxProps = {
  label: string;
  checked: boolean;
  /** Named as on the web: the box reports the state it turns to. */
  onCheckedChange: (checked: boolean) => void;
  /** A second line in ink2 under the label. */
  description?: string | undefined;
  disabled?: boolean | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  testID?: string | undefined;
};

/** The square sits a little rounder than a hard corner, as drawn in the design. */
const BOX_RADIUS = 6;

/** A square box and a label that wraps; the whole row is the target. Checked is an ink fill. */
export function Checkbox({
  label,
  checked,
  onCheckedChange,
  description,
  disabled,
  style,
  testID,
}: CheckboxProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={() => onCheckedChange(!checked)}
      disabled={disabled}
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked, disabled: disabled === true }}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null, style]}
    >
      <View
        style={[
          styles.box,
          checked ? styles.boxChecked : null,
          disabled ? styles.boxDisabled : null,
        ]}
      >
        {checked ? (
          <Icon name="check" size={theme.space.s4} color={theme.c.onInk} strokeWidth={3} />
        ) : null}
      </View>
      <View style={styles.text}>
        <Text variant="body" tone={disabled ? "ink2" : "ink"}>
          {label}
        </Text>
        {description ? (
          <Text variant="small" tone="ink2">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.s3,
      minHeight: t.size.touch,
      paddingVertical: t.space.s1,
    },
    pressed: { opacity: PRESSED_OPACITY },
    box: {
      width: t.space.s6,
      height: t.space.s6,
      borderRadius: BOX_RADIUS,
      borderWidth: t.size.tileBorder,
      borderColor: t.c.ink,
      backgroundColor: t.c.island,
      alignItems: "center",
      justifyContent: "center",
    },
    boxChecked: { backgroundColor: t.c.ink },
    boxDisabled: { borderColor: t.c.edge },
    text: { flex: 1, gap: t.space.s1 },
  });
}
