import type { ReactNode } from "react";
import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { type Theme, useStyles } from "./theme";

export type InnerPanelProps = {
  children?: ReactNode;
  /** Pads the content by 16 (default). */
  padded?: boolean | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

function innerPanelStyles(t: Theme) {
  return StyleSheet.create({
    panel: {
      backgroundColor: t.c.well,
      borderRadius: t.radius.panel,
      overflow: "hidden",
    },
    padded: { padding: t.space.s4, gap: t.space.s2 },
  });
}

/**
 * A well-filled panel set inside an island: a preview, a group of read-only values, the "scroll for
 * more" band. No edge and no ledge; the island around it carries the depth.
 */
export function InnerPanel({ children, padded = true, style, testID }: InnerPanelProps) {
  const s = useStyles(innerPanelStyles);
  return (
    <View testID={testID} style={[s.panel, padded ? s.padded : null, style]}>
      {children}
    </View>
  );
}
