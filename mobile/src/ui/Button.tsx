import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";
import type { TypeRole } from "./tokens";

export type ButtonVariant =
  | "primary"
  | "ink"
  | "outline"
  | "soft"
  | "danger"
  | "danger-solid"
  | "link";

/** md is the 56 px control, collector the 60 px action on collect screens, sm the 44 px compact one. */
export type ButtonSize = "md" | "collector" | "sm";

/** The colour of a link-variant button: accent by default, ink for a quiet way out, attention to start a destructive flow. */
export type ButtonLinkTone = "accent" | "ink" | "attention";

export type ButtonProps = {
  /** Verb + object: "Save on this device". */
  label: string;
  onPress: () => void;
  /**
   * Primary (magenta) appears once per screen. Ink is the strong second action; outline is for the rest;
   * soft is a quiet fill. Danger starts a destructive flow, danger-solid confirms one. Link is words only.
   */
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Glyph before the label. */
  icon?: IconName | undefined;
  /** Glyph after the label, usually `arrow-right` for an action that moves on. */
  iconRight?: IconName | undefined;
  /**
   * The action is running. The button keeps its width, reports busy and ignores presses. No spinner:
   * the label says what is happening.
   */
  busy?: boolean | undefined;
  /** The label while busy, such as "Saving…". Without it the label stays as it is. */
  busyLabel?: string | undefined;
  disabled?: boolean | undefined;
  /** Why the button is off, shown under it while it is disabled: "The button turns on when both passwords match." */
  disabledReason?: string | undefined;
  /** Stretch to the width of the container. Otherwise the button hugs its label. */
  fullWidth?: boolean | undefined;
  /** Link variant only. */
  tone?: ButtonLinkTone | undefined;
  accessibilityHint?: string | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

/** Pressed feedback for every Contour control: the fill darkens against the ground. */
export const PRESSED_OPACITY = 0.88;

/** The compact control. The mobile contract has no 44 px token; hitSlop brings the target to `size.touch`. */
const SMALL_CONTROL = 44;

type Look = { fill: string; edge: string; edgeWidth: number; ink: string };

function lookOf(t: Theme, variant: ButtonVariant, tone: ButtonLinkTone, disabled: boolean): Look {
  const { c } = t;
  const none = "transparent";
  if (variant === "link") {
    const ink = disabled
      ? c.ink2
      : tone === "ink"
        ? c.ink
        : tone === "attention"
          ? c.attention
          : c.accent;
    return { fill: none, edge: none, edgeWidth: 0, ink };
  }
  // A disabled button takes the designed disabled look (well fill, secondary ink, no edge) whatever its
  // variant, so it never reads as a lighter copy of the live action.
  if (disabled) return { fill: c.well, edge: none, edgeWidth: 0, ink: c.ink2 };
  const edge = t.size.tileBorder;
  switch (variant) {
    case "primary":
      return { fill: c.accent, edge: none, edgeWidth: 0, ink: c.onAccent };
    case "ink":
      return { fill: c.ink, edge: none, edgeWidth: 0, ink: c.onInk };
    case "outline":
      return { fill: c.island, edge: c.ink, edgeWidth: edge, ink: c.ink };
    case "soft":
      return { fill: c.well, edge: none, edgeWidth: 0, ink: c.ink };
    case "danger":
      return { fill: c.island, edge: c.attention, edgeWidth: edge, ink: c.attention };
    case "danger-solid":
      return { fill: c.attention, edge: none, edgeWidth: 0, ink: c.onAttention };
  }
}

const LABEL_ROLE: Record<ButtonSize, TypeRole> = {
  md: "island",
  collector: "island",
  sm: "bodyStrong",
};

const ICON_SIZE: Record<ButtonSize, number> = { md: 20, collector: 20, sm: 18 };

function buttonStyles(t: Theme) {
  return StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: t.radius.pill,
    },
    md: {
      minHeight: t.size.control,
      paddingHorizontal: t.space.s6,
      paddingVertical: t.space.s3,
      gap: t.space.s3,
    },
    collector: {
      minHeight: t.size.collector,
      paddingHorizontal: t.space.s6,
      paddingVertical: t.space.s3,
      gap: t.space.s3,
    },
    sm: {
      minHeight: SMALL_CONTROL,
      paddingHorizontal: t.space.s4,
      paddingVertical: t.space.s2,
      gap: t.space.s2,
    },
    link: {
      minHeight: t.size.touch,
      paddingVertical: t.space.s2,
      gap: t.space.s2,
    },
    hug: { alignSelf: "flex-start" },
    full: { alignSelf: "stretch" },
    pressed: { opacity: PRESSED_OPACITY },
    labels: { flexShrink: 1, alignItems: "center" },
    // The label that is not showing still sets the width, so the button does not jump when busy.
    ghost: { height: 0, overflow: "hidden", opacity: 0 },
    withReason: { gap: t.space.s2 },
  });
}

/**
 * The Contour button: a pill with a verb + object label. Every size meets the 48 px touch target; the
 * 44 px compact size extends its target with hitSlop.
 */
export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  busy = false,
  busyLabel,
  disabled = false,
  disabledReason,
  fullWidth = false,
  tone = "accent",
  accessibilityHint,
  style,
  testID,
}: ButtonProps) {
  const t = useTheme();
  const s = useStyles(buttonStyles);
  const look = lookOf(t, variant, tone, disabled);
  const inactive = disabled || busy;
  const role = LABEL_ROLE[size];
  const iconSize = ICON_SIZE[size];
  const shown = busy && busyLabel ? busyLabel : label;
  // A full-width button cannot change width, so it needs no ghost; one would push the label and its
  // glyphs off centre ("Verify email" sizing itself for "Verifying email…").
  const other =
    !fullWidth && busyLabel && busyLabel !== label ? (busy ? label : busyLabel) : undefined;
  const slop = variant !== "link" && size === "sm" ? (t.size.touch - SMALL_CONTROL) / 2 : 0;
  const showReason = disabled && Boolean(disabledReason);
  const sizeStyle = variant === "link" ? s.link : s[size];

  const button = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={shown}
      accessibilityHint={showReason ? disabledReason : accessibilityHint}
      accessibilityState={{ disabled, busy }}
      onPress={inactive ? undefined : onPress}
      hitSlop={slop > 0 ? { top: slop, bottom: slop } : undefined}
      testID={testID}
      style={({ pressed }) => [
        s.base,
        sizeStyle,
        {
          backgroundColor: look.fill,
          borderColor: look.edge,
          borderWidth: look.edgeWidth,
        },
        fullWidth ? s.full : s.hug,
        pressed && !inactive ? s.pressed : null,
        showReason ? null : style,
      ]}
    >
      {icon ? <Icon name={icon} size={iconSize} color={look.ink} /> : null}
      <View style={s.labels}>
        <Text variant={role} align="center" style={{ color: look.ink }}>
          {shown}
        </Text>
        {other ? (
          <View
            style={s.ghost}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Text variant={role} align="center" style={{ color: look.ink }}>
              {other}
            </Text>
          </View>
        ) : null}
      </View>
      {iconRight ? <Icon name={iconRight} size={iconSize} color={look.ink} /> : null}
    </Pressable>
  );

  if (!showReason) return button;
  return (
    <View style={[s.withReason, fullWidth ? s.full : s.hug, style]}>
      {button}
      {/* The reason is also the button's accessibility hint; read once, with the button. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text variant="body" tone="ink2" align={fullWidth ? "center" : "left"}>
          {disabledReason}
        </Text>
      </View>
    </View>
  );
}
