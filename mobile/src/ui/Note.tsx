import { type ReactNode, useEffect, useRef } from "react";
import { Platform, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./Icon";
import { announce } from "./StatusLine";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";
import { type StateTone, toneColor, toneSoft } from "./tokens";

/** A state tone, or neutral: the well-filled note with an info glyph for guidance that is not a state. */
export type NoteTone = StateTone | "neutral";

export type NoteProps = {
  tone?: NoteTone | undefined;
  /** Overrides the tone's glyph, such as `smartphone` for records waiting on this device. */
  icon?: IconName | undefined;
  /** A bold lead-in, run into the text (named as on the web): "5 records are waiting on this device." */
  title?: string | undefined;
  /** The rest of the message. Words only (strings or Text). */
  children?: ReactNode;
  /** A follow-up under the words, such as a TextLink to "Review observations". */
  action?: ReactNode;
  /**
   * Announce the words when they change, for a note that answers an action (the offline banner, an
   * upload that was turned away). The note must already be on screen when its words change.
   */
  live?: "polite" | "assertive" | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

/** The glyph a note carries when the caller names none (the same table as the web). */
export const NOTE_ICON: Record<NoteTone, IconName> = {
  saved: "check",
  waiting: "clock",
  uploaded: "upload",
  attention: "triangle-alert",
  held: "held",
  ink: "info",
  accent: "info",
  neutral: "info",
};

function noteStyles(t: Theme) {
  return StyleSheet.create({
    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.space.s2,
      padding: t.space.s4,
      borderRadius: t.radius.note,
    },
    // The glyph centres on the first line of text.
    glyph: { height: t.type.body.lineHeight, justifyContent: "center" },
    body: { flex: 1, gap: t.space.s1 },
  });
}

/** The words a live note speaks, when they are plain text. */
function spokenOf(title: string | undefined, children: ReactNode): string | null {
  const rest =
    children == null || children === false
      ? ""
      : typeof children === "string" || typeof children === "number"
        ? String(children)
        : null;
  if (rest === null) return null;
  return [title, rest].filter(Boolean).join(" ") || null;
}

/**
 * A message in a tone's soft fill: a glyph, an optional bold lead-in and the words. Every tone pairs its
 * colour with a glyph and a word (Rule 02); the colour is never the only signal.
 */
export function Note({
  tone = "neutral",
  icon,
  title,
  children,
  action,
  live,
  style,
  testID,
}: NoteProps) {
  const t = useTheme();
  const s = useStyles(noteStyles);
  const fill = tone === "neutral" ? t.c.well : toneSoft(t.c, tone);
  const glyph = tone === "neutral" ? t.c.ink2 : toneColor(t.c, tone);

  // iOS has no live regions: speak changed words once. Android's live region does it there.
  const spoken = live ? spokenOf(title, children) : null;
  const previous = useRef(spoken);
  useEffect(() => {
    if (!live || Platform.OS !== "ios") return;
    if (spoken && spoken !== previous.current) announce(spoken);
    previous.current = spoken;
  }, [live, spoken]);

  return (
    <View
      testID={testID}
      accessibilityLiveRegion={live ?? "none"}
      style={[s.note, { backgroundColor: fill }, style]}
    >
      <View style={s.glyph}>
        <Icon name={icon ?? NOTE_ICON[tone]} size={20} color={glyph} />
      </View>
      <View style={s.body}>
        <Text variant="body">
          {title ? <Text variant="bodyStrong">{children ? `${title} ` : title}</Text> : null}
          {children}
        </Text>
        {action ?? null}
      </View>
    </View>
  );
}
