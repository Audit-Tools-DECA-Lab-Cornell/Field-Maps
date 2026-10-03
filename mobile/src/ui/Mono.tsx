import type { ReactNode } from "react";
import type { TextStyle } from "react-native";
import { fontFamily } from "./fonts";
import { Text, type TextTone } from "./Text";
import { useTheme } from "./theme";
import type { TypeRole } from "./tokens";

export type MonoVariant = "data" | "label" | "code" | "title";
type SansRole = Exclude<TypeRole, `mono${string}`>;

export type MonoProps = {
  children?: ReactNode;
  /** data 14 (IDs, versions, counts), label 13 caps, code 28 (join codes), title 34 (OBS-0249 on the saved card). */
  variant?: MonoVariant | undefined;
  /**
   * Set the mono face at a sans role's size, for an ID inside a title or row ("OBS-0249" as a row title
   * at `body`), or inline in running text at that text's size.
   */
  size?: SansRole | undefined;
  /** Semibold, for an ID that heads a row or line. Defaults to on for the `…Strong` sizes. */
  strong?: boolean | undefined;
  tone?: TextTone | undefined;
  align?: TextStyle["textAlign"] | undefined;
  /** Long-press to copy, for codes someone might read aloud or paste. */
  selectable?: boolean | undefined;
  header?: boolean | undefined;
  testID?: string | undefined;
};

const ROLE: Record<MonoVariant, TypeRole> = {
  data: "monoData",
  label: "monoLabel",
  code: "monoCode",
  title: "monoTitle",
};

/**
 * Spline Sans Mono for what someone might read aloud or compare character by character: IDs, versions,
 * codes, counts, sizes ("MAP v3", "84 MB", "OBS-0249").
 */
export function Mono({
  children,
  variant = "data",
  size,
  strong,
  tone,
  align,
  selectable,
  header,
  testID,
}: MonoProps) {
  const t = useTheme();
  const role = ROLE[variant];
  const override: TextStyle = {};
  if (size) {
    const sans = t.type[size];
    if (sans.fontSize !== undefined) override.fontSize = sans.fontSize;
    if (sans.lineHeight !== undefined) override.lineHeight = sans.lineHeight;
    override.letterSpacing = 0;
  }
  const semibold = strong ?? (size ? size.endsWith("Strong") : undefined);
  if (semibold !== undefined) override.fontFamily = fontFamily(semibold ? 600 : 400, true);
  return (
    <Text
      variant={role}
      tone={tone}
      align={align}
      selectable={selectable}
      header={header}
      testID={testID}
      style={override}
    >
      {children}
    </Text>
  );
}
