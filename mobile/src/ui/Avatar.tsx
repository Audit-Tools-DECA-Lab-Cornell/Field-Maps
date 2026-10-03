import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { PRESSED_OPACITY } from "./Button";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

export type AvatarProps = {
  /** Up to three letters, as the observer code shows them: "PS". Derived from `name` when absent. */
  initials?: string | undefined;
  /** The person's name, for the initials and the accessibility label. */
  name?: string | undefined;
  /** ink: the account mark in the header. well: a quieter mark in lists. */
  tone?: "ink" | "well" | undefined;
  /** md 48 (header), lg 60 (account). */
  size?: "md" | "lg" | undefined;
  /** Opens the account. Without it the avatar is decorative: the name beside it is what is read. */
  onPress?: (() => void) | undefined;
  accessibilityLabel?: string | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function avatarStyles(t: Theme) {
  return StyleSheet.create({
    // A circle at the default text size; it grows into a pill rather than clipping larger text.
    circle: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space.s1,
    },
    md: { minWidth: t.size.touch, minHeight: t.size.touch },
    lg: { minWidth: t.size.collector, minHeight: t.size.collector },
    pressed: { opacity: PRESSED_OPACITY },
  });
}

/** The person's initials in a circle: ink in the header (mobile-10), well in quieter places. */
export function Avatar({
  initials,
  name,
  tone = "ink",
  size = "md",
  onPress,
  accessibilityLabel,
  style,
  testID,
}: AvatarProps) {
  const t = useTheme();
  const s = useStyles(avatarStyles);
  const letters = initials ?? (name ? initialsOf(name) : "");
  const fill = tone === "ink" ? t.c.ink : t.c.well;
  const content = (
    <Text variant={size === "lg" ? "island" : "bodyStrong"} tone={tone === "ink" ? "onInk" : "ink"}>
      {letters}
    </Text>
  );
  const label = accessibilityLabel ?? name ?? letters;

  if (onPress)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: false }}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          s.circle,
          s[size],
          { backgroundColor: fill },
          pressed ? s.pressed : null,
          style,
        ]}
      >
        {content}
      </Pressable>
    );

  return (
    <View
      testID={testID}
      {...(accessibilityLabel
        ? { accessible: true, accessibilityRole: "image" as const, accessibilityLabel }
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: "no-hide-descendants" as const,
          })}
      style={[s.circle, s[size], { backgroundColor: fill }, style]}
    >
      {content}
    </View>
  );
}
