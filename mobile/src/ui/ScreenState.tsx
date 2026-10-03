import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Icon, type IconName } from "./Icon";
import { Note } from "./Note";
import { Skeleton } from "./Skeleton";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

export type ScreenStateKind = "loading" | "empty" | "error" | "offline" | "no-access";

export type ScreenStateProps = {
  kind: ScreenStateKind;
  /** Replaces the collector wording for the kind. */
  title?: string | undefined;
  body?: string | undefined;
  /** One action, usually a Button: "Go to projects", "Try again", "Back to projects". */
  action?: ReactNode | undefined;
  icon?: IconName | undefined;
  style?: StyleProp<ViewStyle> | undefined;
  testID?: string | undefined;
};

type Wording = { title: string; body: string; icon: IconName };

/**
 * The collector's words for each state (Contour, screen states). An error never hides that the work
 * is safe: its first line says where the draft is.
 */
const WORDING: Record<ScreenStateKind, Wording> = {
  loading: { title: "", body: "Reading records from this device…", icon: "clock" },
  empty: {
    title: "No observations yet",
    body: "Records you save appear here, with their upload state.",
    icon: "list",
  },
  error: {
    title: "Your draft is still on this device",
    body: "The screen could not load, but the point and answers you entered are kept.",
    icon: "smartphone",
  },
  offline: {
    title: "Offline.",
    body: "Records remain on this device and upload later.",
    icon: "wifi-off",
  },
  "no-access": {
    title: "This site is not open to you",
    body: "Your role does not include this site. Ask your coordinator to add you.",
    icon: "lock",
  },
};

/**
 * What a list or screen shows when it is not full of data: plain words, one action, no
 * illustration. Loading is still placeholders; offline is a banner above content that stays usable.
 */
export function ScreenState({ kind, title, body, action, icon, style, testID }: ScreenStateProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const words = WORDING[kind];
  const shownTitle = title ?? words.title;
  const shownBody = body ?? words.body;
  const glyph = icon ?? words.icon;

  if (kind === "loading") return <Skeleton caption={shownBody} style={style} testID={testID} />;

  // Offline is not a centred state: a waiting note above content that stays usable.
  if (kind === "offline")
    return (
      <View testID={testID} style={[styles.offlineWrap, style]}>
        <Note tone="waiting" icon={glyph} title={shownTitle} live="polite">
          {shownBody || undefined}
        </Note>
        {action ?? null}
      </View>
    );

  const tone = kind === "error" ? styles.circleSafe : styles.circlePlain;
  const glyphColor = kind === "error" ? theme.c.saved : theme.c.ink;
  return (
    <View
      testID={testID}
      style={[styles.centre, style]}
      accessibilityLiveRegion={kind === "error" ? "polite" : "none"}
    >
      <View style={[styles.circle, tone]}>
        <Icon name={glyph} size={theme.space.s5} color={glyphColor} />
      </View>
      <View style={styles.words}>
        {shownTitle ? (
          <Text variant="island" header>
            {shownTitle}
          </Text>
        ) : null}
        {shownBody ? (
          <Text variant="body" tone="ink2">
            {shownBody}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    centre: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "flex-start",
      gap: t.space.s4,
      paddingVertical: t.space.s7,
    },
    circle: {
      width: t.size.touch,
      height: t.size.touch,
      borderRadius: t.radius.pill,
      alignItems: "center",
      justifyContent: "center",
    },
    circlePlain: {
      backgroundColor: t.c.island,
      borderWidth: t.size.border,
      borderColor: t.c.line,
    },
    circleSafe: { backgroundColor: t.c.savedSoft },
    words: { gap: t.space.s2, alignSelf: "stretch" },
    action: { marginTop: t.space.s1, alignSelf: "stretch" },
    offlineWrap: { gap: t.space.s3 },
  });
}
