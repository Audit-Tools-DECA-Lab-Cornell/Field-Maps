import { type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import Svg, { Circle, ClipPath, Defs, G, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { BRAND_ARTWORK as ART } from "./brand-artwork";
import { Text } from "./Text";
import { type Theme, useStyles } from "./theme";

export type LogoProps = {
  /** Adds "DECA Mark" beside the mark (the header of a tab root). The mark alone sits opposite a back button. */
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

const CENTRE = ART.size / 2;
/** Gradient and clip ids. Every mark draws the same artwork, so two marks sharing an id still match. */
const GROUND = "decamark-mark-ground";
const ZONES = "decamark-mark-zones";

/**
 * The DECA Mark brand mark: the purple app icon, drawn from `brand-artwork.ts` as a rounded square, the shape
 * a launcher gives it. It is artwork, so it looks the same in Day and Dusk (D29).
 */
function Mark({ label }: { label?: string | undefined }) {
  const a11y = label
    ? { accessible: true, accessibilityRole: "image" as const, accessibilityLabel: label }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants" as const,
      };
  const { background, marker, path } = ART;
  return (
    <Svg width={MARK} height={MARK} viewBox={`0 0 ${ART.size} ${ART.size}`} {...a11y}>
      <Defs>
        <RadialGradient
          id={GROUND}
          cx={background.cx}
          cy={background.cy}
          r={background.r}
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset={0} stopColor={background.inner} />
          <Stop offset={1} stopColor={background.outer} />
        </RadialGradient>
        <ClipPath id={ZONES}>
          {ART.zones.map((zone) => (
            <Rect
              key={zone.fill}
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              rx={ART.zoneCorner}
            />
          ))}
        </ClipPath>
      </Defs>
      <Rect width={ART.size} height={ART.size} rx={ART.corner} fill={`url(#${GROUND})`} />
      <G scale={ART.scale} origin={`${CENTRE}, ${CENTRE}`}>
        {ART.zones.map((zone) => (
          <Rect
            key={zone.fill}
            x={zone.x}
            y={zone.y}
            width={zone.width}
            height={zone.height}
            rx={ART.zoneCorner}
            fill={zone.fill}
          />
        ))}
        <Path
          d={path.d}
          fill="none"
          stroke={path.stroke}
          strokeWidth={path.width}
          strokeLinecap="round"
          clipPath={`url(#${ZONES})`}
        />
        {marker.rings.map((ring) => (
          <Circle key={ring.r} cx={marker.cx} cy={marker.cy} r={ring.r} fill={ring.fill} />
        ))}
      </G>
    </Svg>
  );
}

export function Logo({ wordmark = false, style, testID }: LogoProps) {
  const s = useStyles(logoStyles);
  if (!wordmark)
    return (
      <View testID={testID} style={style}>
        <Mark label="DECA Mark" />
      </View>
    );
  return (
    <View testID={testID} style={[s.lockup, style]}>
      <Mark />
      <Text variant="island">DECA Mark</Text>
    </View>
  );
}
