import { Pressable, type StyleProp, StyleSheet, type ViewStyle } from "react-native";
import { PRESSED_OPACITY } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

export type TextLinkProps = {
  label: string;
  onPress: () => void;
  /** Direction glyph: "Open North meadow →". None by default. */
  arrow?: "right" | "left" | undefined;
  /** Glyph before the words, such as `book-open` for "Read the offline field guide". */
  icon?: IconName | undefined;
  /**
   * accent: a semibold magenta action link ("Stay signed in"). ink: an underlined link for a secondary
   * way out ("Discard draft", "Privacy information").
   */
  tone?: "accent" | "ink" | undefined;
  disabled?: boolean | undefined;
  accessibilityHint?: string | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

function textLinkStyles(t: Theme) {
  return StyleSheet.create({
    link: {
      minHeight: t.size.touch,
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: t.space.s2,
    },
    pressed: { opacity: PRESSED_OPACITY },
    words: { flexShrink: 1 },
    underline: { flexShrink: 1, textDecorationLine: "underline" },
  });
}

/** A link that reads as words, standing on its own line with a 48 px target. */
export function TextLink({
  label,
  onPress,
  arrow,
  icon,
  tone = "accent",
  disabled = false,
  accessibilityHint,
  style,
  testID,
}: TextLinkProps) {
  const t = useTheme();
  const s = useStyles(textLinkStyles);
  const color = disabled ? t.c.ink2 : tone === "ink" ? t.c.ink : t.c.accent;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      testID={testID}
      style={({ pressed }) => [s.link, pressed && !disabled ? s.pressed : null, style]}
    >
      {arrow === "left" ? <Icon name="arrow-left" size={18} color={color} /> : null}
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <Text
        variant="bodyStrong"
        tone={disabled ? "ink2" : tone}
        style={tone === "ink" ? s.underline : s.words}
      >
        {label}
      </Text>
      {arrow === "right" ? <Icon name="arrow-right" size={18} color={color} /> : null}
    </Pressable>
  );
}
