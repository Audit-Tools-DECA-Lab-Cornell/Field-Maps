import { Children, type ReactNode } from "react";
import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";

type AnswerTileProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Multi-select questions announce a checkbox; single choice announces a radio button. */
  multiple?: boolean | undefined;
  disabled?: boolean | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

/**
 * One answer to a choice question: at least 60 tall, a 2 px ink border, and a label that wraps
 * onto as many lines as it needs. Chosen is the accent fill with a check. The press haptic is the
 * caller's, which knows whether the answer moved the question on.
 */
export function AnswerTile({
  label,
  selected,
  onPress,
  multiple,
  disabled,
  style,
}: AnswerTileProps) {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled: disabled === true }}
      style={({ pressed }) => [
        styles.tile,
        selected ? styles.tileChosen : null,
        disabled ? styles.tileDisabled : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      {selected ? <Icon name="check" color={theme.c.onAccent} strokeWidth={2.5} /> : null}
      <Text
        variant="answer"
        tone={selected ? "onAccent" : disabled ? "ink2" : "ink"}
        align="center"
        style={styles.label}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type AnswerGridProps = {
  children: ReactNode;
  /** Two on a phone in portrait; three in landscape and on a tablet. */
  columns?: number | undefined;
  style?: StyleProp<ViewStyle> | undefined;
};

/**
 * Lays answer tiles in equal columns. Tiles in a row share the height of the tallest, so a label
 * that wraps never leaves its neighbours short.
 */
export function AnswerGrid({ children, columns = 2, style }: AnswerGridProps) {
  const styles = useStyles(makeStyles);
  const tiles = Children.toArray(children);
  const perRow = Math.max(1, Math.floor(columns));
  const rows: ReactNode[][] = [];
  for (let start = 0; start < tiles.length; start += perRow) {
    rows.push(tiles.slice(start, start + perRow));
  }
  return (
    <View style={[styles.grid, style]}>
      {rows.map((row, rowIndex) => {
        const rowKey = `row-${rowIndex * perRow}`;
        const gaps = Array.from(
          { length: perRow - row.length },
          (_, gap) => `${rowKey}-gap-${gap}`,
        );
        return (
          <View key={rowKey} style={styles.row}>
            {row.map((tile) => (
              <View key={keyOf(tile)} style={styles.cell}>
                {tile}
              </View>
            ))}
            {gaps.map((gapKey) => (
              <View key={gapKey} style={styles.cell} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function keyOf(node: ReactNode): string {
  if (node && typeof node === "object" && "key" in node && node.key !== null)
    return String(node.key);
  return String(node);
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    tile: {
      // Grow (not flex: 1): a zero basis would let a wrapped label overflow its tile.
      flexGrow: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.space.s2,
      minHeight: t.size.answerTile,
      paddingHorizontal: t.space.s4,
      paddingVertical: t.space.s3,
      borderRadius: t.radius.tile,
      borderWidth: t.size.tileBorder,
      borderColor: t.c.ink,
      backgroundColor: t.c.island,
    },
    tileChosen: { borderColor: t.c.accent, backgroundColor: t.c.accent },
    tileDisabled: { borderColor: t.c.edge },
    pressed: { opacity: 0.88 },
    label: { flexShrink: 1 },
    grid: { gap: t.space.s2 },
    row: { flexDirection: "row", gap: t.space.s2 },
    cell: { flex: 1 },
  });
}
