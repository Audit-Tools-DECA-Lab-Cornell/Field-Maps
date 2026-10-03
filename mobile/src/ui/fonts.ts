import type { FontSource } from "expo-font";

/**
 * Geologica carries every word; Spline Sans Mono carries what someone might read aloud — IDs, versions,
 * codes, counts. Each face is required by path: the package index would bundle every weight.
 */
export const contourFonts: Record<string, FontSource> = {
  Geologica_400Regular: require("@expo-google-fonts/geologica/400Regular/Geologica_400Regular.ttf"),
  Geologica_500Medium: require("@expo-google-fonts/geologica/500Medium/Geologica_500Medium.ttf"),
  Geologica_600SemiBold: require("@expo-google-fonts/geologica/600SemiBold/Geologica_600SemiBold.ttf"),
  SplineSansMono_400Regular: require("@expo-google-fonts/spline-sans-mono/400Regular/SplineSansMono_400Regular.ttf"),
  SplineSansMono_500Medium: require("@expo-google-fonts/spline-sans-mono/500Medium/SplineSansMono_500Medium.ttf"),
  SplineSansMono_600SemiBold: require("@expo-google-fonts/spline-sans-mono/600SemiBold/SplineSansMono_600SemiBold.ttf"),
};

/** The registered family for a weight. Weight comes from the family on React Native, not `fontWeight`. */
export function fontFamily(weight: number, mono = false): string {
  const family = mono ? "SplineSansMono" : "Geologica";
  if (weight >= 600) return `${family}_600SemiBold`;
  if (weight >= 500) return `${family}_500Medium`;
  return `${family}_400Regular`;
}
