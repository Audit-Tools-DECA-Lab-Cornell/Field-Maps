import { isValidElement, type ReactNode } from "react";
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { PRESSED_OPACITY } from "./Button";
import { Icon, type IconName } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

/** A thumbnail that is not on this device yet: a dashed well with a glyph (Fall Creek, not downloaded). */
export type ThumbnailPlaceholder = { icon: IconName };

export type ListRowProps = {
  /** A string, or a node such as `<Mono size="bodyStrong" strong>OBS-0249</Mono>`. */
  title: ReactNode;
  /** The line under the title: "North meadow · Round 1 · 11:34". */
  subtitle?: ReactNode;
  /** A state line under the subtitle: `<StateBadge kind="readiness" state="readyOffline" />`. */
  status?: ReactNode;
  /** Beside the title, before the chevron: a state badge or a count. */
  trailing?: ReactNode;
  onPress?: (() => void) | undefined;
  /** attention: the soft attention fill for the row that needs a correction. */
  tone?: "default" | "attention" | undefined;
  /** A square preview on the left (site map), or a placeholder while it is not downloaded. */
  thumbnail?: ReactNode | ThumbnailPlaceholder;
  /** A glyph in a well circle on the left (Preferences, Offline field guide). */
  icon?: IconName | undefined;
  /**
   * The rule above the row (default on). Turn it off for the first row of an island that has no title,
   * so no rule sits against the island's edge.
   */
  divider?: boolean | undefined;
  /** Shows the chevron of a row that opens something. On by default when the row is pressable. */
  chevron?: boolean | undefined;
  disabled?: boolean | undefined;
  /** Overrides the words read for the row. By default the row reads its visible words in order. */
  accessibilityLabel?: string | undefined;
  accessibilityHint?: string | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

/** The thumbnail square. The contract carries only its radius (`radius.thumb`). */
const THUMBNAIL = 76;

function isPlaceholder(value: unknown): value is ThumbnailPlaceholder {
  return (
    typeof value === "object" &&
    value !== null &&
    !isValidElement(value) &&
    "icon" in value &&
    typeof value.icon === "string"
  );
}

function textOf(node: ReactNode): string | null {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return null;
}

function listRowStyles(t: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space.s3,
      minHeight: t.size.control,
      paddingHorizontal: t.layout.islandPadding,
      paddingVertical: t.space.s3,
    },
    divider: { borderTopWidth: t.size.border, borderTopColor: t.c.rule },
    attention: { backgroundColor: t.c.attentionSoft },
    pressed: { backgroundColor: t.c.well },
    pressedAttention: { opacity: PRESSED_OPACITY },
    thumbnail: {
      width: THUMBNAIL,
      height: THUMBNAIL,
      marginRight: t.space.s1,
      borderRadius: t.radius.thumb,
      borderWidth: t.size.border,
      borderColor: t.c.line,
      backgroundColor: t.c.well,
      overflow: "hidden",
      alignItems: "center",
      justifyContent: "center",
    },
    placeholder: { borderStyle: "dashed", borderColor: t.c.edge },
    well: {
      width: t.space.s8,
      height: t.space.s8,
      borderRadius: t.radius.pill,
      backgroundColor: t.c.well,
      alignItems: "center",
      justifyContent: "center",
    },
    body: { flex: 1 },
    titleLine: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      columnGap: t.space.s3,
    },
    title: { flexShrink: 1 },
    status: { marginTop: t.space.s2 },
  });
}

/**
 * A row inside an Island: 56 px or taller, under a rule, with a chevron when it opens something. Rows
 * run edge to edge, so put them in an Island with `padded={false}`.
 */
export function ListRow({
  title,
  subtitle,
  status,
  trailing,
  onPress,
  tone = "default",
  thumbnail,
  icon,
  divider = true,
  chevron,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}: ListRowProps) {
  const t = useTheme();
  const s = useStyles(listRowStyles);
  const attention = tone === "attention";
  const showChevron = chevron ?? Boolean(onPress);

  const leading = isPlaceholder(thumbnail) ? (
    <View style={[s.thumbnail, s.placeholder]}>
      <Icon name={thumbnail.icon} size={24} color={t.c.ink2} />
    </View>
  ) : thumbnail ? (
    <View style={s.thumbnail}>{thumbnail}</View>
  ) : icon ? (
    <View style={s.well}>
      <Icon name={icon} size={20} color={t.c.ink} />
    </View>
  ) : null;

  const body = (
    <>
      {leading}
      <View style={s.body}>
        <View style={s.titleLine}>
          {typeof title === "string" ? (
            <Text variant="island" style={s.title}>
              {title}
            </Text>
          ) : (
            title
          )}
          {typeof trailing === "string" ? (
            <Text variant="small" tone="ink2">
              {trailing}
            </Text>
          ) : (
            (trailing ?? null)
          )}
        </View>
        {typeof subtitle === "string" ? (
          <Text variant="body" tone="ink2">
            {subtitle}
          </Text>
        ) : (
          (subtitle ?? null)
        )}
        {status ? <View style={s.status}>{status}</View> : null}
      </View>
      {showChevron ? <Icon name="chevron-right" size={20} color={t.c.ink2} /> : null}
    </>
  );

  const frame = [s.row, divider ? s.divider : null, attention ? s.attention : null];

  if (!onPress)
    return (
      <View
        testID={testID}
        // A still row is not grouped, so a link in `trailing` ("Edit") stays reachable on its own.
        accessible={accessibilityLabel !== undefined}
        accessibilityLabel={accessibilityLabel}
        style={[...frame, style]}
      >
        {body}
      </View>
    );

  // When every visible part is words, read them as one label; otherwise the row reads its children.
  const parts = [title, trailing, subtitle, status].filter(
    (part) => part != null && part !== false,
  );
  const words = parts.map(textOf);
  const label =
    accessibilityLabel ??
    (words.every((word) => word !== null) ? (words as string[]).join(", ") : undefined);

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        ...frame,
        pressed && !disabled ? (attention ? s.pressedAttention : s.pressed) : null,
        style,
      ]}
    >
      {body}
    </Pressable>
  );
}
