import type { ReactNode } from "react";
import {
  Text as NativeText,
  type TextProps as NativeTextProps,
  type TextStyle,
} from "react-native";
import { useTheme } from "./theme";
import { type StateTone, type TypeRole, toneColor } from "./tokens";

export type TextTone = "ink" | "ink2" | "onAccent" | "onInk" | "onNav" | "onNavCurrent" | StateTone;

/** How far each role may grow with the device text size before layouts stop holding. */
const MAX_SCALE: Partial<Record<TypeRole, number>> = {
  display: 1.6,
  page: 1.6,
  monoTitle: 1.6,
  monoCode: 1.6,
  question: 1.8,
  answer: 1.8,
};

export type TextProps = Omit<NativeTextProps, "style" | "numberOfLines"> & {
  variant?: TypeRole | undefined;
  tone?: TextTone | undefined;
  align?: TextStyle["textAlign"] | undefined;
  /** Marks the text as a heading for screen readers. */
  header?: boolean | undefined;
  style?: TextStyle | TextStyle[] | undefined;
  children?: ReactNode;
};

/**
 * Contour text. Sizes are minimums: text follows the device text size (Rule 05 — labels wrap, nothing
 * truncates), so this never sets numberOfLines.
 */
export function Text({
  variant = "body",
  tone = "ink",
  align,
  header,
  style,
  children,
  ...rest
}: TextProps) {
  const theme = useTheme();
  const c = theme.c;
  const color =
    tone === "ink2"
      ? c.ink2
      : tone === "onAccent"
        ? c.onAccent
        : tone === "onInk"
          ? c.onInk
          : tone === "onNav"
            ? c.onNav
            : tone === "onNavCurrent"
              ? c.onNavCurrent
              : toneColor(c, tone);
  return (
    <NativeText
      {...rest}
      accessibilityRole={header ? "header" : rest.accessibilityRole}
      maxFontSizeMultiplier={MAX_SCALE[variant] ?? 2}
      style={[theme.type[variant], { color }, align ? { textAlign: align } : null, style]}
    >
      {children}
    </NativeText>
  );
}
