import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Mono } from "./Mono";
import { Text } from "./Text";
import { type Theme, useStyles } from "./theme";

export type Fact = {
  /** "Version", "Imported from", "Carried forward". */
  label: string;
  /** Words, a StateBadge, or any short node. */
  value: ReactNode;
  /** Set a string value in mono: versions, sizes, form IDs ("v3", "84 MB", "demo-v1"). */
  mono?: boolean | undefined;
  /** Stable key when labels repeat. */
  key?: string | undefined;
};

export type FactsListProps = {
  items: readonly Fact[];
  /**
   * island (default): rules between rows, inside a padded Island. ground: on the screen ground, with
   * rules above, between and below the rows (the saved card's "Carried forward / Cleared / Upload").
   */
  surface?: "island" | "ground" | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

function factsStyles(t: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: t.space.s4,
      paddingVertical: t.space.s3,
    },
    label: { flex: 2 },
    value: { flex: 3 },
    ruleIsland: { borderTopWidth: t.size.border, borderTopColor: t.c.rule },
    ruleGround: { borderTopWidth: t.size.border, borderTopColor: t.c.line },
    lastGround: { borderBottomWidth: t.size.border, borderBottomColor: t.c.line },
  });
}

/** Label and value pairs under rules: what a record, package or version is, at a glance. */
export function FactsList({ items, surface = "island", style, testID }: FactsListProps) {
  const s = useStyles(factsStyles);
  const ground = surface === "ground";
  return (
    <View testID={testID} style={style}>
      {items.map((fact, index) => {
        const first = index === 0;
        const last = index === items.length - 1;
        const valueText =
          typeof fact.value === "string" || typeof fact.value === "number"
            ? String(fact.value)
            : undefined;
        return (
          <View
            key={fact.key ?? fact.label}
            accessible
            accessibilityLabel={valueText === undefined ? undefined : `${fact.label}: ${valueText}`}
            style={[
              s.row,
              ground ? s.ruleGround : first ? null : s.ruleIsland,
              ground && last ? s.lastGround : null,
            ]}
          >
            <View style={s.label}>
              <Text variant="body" tone="ink2">
                {fact.label}
              </Text>
            </View>
            <View style={s.value}>
              {valueText === undefined ? (
                fact.value
              ) : fact.mono ? (
                <Mono size="body">{valueText}</Mono>
              ) : (
                <Text variant="body">{valueText}</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
