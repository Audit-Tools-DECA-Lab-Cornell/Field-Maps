import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";
import { type StateTone, toneColor, toneSoft } from "./tokens";

/** A state tone, or neutral: the well-filled note with an info glyph for guidance that is not a state. */
export type NoteTone = StateTone | "neutral";

export type NoteProps = {
  tone?: NoteTone | undefined;
  /** Overrides the tone's glyph, such as `smartphone` for records waiting on this device. */
  icon?: IconName | undefined;
  /** A bold lead-in sentence: "5 records are waiting on this device." */
  lead?: string | undefined;
  /** The rest of the message. Words only (strings or Text). */
  children?: ReactNode;
  /** A follow-up under the words, such as a TextLink to "Review observations". */
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

const TONE_ICON: Record<NoteTone, IconName> = {
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

/**
 * A message in a tone's soft fill: a glyph, an optional bold lead-in and the words. Every tone pairs its
 * colour with a glyph and a word (Rule 02); the colour is never the only signal.
 */
export function Note({ tone = "neutral", icon, lead, children, action, style, testID }: NoteProps) {
  const t = useTheme();
  const s = useStyles(noteStyles);
  const fill = tone === "neutral" ? t.c.well : toneSoft(t.c, tone);
  const glyph = tone === "neutral" ? t.c.ink2 : toneColor(t.c, tone);
  return (
    <View testID={testID} style={[s.note, { backgroundColor: fill }, style]}>
      <View style={s.glyph}>
        <Icon name={icon ?? TONE_ICON[tone]} size={20} color={glyph} />
      </View>
      <View style={s.body}>
        <Text variant="body">
          {lead ? <Text variant="bodyStrong">{children ? `${lead} ` : lead}</Text> : null}
          {children}
        </Text>
        {action ?? null}
      </View>
    </View>
  );
}
