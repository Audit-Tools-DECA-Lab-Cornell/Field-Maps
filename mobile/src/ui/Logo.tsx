import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, G, Rect } from "react-native-svg";
import { Text } from "./Text";
import { type Theme, useStyles, useTheme } from "./theme";
import { colorsFor } from "./tokens";

export type LogoProps = {
  /** Adds "FieldMaps" beside the mark (the header of a tab root). The mark alone sits opposite a back button. */
  wordmark?: boolean | undefined;
  style?: StyleProp<ViewStyle>;
  testID?: string | undefined;
};

/** The mark's drawn size. The lockup is artwork; the contract has no token for it. */
const MARK = 34;

function logoStyles(t: Theme) {
  return StyleSheet.create({
    lockup: { flexDirection: "row", alignItems: "center", gap: t.space.s3 },
  });
}

/**
 * The FieldMaps mark: an ink rounded square holding two contour rings around the observation point.
 * The point takes the accent as it reads on the ink square, which is the other theme's accent: light
 * magenta on Day's dark square, deep magenta on Dusk's light one.
 */
function Mark({ label }: { label?: string | undefined }) {
  const { c, scheme } = useTheme();
  const point = colorsFor(scheme === "day" ? "dusk" : "day").accent;
  const a11y = label
    ? { accessible: true, accessibilityRole: "image" as const, accessibilityLabel: label }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants" as const,
      };
  return (
    <Svg width={MARK} height={MARK} viewBox="0 0 72 72" {...a11y}>
      <Rect width={72} height={72} rx={17} fill={c.ink} />
      <G rotation={-24} origin="36, 36">
        <Ellipse cx={36} cy={36} rx={23} ry={16.5} fill="none" stroke={c.onInk} strokeWidth={3} />
        <Ellipse cx={36} cy={36} rx={13} ry={9.5} fill="none" stroke={c.onInk} strokeWidth={3} />
      </G>
      <Circle cx={36} cy={36} r={5.5} fill={point} />
    </Svg>
  );
}

export function Logo({ wordmark = false, style, testID }: LogoProps) {
  const s = useStyles(logoStyles);
  if (!wordmark)
    return (
      <View testID={testID} style={style}>
        <Mark label="FieldMaps" />
      </View>
    );
  return (
    <View testID={testID} style={[s.lockup, style]}>
      <Mark />
      <Text variant="island">FieldMaps</Text>
    </View>
  );
}
