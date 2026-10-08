import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { TextStyle } from "react-native";
import { fontFamily } from "./fonts";
import { usePreferences } from "./preferences";
import {
  type Colors,
  colorsFor,
  LAYOUT,
  MOTION,
  RADIUS,
  type Scheme,
  SIZE,
  SPACE,
  TYPE,
  type TypeRole,
} from "./tokens";

/** The roles that grow by one step when the observer turns on larger question text. */
const LARGER_TEXT_ROLES: ReadonlySet<TypeRole> = new Set(["question", "answer"]);
const LARGER_TEXT_STEP = 4;

export type Theme = {
  scheme: Scheme;
  c: Colors;
  type: Record<TypeRole, TextStyle>;
  space: typeof SPACE;
  radius: typeof RADIUS;
  size: typeof SIZE;
  layout: typeof LAYOUT;
  motion: typeof MOTION;
  largerText: boolean;
};

function typeStyles(largerText: boolean): Record<TypeRole, TextStyle> {
  const entries = (Object.keys(TYPE) as TypeRole[])
    .filter((role) => !role.startsWith("$"))
    .map((role) => {
      const spec = TYPE[role];
      const grow = largerText && LARGER_TEXT_ROLES.has(role) ? LARGER_TEXT_STEP : 0;
      const size = spec.size + grow;
      const style: TextStyle = {
        fontFamily: fontFamily(spec.weight, spec.mono === true),
        fontSize: size,
        lineHeight: spec.lineHeight + grow,
        letterSpacing: spec.tracking * size,
      };
      if (spec.caps) style.textTransform = "uppercase";
      return [role, style] as const;
    });
  return Object.fromEntries(entries) as Record<TypeRole, TextStyle>;
}

function buildTheme(scheme: Scheme, largerText: boolean): Theme {
  return {
    scheme,
    c: colorsFor(scheme),
    type: typeStyles(largerText),
    space: SPACE,
    radius: RADIUS,
    size: SIZE,
    layout: LAYOUT,
    motion: MOTION,
    largerText,
  };
}

const ThemeContext = createContext<Theme | null>(null);

/** Day by default; Dusk when the observer chooses it in Preferences. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { screen, largerText } = usePreferences();
  const theme = useMemo(() => buildTheme(screen, largerText), [screen, largerText]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme needs a ThemeProvider above it");
  return theme;
}

/** Styles built from the theme, rebuilt only when the theme changes. */
export function useStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  // biome-ignore lint/correctness/useExhaustiveDependencies: the factory is expected to be a stable module-level function.
  return useMemo(() => factory(theme), [theme]);
}
