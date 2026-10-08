import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Text, type TextTone } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

/**
 * default: the white island on its ledge. saved: the saved card, a 2 px saved edge (mobile-05).
 * danger: an attention-soft island with a 2 px attention edge, for a record that needs a correction.
 * accent: a 2 px accent edge for the one thing to pick up again (the unfinished observation card).
 */
export type IslandTone = "default" | "saved" | "danger" | "accent";

export type IslandProps = {
  children?: ReactNode;
  /** The island's heading, read as a header. */
  title?: string | undefined;
  /** A mono caps line above the title: "THIS DEVICE". */
  eyebrow?: string | undefined;
  /** A line under the title: "84 MB on this device · verified today 11:25". */
  description?: string | undefined;
  /** Beside the title: a count ("3 items") or a state badge ("✓ Ready offline"). */
  meta?: ReactNode;
  /** A footnote under a full-width rule inside the island. */
  footer?: ReactNode;
  tone?: IslandTone | undefined;
  /**
   * Pads the content by the island padding (default). Turn it off for rows that run edge to edge
   * (ListRow), which draw their own rules; the title block keeps its padding.
   */
  padded?: boolean | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

const EYEBROW_TONE: Record<IslandTone, TextTone> = {
  default: "ink2",
  saved: "saved",
  danger: "attention",
  accent: "accent",
};

function islandStyles(t: Theme) {
  const pad = t.layout.islandPadding;
  return StyleSheet.create({
    // The wrapper reserves room for the ledge under the island.
    withLedge: { paddingBottom: t.size.ledge },
    // A solid band offset below the island in the ledge colour: depth without blur.
    ledge: {
      position: "absolute",
      left: 0,
      right: 0,
      top: t.size.ledge,
      bottom: 0,
      borderRadius: t.radius.island,
      backgroundColor: t.c.ledge,
    },
    surface: {
      borderRadius: t.radius.island,
      overflow: "hidden",
    },
    padded: { padding: pad },
    headerAlone: { padding: pad },
    headerInBody: { marginBottom: t.space.s3 },
    header: { gap: t.space.s1 },
    headerLine: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "flex-start",
      justifyContent: "space-between",
      columnGap: t.space.s3,
      rowGap: t.space.s1,
    },
    headerText: { flexShrink: 1, gap: t.space.s1 },
    footer: {
      borderTopWidth: t.size.border,
      borderTopColor: t.c.rule,
      padding: pad,
      gap: t.space.s3,
    },
  });
}

/**
 * The Contour container: rounded 22, a 1 px line edge and a 6 px solid ledge drawn as a band behind it.
 * Rules inside it separate rows; footnotes sit under a rule.
 */
export function Island({
  children,
  title,
  eyebrow,
  description,
  meta,
  footer,
  tone = "default",
  padded = true,
  style,
  testID,
}: IslandProps) {
  const t = useTheme();
  const s = useStyles(islandStyles);
  const c = t.c;
  const hasLedge = tone === "default" || tone === "saved";
  const edgeColor =
    tone === "saved"
      ? c.saved
      : tone === "danger"
        ? c.attention
        : tone === "accent"
          ? c.accent
          : c.line;
  const edgeWidth = tone === "default" ? t.size.border : t.size.tileBorder;
  const fill = tone === "danger" ? c.attentionSoft : c.island;

  const hasHeader = Boolean(title || eyebrow || meta || description);
  const header = hasHeader ? (
    <View style={[s.header, padded ? s.headerInBody : s.headerAlone]}>
      <View style={s.headerLine}>
        <View style={s.headerText}>
          {eyebrow ? (
            <Text variant="monoLabel" tone={EYEBROW_TONE[tone]}>
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text variant="island" header>
              {title}
            </Text>
          ) : null}
        </View>
        {typeof meta === "string" ? (
          <Text variant="small" tone="ink2">
            {meta}
          </Text>
        ) : (
          (meta ?? null)
        )}
      </View>
      {description ? (
        <Text variant="body" tone="ink2">
          {description}
        </Text>
      ) : null}
    </View>
  ) : null;

  const surface = (
    <View
      testID={testID}
      style={[
        s.surface,
        { backgroundColor: fill, borderColor: edgeColor, borderWidth: edgeWidth },
        hasLedge ? null : style,
      ]}
    >
      {padded ? (
        <View style={s.padded}>
          {header}
          {children}
        </View>
      ) : (
        <>
          {header}
          {children}
        </>
      )}
      {footer ? (
        <View style={s.footer}>
          {typeof footer === "string" ? <Text variant="body">{footer}</Text> : footer}
        </View>
      ) : null}
    </View>
  );

  if (!hasLedge) return surface;
  return (
    <View style={[s.withLedge, style]}>
      <View pointerEvents="none" style={s.ledge} />
      {surface}
    </View>
  );
}
