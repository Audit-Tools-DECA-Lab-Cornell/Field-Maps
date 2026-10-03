import { type ReactNode, useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Platform,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { Icon, type IconName } from "./Icon";
import { Mono } from "./Mono";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";
import { type StateTone, toneColor } from "./tokens";

/**
 * Speak a short status without moving focus: "OBS-0249 saved on this device". Queued behind what the
 * screen reader is already saying on iOS. Never throws.
 */
export function announce(text: string): void {
  if (!text) return;
  try {
    AccessibilityInfo.announceForAccessibilityWithOptions(text, { queue: true });
  } catch {
    // No screen reader service: nothing to say it to.
  }
}

export type StatusLineProps = {
  /** A state tone in semibold, or neutral: quiet secondary words ("Downloads on this device"). */
  tone?: StateTone | "neutral" | undefined;
  icon?: IconName | undefined;
  /** A string, or Text with a nested Mono ID: "OBS-0249 saved on this device". */
  text: ReactNode;
  /** At the right: a mono count ("2 on device", "1 of 2 · 84 MB") or any short node. */
  trailing?: ReactNode;
  /** Announce the words to screen readers when they change (a live region on Android). */
  live?: boolean | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

function statusLineStyles(t: Theme) {
  return StyleSheet.create({
    line: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      columnGap: t.space.s3,
      rowGap: t.space.s1,
      paddingVertical: t.space.s2,
    },
    lead: { flexDirection: "row", alignItems: "center", gap: t.space.s2, flexShrink: 1 },
    words: { flexShrink: 1 },
  });
}

/** The line under the map and at the foot of lists: what just happened, and how many records wait. */
export function StatusLine({
  tone = "neutral",
  icon,
  text,
  trailing,
  live = false,
  style,
  testID,
}: StatusLineProps) {
  const t = useTheme();
  const s = useStyles(statusLineStyles);
  const neutral = tone === "neutral";
  const color = neutral ? t.c.ink2 : toneColor(t.c, tone);
  const spoken = typeof text === "string" ? text : null;

  // iOS has no live regions: speak a changed status once. Android's live region does it there.
  const previous = useRef(spoken);
  useEffect(() => {
    if (!live || Platform.OS !== "ios") return;
    if (spoken && spoken !== previous.current) announce(spoken);
    previous.current = spoken;
  }, [live, spoken]);

  return (
    <View
      testID={testID}
      accessibilityLiveRegion={live ? "polite" : "none"}
      style={[s.line, style]}
    >
      <View style={s.lead}>
        {icon ? <Icon name={icon} size={20} color={color} /> : null}
        {typeof text === "string" ? (
          <Text
            variant={neutral ? "body" : "bodyStrong"}
            tone={neutral ? "ink2" : tone}
            style={s.words}
          >
            {text}
          </Text>
        ) : (
          text
        )}
      </View>
      {typeof trailing === "string" ? (
        <Mono size="body" tone="ink2">
          {trailing}
        </Mono>
      ) : (
        (trailing ?? null)
      )}
    </View>
  );
}
