import type { FontSource } from "expo-font";

/**
 * Inter, the Nocturne type face. Each weight is required by path: importing the font package's
 * index would bundle all eighteen faces into a field app that only draws three.
 */
export const interFonts: Record<string, FontSource> = {
  Inter_400Regular: require("@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf"),
  Inter_500Medium: require("@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf"),
  Inter_600SemiBold: require("@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf"),
};
