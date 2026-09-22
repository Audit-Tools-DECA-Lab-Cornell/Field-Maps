/**
 * Nocturne — the design system in `designs/_ds/nocturne-0f5393a7-e60a-4d31-be24-f93ea06f52be/`.
 *
 * Values are copied from that system's `styles.css` token block. Keep them in step with it
 * rather than inventing shades here: a dark ground, one accent used as a line and a glow,
 * and contrast carried by the tonal ramps instead of saturation.
 */

export const colors = {
  bg: "#161826",
  surface: "#232532",
  text: "#e9e9ed",
  accent: "#9184d9",

  accent100: "#f5f4ff",
  accent200: "#e7e5fe",
  accent300: "#d2cefd",
  accent400: "#b5abfc",
  accent500: "#968ae0",
  accent600: "#796cbf",
  accent700: "#5d5294",
  accent800: "#423a6a",
  accent900: "#2b2741",

  neutral100: "#f3f5fe",
  neutral200: "#e4e7f5",
  neutral300: "#cfd3e5",
  neutral400: "#b2b6ca",
  neutral500: "#9397ab",
  neutral600: "#75798c",
  neutral700: "#595d6c",
  neutral800: "#3f424d",
  neutral900: "#292b31",

  /** Hairlines. The system prefers whitespace, and rules fade out at their ends. */
  rule: "#ffffff1f",
  ruleFaint: "#ffffff0d",
  edge: "#ffffff12",

  /** Map chrome sits on translucent dark glass so the map keeps reading through it. */
  glass: "#12131fd9",
  mapGround: "#1b1d2b",

  /**
   * Reserved for validation, needs-attention and unresolved protocol questions.
   * Never decoration.
   */
  attentionLine: "#d9a86c",
  attentionText: "#e8bd85",
  attentionGround: "#3a2f22",
} as const;

/** Inter, loaded from `@expo-google-fonts/inter`. Weight comes from the family, not `fontWeight`. */
export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
} as const;

/** The system's 0.7× density scale, rounded to whole pixels. */
export const space = {
  hair: 3,
  tight: 6,
  snug: 8,
  base: 11,
  loose: 17,
  wide: 22,
} as const;

export const radius = { sm: 4, md: 8, lg: 14, pill: 999 } as const;

/** Nothing tappable goes below this. Sun, gloves, one hand. */
export const touchTarget = 44;

export const textStyles = {
  display: { fontFamily: fonts.medium, fontSize: 28, lineHeight: 32, letterSpacing: -0.4 },
  title: { fontFamily: fonts.medium, fontSize: 25, lineHeight: 29, letterSpacing: -0.25 },
  question: { fontFamily: fonts.medium, fontSize: 22, lineHeight: 27, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 25 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 23 },
  detail: { fontFamily: fonts.regular, fontSize: 13.5, lineHeight: 21 },
  meta: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
  caption: { fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 19 },
  micro: { fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17 },
} as const;
