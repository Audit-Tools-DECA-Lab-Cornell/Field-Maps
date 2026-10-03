import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { type Theme, useStyles } from "./theme";

export type InnerPanelProps = {
  children?: ReactNode;
  /**
   * plain (default): the island fill with a 1 px line edge ("Collecting works as usual"). well: a
   * recessed fill with no edge, for a code shown once, read-only values or the "scroll for more" band.
   * Named as on the web.
   */
  tone?: "plain" | "well" | undefined;
  /** A dashed edge: a slot for something that is not here yet ("The map appears here once…"). */
  dashed?: boolean | undefined;
  /** Pads the content by 16 (default). Turn it off for content that runs to the edges. */
  padded?: boolean | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

function innerPanelStyles(t: Theme) {
  return StyleSheet.create({
    panel: {
      borderRadius: t.radius.panel,
      overflow: "hidden",
    },
    plain: {
      backgroundColor: t.c.island,
      borderWidth: t.size.border,
      borderColor: t.c.line,
    },
    well: { backgroundColor: t.c.well },
    dashed: {
      borderWidth: t.size.border,
      borderStyle: "dashed",
      borderColor: t.c.edge,
    },
    padded: { padding: t.space.s4, gap: t.space.s2 },
  });
}

/**
 * A panel set inside an island: no ledge, because only islands stand on the ground (no island inside
 * an island). The island around it carries the depth.
 */
export function InnerPanel({
  children,
  tone = "plain",
  dashed = false,
  padded = true,
  style,
  testID,
}: InnerPanelProps) {
  const s = useStyles(innerPanelStyles);
  return (
    <View
      testID={testID}
      style={[
        s.panel,
        tone === "well" ? s.well : s.plain,
        dashed ? s.dashed : null,
        padded ? s.padded : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}
