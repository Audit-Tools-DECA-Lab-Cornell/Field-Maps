import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Icon, type IconName, isIconName } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";
import {
  type StateKey,
  type StateKind,
  type StateTone,
  stateOf,
  type TypeRole,
  toneColor,
} from "./tokens";

/** sm sits in dense lines (14), md in rows and island headers (16), lg on the saved card (19). */
export type StateBadgeSize = "sm" | "md" | "lg";

type Look = {
  size?: StateBadgeSize | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

/** A state from the contract, optionally with the words adapted: "1 site ready offline". */
type FromContract<K extends StateKind> = {
  kind: K;
  state: StateKey<K>;
  label?: string | undefined;
  icon?: undefined;
  tone?: undefined;
};

/** A one-off glyph, word and tone that is not a contract state. */
type Custom = {
  kind?: undefined;
  state?: undefined;
  label: string;
  icon: IconName;
  tone: StateTone;
};

export type StateBadgeProps<K extends StateKind> = Look & (FromContract<K> | Custom);

const ROLE: Record<StateBadgeSize, TypeRole> = {
  sm: "smallStrong",
  md: "bodyStrong",
  lg: "island",
};
const GLYPH: Record<StateBadgeSize, number> = { sm: 16, md: 18, lg: 22 };

function badgeStyles(t: Theme) {
  return StyleSheet.create({
    badge: { flexDirection: "row", alignItems: "center", gap: t.space.s2, flexShrink: 1 },
    words: { flexShrink: 1 },
  });
}

type Resolved = { label: string; icon: IconName; tone: StateTone };

function resolve<K extends StateKind>(props: FromContract<K> | Custom): Resolved {
  if (props.kind === undefined || props.state === undefined) {
    const custom = props as Custom;
    return { label: custom.label, icon: custom.icon, tone: custom.tone };
  }
  const state = stateOf<K>(props.kind, props.state as StateKey<K>);
  return {
    label: props.label ?? state.label,
    icon: isIconName(state.icon) ? state.icon : "circle-help",
    tone: state.tone,
  };
}

/**
 * Every state is a glyph, a word and a colour (Rule 02): "✓ Ready offline", "⚠ Needs attention",
 * "|| Held". The words are what a screen reader announces; the glyph is decorative.
 */
export function StateBadge<K extends StateKind>(props: StateBadgeProps<K>) {
  const t = useTheme();
  const s = useStyles(badgeStyles);
  const { size = "md", style, testID } = props;
  const { label, icon, tone } = resolve(props);
  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
      style={[s.badge, style]}
    >
      <Icon name={icon} size={GLYPH[size]} color={toneColor(t.c, tone)} />
      <Text variant={ROLE[size]} tone={tone} style={s.words}>
        {label}
      </Text>
    </View>
  );
}
