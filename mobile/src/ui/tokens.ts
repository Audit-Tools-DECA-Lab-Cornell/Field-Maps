import { Easing } from "react-native-reanimated";
import contour from "../../../contracts/contour.json";

/**
 * Contour, the DECA Mark design system, read from `contracts/contour.json` — the same contract the web
 * workspace reads, so a colour, a state word or a duration changes in one place. This is the only
 * module in the collector that may hold a colour value; everything else asks `useTheme()`.
 */

export type Scheme = "day" | "dusk";
export type Colors = typeof contour.themes.day;
export type ColorName = keyof Colors;

export const SCHEMES: readonly Scheme[] = ["day", "dusk"];
export const DEFAULT_SCHEME: Scheme = contour.default === "dusk" ? "dusk" : "day";

export function colorsFor(scheme: Scheme): Colors {
  return contour.themes[scheme];
}

export type TypeRole = Exclude<keyof typeof contour.type.mobile, "$comment">;

export type TypeSpec = {
  size: number;
  lineHeight: number;
  weight: number;
  tracking: number;
  mono?: boolean;
  caps?: boolean;
};

export const TYPE = contour.type.mobile as Record<TypeRole, TypeSpec>;

/** The nine spacing steps: 4 8 12 16 20 24 32 40 56. */
export const SPACE = {
  s1: contour.space[0] ?? 4,
  s2: contour.space[1] ?? 8,
  s3: contour.space[2] ?? 12,
  s4: contour.space[3] ?? 16,
  s5: contour.space[4] ?? 20,
  s6: contour.space[5] ?? 24,
  s7: contour.space[6] ?? 32,
  s8: contour.space[7] ?? 40,
  s9: contour.space[8] ?? 56,
} as const;

export const RADIUS = contour.radius.mobile;
export const SIZE = contour.size.mobile;
export const LAYOUT = contour.layout.mobile;

type Curve = [number, number, number, number];

function bezier(curve: number[]) {
  const [a = 0, b = 0, c = 1, d = 1] = curve as Curve;
  return Easing.bezier(a, b, c, d);
}

export const MOTION = {
  duration: contour.motion.duration,
  easing: {
    standard: bezier(contour.motion.easing.standard),
    exit: bezier(contour.motion.easing.exit),
    reveal: bezier(contour.motion.easing.reveal),
    linear: Easing.linear,
  },
  reducedFade: contour.motion.reducedFade,
} as const;

export type StateTone = "saved" | "waiting" | "uploaded" | "attention" | "held" | "ink" | "accent";

export type StateDefinition = {
  label: string;
  icon: string;
  tone: StateTone;
  meaning?: string;
  allows?: string;
};

type StateGroups = typeof contour.states;
export type StateKind = Exclude<keyof StateGroups, "$comment">;
export type StateKey<K extends StateKind> = keyof StateGroups[K] & string;

/** The whole state vocabulary by kind (without the contract's comment), for galleries and pickers. */
export const STATES = Object.fromEntries(
  Object.entries(contour.states).filter(([kind]) => !kind.startsWith("$")),
) as { [K in StateKind]: Record<StateKey<K>, StateDefinition> };

/** The state kinds in contract order: queue, review, form, package, check, coverage, … */
export const STATE_KINDS = Object.keys(STATES) as StateKind[];

/** Every state is a glyph, a word and a colour (Rule 02). The same lookup the web uses. */
export function stateOf<K extends StateKind>(kind: K, key: StateKey<K>): StateDefinition {
  const group = contour.states[kind] as Record<string, StateDefinition>;
  const state = group[key];
  if (!state) throw new Error(`Unknown ${kind} state "${key}"`);
  return state;
}

/** The strong colour of a tone in a scheme: glyphs and state words. */
export function toneColor(colors: Colors, tone: StateTone): string {
  switch (tone) {
    case "ink":
      return colors.ink;
    case "accent":
      return colors.accent;
    default:
      return colors[tone];
  }
}

/** The soft fill of a tone: notes, the needs-attention row. */
export function toneSoft(colors: Colors, tone: StateTone): string {
  switch (tone) {
    case "ink":
      return colors.well;
    case "accent":
      return colors.accentSoft;
    default:
      return colors[`${tone}Soft`];
  }
}
