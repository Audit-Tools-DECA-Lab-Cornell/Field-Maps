import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { PRESSED_OPACITY } from "./Button";
import { Icon, type IconName } from "./Icon";
import { type Theme, useStyles, useTheme } from "./theme";

/**
 * plain: a bare glyph. outline: the white circle with a light edge (the header back button). map: an
 * outline circle standing on a short ledge, for controls over a map. ink: a filled ink circle.
 */
export type IconButtonVariant = "plain" | "map" | "ink" | "outline";

export type IconButtonProps = {
  icon: IconName;
  /** What the button does, read by screen readers: "Back", "Zoom in". */
  label: string;
  onPress: () => void;
  variant?: IconButtonVariant | undefined;
  /** 48 by default; 44 for map controls, which keep a 48 px target through hitSlop. */
  size?: 48 | 44 | undefined;
  /** A toggle that is on, such as the layers control while the layer sheet is open: a 2 px ink edge. */
  selected?: boolean | undefined;
  disabled?: boolean | undefined;
  accessibilityHint?: string | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

/** Map controls draw at 44 and reach the 48 px target through hitSlop; the mobile contract has no 44 token. */
const MAP_CONTROL = 44;

function iconButtonStyles(t: Theme) {
  return StyleSheet.create({
    base: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: t.radius.pill,
    },
    pressed: { opacity: PRESSED_OPACITY },
    plainPressed: { backgroundColor: t.c.well },
    // Map controls stand on a short solid ledge, like an island; no shadow.
    mapWrap: { paddingBottom: t.size.ledge / 2 },
    mapLedge: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.ledge,
    },
  });
}

export function IconButton({
  icon,
  label,
  onPress,
  variant = "plain",
  size,
  selected,
  disabled = false,
  accessibilityHint,
  style,
  testID,
}: IconButtonProps) {
  const t = useTheme();
  const s = useStyles(iconButtonStyles);
  const c = t.c;
  const box: number = size ?? (variant === "map" ? MAP_CONTROL : t.size.touch);
  const slop = Math.max(0, (t.size.touch - box) / 2);
  const glyph = disabled ? c.ink2 : variant === "ink" ? c.onInk : c.ink;
  const fill =
    variant === "ink"
      ? disabled
        ? c.well
        : c.ink
      : variant === "plain"
        ? "transparent"
        : c.island;
  const edgeWidth =
    variant === "outline" || variant === "map" ? (selected ? t.size.tileBorder : t.size.border) : 0;
  const edgeColor = selected ? c.ink : c.line;

  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={selected === undefined ? { disabled } : { disabled, selected }}
      onPress={disabled ? undefined : onPress}
      hitSlop={slop > 0 ? slop : undefined}
      testID={testID}
      style={({ pressed }) => [
        s.base,
        {
          width: box,
          height: box,
          backgroundColor: fill,
          borderWidth: edgeWidth,
          borderColor: edgeColor,
        },
        pressed && !disabled ? (variant === "plain" ? s.plainPressed : s.pressed) : null,
        variant === "map" ? null : style,
      ]}
    >
      <Icon name={icon} size={box >= t.size.touch ? 22 : 20} color={glyph} />
    </Pressable>
  );

  if (variant !== "map") return button;
  return (
    <View style={[s.mapWrap, { width: box }, style]}>
      <View pointerEvents="none" style={[s.mapLedge, { height: box }]} />
      {button}
    </View>
  );
}
